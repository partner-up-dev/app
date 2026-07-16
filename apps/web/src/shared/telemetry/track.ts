import { client } from "@/lib/rpc";
import type { TelemetryEventName, TelemetryPayload } from "@/shared/telemetry/events";
import { ensureAppJourneyWithState } from "@/shared/telemetry/journey";
import { resolveCurrentSpmAttribution } from "@/shared/telemetry/spm-attribution";
import { createUuid } from "@/shared/telemetry/uuid";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import { sanitizeSpmValue } from "@/shared/url/spm";

type TelemetryEventRecord<TEvent extends TelemetryEventName = TelemetryEventName> = {
  event: TEvent;
  eventName: string;
  payload: Record<string, unknown>;
  at: string;
  path: string;
};

type PendingUserTelemetryEvent = {
  event_id: string;
  event_name: string;
  event_version: number;
  journey_id: string;
  occurred_at: string;
  trace_id?: string;
  attributes: Record<string, string | number | boolean | null>;
  payload: Record<string, unknown>;
};

declare global {
  interface Window {
    __PARTNER_UP_TELEMETRY_EVENTS__?: TelemetryEventRecord[];
  }
}

const FLUSH_BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 2_000;
const FLUSH_RETRY_MS = 5_000;
const MAX_QUEUE_SIZE = 1_000;

const CANONICAL_EVENT_NAMES: Partial<Record<TelemetryEventName, string>> = {
  page_view: "page.viewed",
  pr_create_result: "pr.create.result",
  pr_join_result: "pr.join.result",
  pr_waitlist_result: "pr.waitlist.result",
  pr_discovery_candidate_action: "pr.discovery.candidate.action",
  pr_discovery_recommendation_returned: "pr.discovery.recommendation.returned",
  pr_discovery_surface_viewed: "pr.discovery.surface.viewed",
  pr_discovery_criteria_submitted: "pr.discovery.criteria.submitted",
  pr_discovery_candidate_impression: "pr.discovery.candidate.impression",
  pr_discovery_authoring_handoff: "pr.discovery.authoring.handoff",
  pr_exit_success: "pr.exit.succeeded",
  pr_confirm_success: "pr.confirm.succeeded",
  pr_checkin_submitted: "pr.checkin.submitted",
  pr_primary_cta_impression: "pr.primary_cta.impression",
  pr_primary_cta_click: "pr.primary_cta.click",
  pr_secondary_action_click: "pr.secondary_action.click",
  wechat_oauth_trace: "wechat.oauth.trace",
};

let transportInitialized = false;
let flushTimer: number | null = null;
let flushInFlight = false;
const pendingQueue: PendingUserTelemetryEvent[] = [];

const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const shouldAttachCurrentSpm = (path: string): boolean => {
  return !path.startsWith("/admin");
};

const readString = (payload: Record<string, unknown>, key: string): string | undefined => {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const readPositiveNumber = (payload: Record<string, unknown>, key: string): number | undefined => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};

const withCurrentAttribution = (
  payload: Record<string, unknown>,
  path: string,
): Record<string, unknown> => {
  const explicitSpm = typeof payload.spm === "string" ? sanitizeSpmValue(payload.spm) : null;
  const attribution = explicitSpm ?? resolveCurrentSpmAttribution();
  if (!attribution || !shouldAttachCurrentSpm(path)) {
    return payload;
  }

  return {
    ...payload,
    spm: attribution,
    sourceQr:
      typeof payload.sourceQr === "string" && payload.sourceQr.trim().length > 0
        ? payload.sourceQr
        : attribution,
  };
};

const getCurrentPath = (): string => {
  if (typeof window === "undefined") return "/";
  return sanitizeSensitiveRoutePath(`${window.location.pathname}${window.location.search}`);
};

