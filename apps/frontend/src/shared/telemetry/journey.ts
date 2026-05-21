import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";
import { createUuid } from "@/shared/telemetry/uuid";

const ANONYMOUS_ID_STORAGE_KEY = "__partner_up_telemetry_anonymous_id__";
const APP_JOURNEY_STORAGE_KEY = "__partner_up_telemetry_app_journey__";
const ACTIVE_SEGMENT_STORAGE_KEY = "__partner_up_telemetry_active_segment__";
const SEGMENT_DEDUPE_STORAGE_KEY = "__partner_up_telemetry_segment_dedupe__";
const APP_JOURNEY_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_DEDUPE_KEYS_PER_SEGMENT = 500;

export type UserTelemetryJourney = {
  id: string;
  anonymousId: string;
  startedAt: string;
  lastSeenAt: string;
  startRoute: string;
  startRouteName?: string;
  startReferrer?: string;
  startSpm?: string;
  currentSpm?: string;
  startSourceQr?: string;
  currentSourceQr?: string;
  startEventId?: number;
  startPrId?: number;
  entryKind?: string;
};

export type UserTelemetryJourneyContext = {
  routePath: string;
  routeName?: string;
  referrer?: string;
  currentSpm?: string;
  sourceQr?: string;
  eventIdRef?: number;
  prIdRef?: number;
  entryKind?: string;
  nowIso?: string;
};

export type EnsuredUserTelemetryJourney = {
  journey: UserTelemetryJourney;
  started: boolean;
};

export type UserTelemetrySegment = {
  id: string;
  segmentKind: string;
  startedAt: string;
  endedAt?: string;
  eventId?: number;
  prId?: number;
  assignedMode?: string;
  renderedMode?: string;
  assignmentRevision?: string;
  segmentStartRoute?: string;
  segmentStartSpm?: string;
  segmentStartSourceQr?: string;
};

export type StartUserTelemetrySegmentInput = Omit<
  UserTelemetrySegment,
  "id" | "startedAt" | "endedAt"
> & {
  startedAt?: string;
};

