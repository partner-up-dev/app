import { createUuid } from "@/shared/telemetry/uuid";
import { sanitizeSensitiveRoutePath } from "@/shared/url/sanitizeSensitiveRoutePath";

const ANONYMOUS_ID_STORAGE_KEY = "__partner_up_telemetry_anonymous_id__";
const APP_JOURNEY_STORAGE_KEY = "__partner_up_telemetry_app_journey__";
const APP_JOURNEY_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000;

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
  startPrId?: number;
  entryKind?: string;
};

export type UserTelemetryJourneyContext = {
  routePath: string;
  routeName?: string;
  referrer?: string;
  currentSpm?: string;
  sourceQr?: string;
  prIdRef?: number;
  entryKind?: string;
  nowIso?: string;
};

export type EnsuredUserTelemetryJourney = {
  journey: UserTelemetryJourney;
  started: boolean;
};

export const createTelemetryId = (): string => {
  return createUuid();
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readNumber = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
};

const readJsonRecord = (storage: Storage, key: string): Record<string, unknown> | null => {
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
      return sanitizeSensitiveRoutePath(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const resolveEntryKind = (routePath: string): string => {
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

const parseStoredJourney = (record: Record<string, unknown>): UserTelemetryJourney | null => {
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
    startPrId: readNumber(record, "startPrId"),
    entryKind: readString(record, "entryKind"),
  };
};

const readStoredJourney = (): UserTelemetryJourney | null => {
  if (typeof window === "undefined") return null;

  try {
    const record = readJsonRecord(window.sessionStorage, APP_JOURNEY_STORAGE_KEY);
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

const isExpiredJourney = (journey: UserTelemetryJourney, nowMs: number): boolean => {
  const lastSeenMs = Date.parse(journey.lastSeenAt);
  return Number.isNaN(lastSeenMs) ? true : nowMs - lastSeenMs > APP_JOURNEY_INACTIVITY_TIMEOUT_MS;
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
    startPrId: context.prIdRef,
    entryKind: context.entryKind ?? resolveEntryKind(context.routePath),
  };
  persistJourney(created);
  return {
    journey: created,
    started: true,
  };
};

export const ensureAppJourney = (context: UserTelemetryJourneyContext): UserTelemetryJourney =>
  ensureAppJourneyWithState(context).journey;

export const resolveCurrentJourneyId = (): string | null => readStoredJourney()?.id ?? null;
