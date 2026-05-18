import type {
  TelemetryEventName,
  TelemetryPayload,
} from "@/shared/telemetry/events";
import { resolveCurrentSpmAttribution } from "@/shared/telemetry/spm-attribution";
import {
  ensureAppJourney,
  getActiveUserTelemetrySegment,
  type UserTelemetrySegment,
} from "@/shared/telemetry/journey";
import { sanitizeSpmValue } from "@/shared/url/spm";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import { client } from "@/lib/rpc";
import { createUuid } from "@/shared/telemetry/uuid";

type TelemetryEventRecord<
  TEvent extends TelemetryEventName = TelemetryEventName,
> = {
  event: TEvent;
  eventName: string;
  payload: Record<string, unknown>;
  at: string;
  path: string;
};

type PendingUserTelemetryEvent = {
  id: string;
  eventName: string;
  eventKind: "page" | "track" | "identify" | "group";
  occurredAt: string;
  source: "frontend";
  anonymousId: string;
  appJourneyId: string;
  journeyStartedAt: string;
  journeyStartRoute: string;
  journeyStartRouteName?: string;
  journeyStartReferrer?: string;
  journeyStartSpm?: string;
  journeyStartSourceQr?: string;
  journeyStartEventId?: number;
  journeyStartPrId?: number;
  journeyEntryKind?: string;
  segmentId?: string;
  segment?: UserTelemetrySegment;
  routePath: string;
  routeName?: string;
  referrer?: string;
  startSpm?: string;
  currentSpm?: string;
  sourceQr?: string;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  eventIdRef?: number;
  prIdRef?: number;
  cardKey?: string;
  segmentKey?: string;
  properties: Record<string, unknown>;
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
  anchor_event_landing_viewed: "anchor_event.landing.viewed",
  anchor_event_recommendation_requested:
    "anchor_event.recommendation.requested",
  anchor_event_recommendation_returned: "anchor_event.recommendation.returned",
  anchor_event_candidate_engaged: "anchor_event.candidate.engaged",
  anchor_event_assisted_create_started:
    "anchor_event.assisted_create.started",
  anchor_event_card_stack_loaded: "anchor_event.card_stack.loaded",
  anchor_event_card_seen: "anchor_event.card.seen",
  anchor_event_card_action_taken: "anchor_event.card.action_taken",
  anchor_event_card_empty_create_started:
    "anchor_event.card_empty_create.started",
  anchor_event_list_loaded: "anchor_event.list.loaded",
  anchor_event_list_date_selected: "anchor_event.date.selected",
  anchor_event_list_pr_row_seen: "anchor_event.pr_row.seen",
  anchor_event_list_pr_row_action_taken: "anchor_event.pr_row.action_taken",
  anchor_event_list_create_started: "anchor_event.list_create.started",
  pr_entry_reached: "pr.entry.reached",
  pr_commitment_result: "pr.commitment.result",
  pr_create_result: "pr.create.result",
  pr_join_result: "pr.join.result",
  pr_waitlist_result: "pr.waitlist.result",
  pr_exit_success: "pr.exit.succeeded",
  pr_confirm_success: "pr.confirm.succeeded",
  pr_checkin_submitted: "pr.checkin.submitted",
  anchor_event_form_impression: "anchor_event.form.impression",
  anchor_event_form_started: "anchor_event.form.started",
  anchor_event_form_recommendation_impression:
    "anchor_event.form.recommendation_impression",
  anchor_event_recommendation_result: "anchor_event.recommendation.result",
  anchor_event_form_result_action_click:
    "anchor_event.form_result.action_clicked",
  anchor_event_form_create_fallback_click:
    "anchor_event.form.create_fallback_clicked",
  event_assisted_create_result: "anchor_event.assisted_create.result",
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

const readString = (
  payload: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = payload[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const readPositiveNumber = (
  payload: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
};

const withCurrentAttribution = (
  payload: Record<string, unknown>,
  path: string,
): Record<string, unknown> => {
  const explicitSpm =
    typeof payload.spm === "string" ? sanitizeSpmValue(payload.spm) : null;
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
  return sanitizeSensitiveRoutePath(
    `${window.location.pathname}${window.location.search}`,
  );
};

const getCurrentReferrer = (): string | undefined => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return undefined;
  }
  if (!document.referrer) return undefined;

  try {
    const parsed = new URL(document.referrer, window.location.origin);
    if (parsed.origin === window.location.origin) {
      return sanitizeSensitiveRoutePath(
        `${parsed.pathname}${parsed.search}${parsed.hash}`,
      );
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const createEventId = (): string => {
  return createUuid();
};

const toCanonicalEventName = (event: TelemetryEventName): string => {
  return CANONICAL_EVENT_NAMES[event] ?? event.replaceAll("_", ".");
};

const resolveEventKind = (
  event: TelemetryEventName,
): PendingUserTelemetryEvent["eventKind"] => {
  return event === "page_view" ? "page" : "track";
};

const resolveEventIdRef = (
  payload: Record<string, unknown>,
): number | undefined => {
  return (
    readPositiveNumber(payload, "eventId") ??
    readPositiveNumber(payload, "eventIdRef")
  );
};

const resolvePrIdRef = (
  payload: Record<string, unknown>,
): number | undefined => {
  return (
    readPositiveNumber(payload, "prId") ??
    readPositiveNumber(payload, "prIdRef") ??
    readPositiveNumber(payload, "matchedPrId") ??
    readPositiveNumber(payload, "targetPrId")
  );
};

const pushDebugEvent = (
  record: TelemetryEventRecord<TelemetryEventName>,
): void => {
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
  const payloadRecord = withCurrentAttribution(asRecord(payload), currentPath);
  const eventName = toCanonicalEventName(event);
  const eventIdRef = resolveEventIdRef(payloadRecord);
  const prIdRef = resolvePrIdRef(payloadRecord);
  const routeName = readString(payloadRecord, "routeName");
  const currentSpm = readString(payloadRecord, "spm");
  const sourceQr = readString(payloadRecord, "sourceQr");
  const journey = ensureAppJourney({
    routePath: currentPath,
    routeName,
    referrer,
    currentSpm,
    sourceQr,
    eventIdRef,
    prIdRef,
    nowIso: occurredAt,
  });
  const activeSegment = getActiveUserTelemetrySegment();
  const record: TelemetryEventRecord<TelemetryEventName> = {
    event,
    eventName,
    payload: payloadRecord,
    at: occurredAt,
    path: currentPath,
  };

  setupTransportLifecycleHooks();
  pushDebugEvent(record);
  enqueueEvent({
    id: createEventId(),
    eventName,
    eventKind: resolveEventKind(event),
    occurredAt,
    source: "frontend",
    anonymousId: journey.anonymousId,
    appJourneyId: journey.id,
    journeyStartedAt: journey.startedAt,
    journeyStartRoute: journey.startRoute,
    journeyStartRouteName: journey.startRouteName,
    journeyStartReferrer: journey.startReferrer,
    journeyStartSpm: journey.startSpm,
    journeyStartSourceQr: journey.startSourceQr,
    journeyStartEventId: journey.startEventId,
    journeyStartPrId: journey.startPrId,
    journeyEntryKind: journey.entryKind,
    segmentId: activeSegment?.id,
    segment: activeSegment ?? undefined,
    routePath: currentPath,
    routeName,
    referrer,
    startSpm: journey.startSpm,
    currentSpm,
    sourceQr,
    correlationId: readString(payloadRecord, "correlationId"),
    requestId: readString(payloadRecord, "requestId"),
    traceId: readString(payloadRecord, "traceId"),
    eventIdRef,
    prIdRef,
    cardKey:
      readString(payloadRecord, "cardKey") ?? readString(payloadRecord, "unitKey"),
    segmentKey: readString(payloadRecord, "segmentKey"),
    properties: payloadRecord,
  });

  if (import.meta.env.DEV) {
    console.debug("[telemetry]", record);
  }
};