const getCurrentReferrer = (): string | undefined => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return undefined;
  }
  if (!document.referrer) return undefined;

  try {
    const parsed = new URL(document.referrer, window.location.origin);
    if (parsed.origin === window.location.origin) {
      return sanitizeSensitiveRoutePath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const createEventId = (): string => {
  return createUuid();
};

export const resolveCanonicalUserTelemetryEventName = (event: TelemetryEventName): string => {
  return CANONICAL_EVENT_NAMES[event] ?? event.replaceAll("_", ".");
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

const stripForbiddenPayloadFields = (payload: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || FORBIDDEN_PAYLOAD_KEYS.has(key)) continue;
    sanitized[key] = value;
  }
  return sanitized;
};

const buildAttributes = (input: {
  routeName?: string;
  currentSpm?: string;
  sourceQr?: string;
  cardKey?: string;
}): Record<string, string | number | boolean | null> => {
  const attributes: Record<string, string | number | boolean | null> = {};
  if (input.routeName) attributes.route_name = input.routeName;
  if (input.currentSpm) attributes.spm = input.currentSpm;
  if (input.sourceQr) attributes.source_qr = input.sourceQr;
  if (input.cardKey) attributes.card_key = input.cardKey;
  return attributes;
};

const resolvePrIdRef = (payload: Record<string, unknown>): number | undefined => {
  return (
    readPositiveNumber(payload, "prId") ??
    readPositiveNumber(payload, "prIdRef") ??
    readPositiveNumber(payload, "matchedPrId") ??
    readPositiveNumber(payload, "targetPrId")
  );
};

const buildCanonicalEventPayload = (input: {
  eventName: string;
  payload: Record<string, unknown>;
  prIdRef?: number;
  cardKey?: string;
}): Record<string, unknown> => {
  if (input.eventName.startsWith("pr.discovery.")) {
    return stripForbiddenPayloadFields(input.payload);
  }

  return stripForbiddenPayloadFields({
    ...input.payload,
    prIdRef: input.prIdRef,
    cardKey: input.cardKey,
  });
};

const pushDebugEvent = (record: TelemetryEventRecord<TelemetryEventName>): void => {
  if (typeof window === "undefined") return;
  window.__PARTNER_UP_TELEMETRY_EVENTS__ ??= [];
  const events = window.__PARTNER_UP_TELEMETRY_EVENTS__;
  events.push(record);
  if (events.length > MAX_QUEUE_SIZE) {
    events.splice(0, events.length - MAX_QUEUE_SIZE);
  }
};

const scheduleFlush = (delayMs: number): void => {
  if (typeof window === "undefined") return;
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushPendingEvents();
  }, delayMs);
};

const enqueueEvent = (event: PendingUserTelemetryEvent): void => {
  pendingQueue.push(event);
  if (pendingQueue.length > MAX_QUEUE_SIZE) {
    pendingQueue.splice(0, pendingQueue.length - MAX_QUEUE_SIZE);
  }

  if (pendingQueue.length >= FLUSH_BATCH_SIZE) {
    void flushPendingEvents();
    return;
  }

  scheduleFlush(FLUSH_INTERVAL_MS);
};

const enqueueRawTelemetryEvent = (input: {
  eventName: string;
  journeyId: string;
  occurredAt: string;
  traceId?: string;
  attributes?: Record<string, string | number | boolean | null>;
  payload?: Record<string, unknown>;
}): void => {
  enqueueEvent({
    event_id: createEventId(),
    event_name: input.eventName,
    event_version: 1,
    journey_id: input.journeyId,
    occurred_at: input.occurredAt,
    trace_id: input.traceId,
    attributes: input.attributes ?? {},
    payload: input.payload ?? {},
  });
};

const enqueueJourneyStartedContext = (input: {
  journey: ReturnType<typeof ensureAppJourneyWithState>["journey"];
}): void => {
  const { journey } = input;
  enqueueRawTelemetryEvent({
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
};

const setupTransportLifecycleHooks = (): void => {
  if (transportInitialized || typeof window === "undefined") return;
  transportInitialized = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushPendingEvents();
    }
  });

  window.addEventListener("beforeunload", () => {
    void flushPendingEvents();
  });
};