export const createTelemetryId = (): string => {
  return createUuid();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readNumber = (
  record: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
};

const readJsonRecord = (
  storage: Storage,
  key: string,
): Record<string, unknown> | null => {
  const rawValue = storage.getItem(key);
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeJson = (storage: Storage, key: string, value: unknown): void => {
  storage.setItem(key, JSON.stringify(value));
};

const sanitizeReferrer = (referrer: string | undefined): string | undefined => {
  if (!referrer || typeof window === "undefined") return undefined;

  try {
    const parsed = new URL(referrer, window.location.origin);
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

const resolveEntryKind = (routePath: string): string => {
  if (routePath.startsWith("/e/") || routePath.startsWith("/events/")) {
    return "anchor_event";
  }
  if (routePath.startsWith("/pr/")) {
    return "partner_request";
  }
  if (routePath.startsWith("/admin/")) {
    return "admin";
  }
  return "route";
};

export const resolveAnonymousId = (): string => {
  if (typeof window === "undefined") {
    return "server";
  }

  try {
    const stored = window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    if (stored) return stored;

    const created = createTelemetryId();
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return createTelemetryId();
  }
};

const parseStoredJourney = (
  record: Record<string, unknown>,
): UserTelemetryJourney | null => {
  const id = readString(record, "id");
  const anonymousId = readString(record, "anonymousId");
  const startedAt = readString(record, "startedAt");
  const lastSeenAt = readString(record, "lastSeenAt");
  const startRoute = readString(record, "startRoute");

  if (!id || !anonymousId || !startedAt || !lastSeenAt || !startRoute) {
    return null;
  }

  return {
    id,
    anonymousId,
    startedAt,
    lastSeenAt,
    startRoute,
    startRouteName: readString(record, "startRouteName"),
    startReferrer: readString(record, "startReferrer"),
    startSpm: readString(record, "startSpm"),
    currentSpm: readString(record, "currentSpm"),
    startSourceQr: readString(record, "startSourceQr"),
    currentSourceQr: readString(record, "currentSourceQr"),
    startEventId: readNumber(record, "startEventId"),
    startPrId: readNumber(record, "startPrId"),
    entryKind: readString(record, "entryKind"),
  };
};

const readStoredJourney = (): UserTelemetryJourney | null => {
  if (typeof window === "undefined") return null;

  try {
    const record = readJsonRecord(
      window.sessionStorage,
      APP_JOURNEY_STORAGE_KEY,
    );
    return record ? parseStoredJourney(record) : null;
  } catch {
    return null;
  }
};

const persistJourney = (journey: UserTelemetryJourney): void => {
  if (typeof window === "undefined") return;

  try {
    writeJson(window.sessionStorage, APP_JOURNEY_STORAGE_KEY, journey);
  } catch {
    // Ignore sessionStorage write errors.
  }
};

const isExpiredJourney = (
  journey: UserTelemetryJourney,
  nowMs: number,
): boolean => {
  const lastSeenMs = Date.parse(journey.lastSeenAt);
  return Number.isNaN(lastSeenMs)
    ? true
    : nowMs - lastSeenMs > APP_JOURNEY_INACTIVITY_TIMEOUT_MS;
};

export const ensureAppJourneyWithState = (
  context: UserTelemetryJourneyContext,
): EnsuredUserTelemetryJourney => {
  const nowIso = context.nowIso ?? new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const anonymousId = resolveAnonymousId();
  const stored = readStoredJourney();

  if (stored && !isExpiredJourney(stored, nowMs)) {
    const updated: UserTelemetryJourney = {
      ...stored,
      anonymousId,
      lastSeenAt: nowIso,
      currentSpm: context.currentSpm ?? stored.currentSpm,
      currentSourceQr: context.sourceQr ?? stored.currentSourceQr,
    };
    persistJourney(updated);
    return {
      journey: updated,
      started: false,
    };
  }

  const created: UserTelemetryJourney = {
    id: createTelemetryId(),
    anonymousId,
    startedAt: nowIso,
    lastSeenAt: nowIso,
    startRoute: context.routePath,
    startRouteName: context.routeName,
    startReferrer: sanitizeReferrer(context.referrer),
    startSpm: context.currentSpm,
    currentSpm: context.currentSpm,
    startSourceQr: context.sourceQr,
    currentSourceQr: context.sourceQr,
    startEventId: context.eventIdRef,
    startPrId: context.prIdRef,
    entryKind: context.entryKind ?? resolveEntryKind(context.routePath),
  };
  persistJourney(created);
  return {
    journey: created,
    started: true,
  };
};

export const ensureAppJourney = (
  context: UserTelemetryJourneyContext,
): UserTelemetryJourney => ensureAppJourneyWithState(context).journey;

export const resolveCurrentJourneyId = (): string | null =>
  readStoredJourney()?.id ?? null;

const parseStoredSegment = (
  record: Record<string, unknown>,
): UserTelemetrySegment | null => {
  const id = readString(record, "id");
  const segmentKind = readString(record, "segmentKind");
  const startedAt = readString(record, "startedAt");

  if (!id || !segmentKind || !startedAt) {
    return null;
  }

  return {
    id,
    segmentKind,
    startedAt,
    endedAt: readString(record, "endedAt"),
    eventId: readNumber(record, "eventId"),
    prId: readNumber(record, "prId"),
    assignedMode: readString(record, "assignedMode"),
    renderedMode: readString(record, "renderedMode"),
    assignmentRevision: readString(record, "assignmentRevision"),
    segmentStartRoute: readString(record, "segmentStartRoute"),
    segmentStartSpm: readString(record, "segmentStartSpm"),
    segmentStartSourceQr: readString(record, "segmentStartSourceQr"),
  };
};

export const getActiveUserTelemetrySegment =
  (): UserTelemetrySegment | null => {
  if (typeof window === "undefined") return null;

  try {
    const record = readJsonRecord(
      window.sessionStorage,
      ACTIVE_SEGMENT_STORAGE_KEY,
    );
    return record ? parseStoredSegment(record) : null;
  } catch {
    return null;
  }
};

export const startUserTelemetrySegment = (
  input: StartUserTelemetrySegmentInput,
): UserTelemetrySegment => {
  const segment: UserTelemetrySegment = {
    ...input,
    id: createTelemetryId(),
    startedAt: input.startedAt ?? new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      writeJson(window.sessionStorage, ACTIVE_SEGMENT_STORAGE_KEY, segment);
    } catch {
      // Ignore sessionStorage write errors.
    }
  }

  return segment;
};

const isSameSegmentIdentity = (
  segment: UserTelemetrySegment,
  input: StartUserTelemetrySegmentInput,
): boolean => {
  return (
    segment.segmentKind === input.segmentKind &&
    segment.eventId === input.eventId &&
    segment.prId === input.prId &&
    segment.assignedMode === input.assignedMode &&
    segment.renderedMode === input.renderedMode &&
    segment.assignmentRevision === input.assignmentRevision
  );
};

export const ensureUserTelemetrySegment = (
  input: StartUserTelemetrySegmentInput,
): UserTelemetrySegment => {
  const active = getActiveUserTelemetrySegment();
  if (active && isSameSegmentIdentity(active, input)) {
    return active;
  }

  return startUserTelemetrySegment(input);
};

export const endActiveUserTelemetrySegment = (
  endedAt = new Date().toISOString(),
): UserTelemetrySegment | null => {
  const active = getActiveUserTelemetrySegment();
  if (!active) return null;

  const ended: UserTelemetrySegment = {
    ...active,
    endedAt,
  };

  if (typeof window !== "undefined") {
    try {
      writeJson(window.sessionStorage, ACTIVE_SEGMENT_STORAGE_KEY, ended);
    } catch {
      // Ignore sessionStorage write errors.
    }
  }

  return ended;
};

export const clearActiveUserTelemetrySegment = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ACTIVE_SEGMENT_STORAGE_KEY);
  } catch {
    // Ignore sessionStorage write errors.
  }
};

const readSegmentDedupeStore = (): Record<string, string[]> => {
  if (typeof window === "undefined") return {};

  try {
    const record = readJsonRecord(
      window.sessionStorage,
      SEGMENT_DEDUPE_STORAGE_KEY,
    );
    if (!record) return {};

    const store: Record<string, string[]> = {};
    for (const [segmentId, keys] of Object.entries(record)) {
      if (!Array.isArray(keys)) continue;
      store[segmentId] = keys.filter(
        (key): key is string => typeof key === "string",
      );
    }
    return store;
  } catch {
    return {};
  }
};

const writeSegmentDedupeStore = (store: Record<string, string[]>): void => {
  if (typeof window === "undefined") return;

  try {
    writeJson(window.sessionStorage, SEGMENT_DEDUPE_STORAGE_KEY, store);
  } catch {
    // Ignore sessionStorage write errors.
  }
};

export const claimUserTelemetrySegmentDedupeKey = (
  key: string,
  segmentId = getActiveUserTelemetrySegment()?.id ?? null,
): boolean => {
  if (!segmentId) return true;

  const store = readSegmentDedupeStore();
  const keys = store[segmentId] ?? [];
  if (keys.includes(key)) {
    return false;
  }

  store[segmentId] = [...keys, key].slice(-MAX_DEDUPE_KEYS_PER_SEGMENT);
  writeSegmentDedupeStore(store);
  return true;
};
