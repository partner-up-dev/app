import type {
  TelemetryContextEventName,
  TelemetryContextPayload,
  TelemetryEventName,
  TelemetryPayload,
} from "@/shared/telemetry/events";
import { ensureAppJourneyWithState, type UserTelemetryJourney } from "@/shared/telemetry/journey";
import { resolveCurrentSpmAttribution } from "@/shared/telemetry/spm-attribution";
import { createUuid } from "@/shared/telemetry/uuid";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import { sanitizeSpmValue } from "@/shared/url/spm";
import type { PendingUserTelemetryEvent, TelemetryAttributeValue } from "./queue";

export type TelemetryEventRecord = {
  event: TelemetryEventName;
  eventName: TelemetryEventName;
  payload: Record<string, unknown>;
  at: string;
  path: string;
};

export type CollectedTelemetry = {
  envelopes: PendingUserTelemetryEvent[];
  debugRecord?: TelemetryEventRecord;
};

const FORBIDDEN_PAYLOAD_KEYS = new Set([
  "anonymousId",
  "anonymous_id",
  "userIdHash",
  "user_id_hash",
  "authenticatedUserHash",
  "authenticated_user_hash",
  "correlationId",
  "correlation_id",
  "requestId",
  "request_id",
  "traceId",
  "trace_id",
  "causeEventId",
  "cause_event_id",
]);

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const readString = (payload: Record<string, unknown>, key: string): string | undefined => {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const readPositiveNumber = (payload: Record<string, unknown>, key: string): number | undefined => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};

const stripForbiddenPayloadFields = (payload: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || FORBIDDEN_PAYLOAD_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
};

const preserveContextPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) sanitized[key] = value;
  }
  return sanitized;
};

const shouldAttachCurrentSpm = (path: string): boolean => !path.startsWith("/admin");

const withCurrentAttribution = (
  payload: Record<string, unknown>,
  path: string,
): Record<string, unknown> => {
  const explicitSpm = typeof payload.spm === "string" ? sanitizeSpmValue(payload.spm) : null;
  const attribution = explicitSpm ?? resolveCurrentSpmAttribution();
  if (!attribution || !shouldAttachCurrentSpm(path)) return payload;

  return {
    ...payload,
    spm: attribution,
    sourceQr:
      typeof payload.sourceQr === "string" && payload.sourceQr.trim().length > 0
        ? payload.sourceQr
        : attribution,
  };
};

export const getCurrentTelemetryPath = (): string => {
  if (typeof window === "undefined") return "/";
  return sanitizeSensitiveRoutePath(`${window.location.pathname}${window.location.search}`);
};

export const getCurrentTelemetryReferrer = (): string | undefined => {
  if (typeof document === "undefined" || typeof window === "undefined" || !document.referrer) {
    return undefined;
  }

  try {
    const parsed = new URL(document.referrer, window.location.origin);
    return parsed.origin === window.location.origin
      ? sanitizeSensitiveRoutePath(`${parsed.pathname}${parsed.search}${parsed.hash}`)
      : parsed.origin;
  } catch {
    return undefined;
  }
};

const buildAttributes = (input: {
  routeName?: string;
  currentSpm?: string;
  sourceQr?: string;
  cardKey?: string;
}): Record<string, TelemetryAttributeValue> => {
  const attributes: Record<string, TelemetryAttributeValue> = {};
  if (input.routeName) attributes.route_name = input.routeName;
  if (input.currentSpm) attributes.spm = input.currentSpm;
  if (input.sourceQr) attributes.source_qr = input.sourceQr;
  if (input.cardKey) attributes.card_key = input.cardKey;
  return attributes;
};

const resolvePrIdRef = (payload: Record<string, unknown>): number | undefined =>
  readPositiveNumber(payload, "prId") ??
  readPositiveNumber(payload, "prIdRef") ??
  readPositiveNumber(payload, "matchedPrId") ??
  readPositiveNumber(payload, "targetPrId");

const buildCanonicalEventPayload = (input: {
  eventName: TelemetryEventName;
  payload: Record<string, unknown>;
  prIdRef?: number;
  cardKey?: string;
}): Record<string, unknown> => {
  if (input.eventName.startsWith("pr.discovery."))
    return stripForbiddenPayloadFields(input.payload);
  return stripForbiddenPayloadFields({
    ...input.payload,
    prIdRef: input.prIdRef,
    cardKey: input.cardKey,
  });
};