const flushPendingEvents = async (): Promise<void> => {
  if (flushInFlight) return;
  if (pendingQueue.length === 0) return;

  flushInFlight = true;
  const batch = pendingQueue.splice(0, FLUSH_BATCH_SIZE);
  try {
    const response = await client.api.telemetry.user.events.$post({
      json: {
        events: batch,
      },
    });
    if (!response.ok) {
      throw new Error(`Telemetry ingest failed: ${response.status}`);
    }
  } catch (error) {
    pendingQueue.unshift(...batch);
    scheduleFlush(FLUSH_RETRY_MS);
    if (import.meta.env.DEV) {
      console.warn("[telemetry] failed to flush batch", error);
    }
  } finally {
    flushInFlight = false;
  }

  if (pendingQueue.length > 0) {
    scheduleFlush(0);
  }
};

export const trackEvent = <TEvent extends TelemetryEventName>(
  event: TEvent,
  payload: TelemetryPayload<TEvent>,
): void => {
  const occurredAt = new Date().toISOString();
  const currentPath = getCurrentPath();
  const referrer = getCurrentReferrer();
  const rawPayloadRecord = asRecord(payload);
  const payloadRecord = withCurrentAttribution(rawPayloadRecord, currentPath);
  const eventName = resolveCanonicalUserTelemetryEventName(event);
  const prIdRef = resolvePrIdRef(payloadRecord);
  const routeName = readString(payloadRecord, "routeName");
  const currentSpm = readString(payloadRecord, "spm");
  const sourceQr = readString(payloadRecord, "sourceQr");
  const traceId = readString(payloadRecord, "traceId");
  const cardKey = readString(payloadRecord, "cardKey") ?? readString(payloadRecord, "unitKey");
  const { journey, started } = ensureAppJourneyWithState({
    routePath: currentPath,
    routeName,
    referrer,
    currentSpm,
    sourceQr,
    prIdRef,
    nowIso: occurredAt,
  });
  const record: TelemetryEventRecord<TelemetryEventName> = {
    event,
    eventName,
    payload: payloadRecord,
    at: occurredAt,
    path: currentPath,
  };

  setupTransportLifecycleHooks();
  pushDebugEvent(record);

  if (started) {
    enqueueJourneyStartedContext({ journey });
  }

  if (event === "page_view") {
    enqueueRawTelemetryEvent({
      eventName: "route.entered",
      journeyId: journey.id,
      occurredAt,
      attributes: buildAttributes({
        routeName,
        currentSpm,
        sourceQr,
      }),
      payload: stripForbiddenPayloadFields({
        routePath: currentPath,
        routeName,
        referrer,
        spm: currentSpm,
        sourceQr,
        prId: prIdRef,
      }),
    });
  }

  enqueueRawTelemetryEvent({
    eventName,
    journeyId: journey.id,
    occurredAt,
    traceId,
    attributes: buildAttributes({
      routeName,
      currentSpm,
      sourceQr,
      cardKey,
    }),
    payload: buildCanonicalEventPayload({
      eventName,
      payload: eventName.startsWith("pr.discovery.") ? rawPayloadRecord : payloadRecord,
      prIdRef,
      cardKey,
    }),
  });

  if (import.meta.env.DEV) {
    console.debug("[telemetry]", record);
  }
};

export const trackRawUserTelemetryEvent = (input: {
  eventName: string;
  payload?: Record<string, unknown>;
  attributes?: Record<string, string | number | boolean | null>;
  occurredAt?: string;
  traceId?: string;
}): void => {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const currentPath = getCurrentPath();
  const referrer = getCurrentReferrer();
  const payloadRecord = withCurrentAttribution(asRecord(input.payload ?? {}), currentPath);
  const routeName = readString(payloadRecord, "routeName");
  const currentSpm = readString(payloadRecord, "spm");
  const sourceQr = readString(payloadRecord, "sourceQr");
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

  setupTransportLifecycleHooks();

  if (started) {
    enqueueJourneyStartedContext({ journey });
  }

  enqueueRawTelemetryEvent({
    eventName: input.eventName,
    journeyId: journey.id,
    occurredAt,
    traceId: input.traceId,
    attributes: {
      ...buildAttributes({
        routeName,
        currentSpm,
        sourceQr,
      }),
      ...(input.attributes ?? {}),
    },
    payload: payloadRecord,
  });
};