const createEnvelope = (input: {
  eventName: string;
  journeyId: string;
  occurredAt: string;
  traceId?: string;
  attributes?: Record<string, TelemetryAttributeValue>;
  payload?: Record<string, unknown>;
}): PendingUserTelemetryEvent => ({
  event_id: createUuid(),
  event_name: input.eventName,
  event_version: 1,
  journey_id: input.journeyId,
  occurred_at: input.occurredAt,
  trace_id: input.traceId,
  attributes: input.attributes ?? {},
  payload: input.payload ?? {},
});

const journeyEnvelope = (journey: UserTelemetryJourney): PendingUserTelemetryEvent =>
  createEnvelope({
    eventName: "journey.started",
    journeyId: journey.id,
    occurredAt: journey.startedAt,
    attributes: buildAttributes({
      routeName: journey.startRouteName,
      currentSpm: journey.startSpm,
      sourceQr: journey.startSourceQr,
    }),
    payload: stripForbiddenPayloadFields({
      routePath: journey.startRoute,
      routeName: journey.startRouteName,
      referrer: journey.startReferrer,
      spm: journey.startSpm,
      sourceQr: journey.startSourceQr,
      prId: journey.startPrId,
      entryKind: journey.entryKind,
    }),
  });

const collect = (input: {
  eventName: TelemetryEventName | TelemetryContextEventName;
  payload: Record<string, unknown>;
  debug: boolean;
}): CollectedTelemetry => {
  const occurredAt = new Date().toISOString();
  const currentPath = getCurrentTelemetryPath();
  const referrer = getCurrentTelemetryReferrer();
  const rawPayloadRecord = asRecord(input.payload);
  const payloadRecord = withCurrentAttribution(rawPayloadRecord, currentPath);
  const routeName = readString(payloadRecord, "routeName");
  const currentSpm = readString(payloadRecord, "spm");
  const sourceQr = readString(payloadRecord, "sourceQr");
  const traceId = readString(payloadRecord, "traceId");
  const cardKey = readString(payloadRecord, "cardKey") ?? readString(payloadRecord, "unitKey");
  const prIdRef = resolvePrIdRef(payloadRecord);
  const { journey, started } = ensureAppJourneyWithState({
    routePath: currentPath,
    routeName,
    referrer,
    currentSpm,
    sourceQr,
    prIdRef,
    nowIso: occurredAt,
  });

  const envelopes: PendingUserTelemetryEvent[] = [];
  if (started) envelopes.push(journeyEnvelope(journey));

  if (input.eventName === "page.viewed") {
    envelopes.push(
      createEnvelope({
        eventName: "route.entered",
        journeyId: journey.id,
        occurredAt,
        attributes: buildAttributes({ routeName, currentSpm, sourceQr }),
        payload: stripForbiddenPayloadFields({
          routePath: currentPath,
          routeName,
          referrer,
          spm: currentSpm,
          sourceQr,
          prId: prIdRef,
        }),
      }),
    );
  }

  const canonicalPayload =
    input.eventName === "auth.session.created" || input.eventName.startsWith("pr.discovery.")
      ? rawPayloadRecord
      : payloadRecord;
  envelopes.push(
    createEnvelope({
      eventName: input.eventName,
      journeyId: journey.id,
      occurredAt,
      traceId,
      attributes: buildAttributes({ routeName, currentSpm, sourceQr, cardKey }),
      payload:
        input.eventName === "auth.session.created"
          ? preserveContextPayload(canonicalPayload)
          : buildCanonicalEventPayload({
              eventName: input.eventName as TelemetryEventName,
              payload: canonicalPayload,
              prIdRef,
              cardKey,
            }),
    }),
  );

  return {
    envelopes,
    ...(input.debug
      ? {
          debugRecord: {
            event: input.eventName as TelemetryEventName,
            eventName: input.eventName as TelemetryEventName,
            payload: payloadRecord,
            at: occurredAt,
            path: currentPath,
          },
        }
      : {}),
  };
};

export const collectTelemetryEvent = <TEvent extends TelemetryEventName>(
  event: TEvent,
  payload: TelemetryPayload<TEvent>,
): CollectedTelemetry => collect({ eventName: event, payload: asRecord(payload), debug: true });

export const collectTelemetryContextEvent = <TEvent extends TelemetryContextEventName>(
  event: TEvent,
  payload: TelemetryContextPayload<TEvent>,
): CollectedTelemetry => collect({ eventName: event, payload: asRecord(payload), debug: false });
