import { trackEvent } from "@/shared/telemetry/track";
import { createTelemetryId } from "@/shared/telemetry/journey";

const WECHAT_OAUTH_TRACE_STORAGE_KEY = "partner_up_wechat_oauth_trace";

export type WeChatOAuthTraceFlow = "login" | "bind";

export type WeChatOAuthTracePhase =
  | "login_requested"
  | "redirect_scheduled"
  | "bind_requested"
  | "bind_authorize_received"
  | "bind_fallback_login"
  | "handoff_started"
  | "handoff_slow"
  | "handoff_completed"
  | "handoff_failed"
  | "handoff_abandoned";

type WeChatOAuthTraceRecord = {
  traceId: string;
  flow: WeChatOAuthTraceFlow;
  startedAtMs: number;
};

type TrackWeChatOAuthTraceOptions = {
  attempt?: number;
  durationMs?: number;
  result?: "success" | "failure" | "slow" | "abandoned";
  failureReason?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const readPositiveNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
};

const parseTraceRecord = (value: unknown): WeChatOAuthTraceRecord | null => {
  if (!isRecord(value)) return null;

  const traceId = readString(value, "traceId");
  const flow = readString(value, "flow");
  const startedAtMs = readPositiveNumber(value, "startedAtMs");
  if (!traceId || !startedAtMs) return null;
  if (flow !== "login" && flow !== "bind") return null;

  return {
    traceId,
    flow,
    startedAtMs,
  };
};

const writeTraceRecord = (record: WeChatOAuthTraceRecord): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(WECHAT_OAUTH_TRACE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // The backend trace still works when sessionStorage is unavailable.
  }
};

export const readWeChatOAuthTrace = (): WeChatOAuthTraceRecord | null => {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(WECHAT_OAUTH_TRACE_STORAGE_KEY);
    if (!rawValue) return null;
    return parseTraceRecord(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const clearWeChatOAuthTrace = (): void => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(WECHAT_OAUTH_TRACE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

export const startWeChatOAuthTrace = (flow: WeChatOAuthTraceFlow): WeChatOAuthTraceRecord => {
  const record: WeChatOAuthTraceRecord = {
    traceId: createTelemetryId(),
    flow,
    startedAtMs: Date.now(),
  };
  writeTraceRecord(record);
  return record;
};

export const appendWeChatOAuthTraceQuery = (
  query: URLSearchParams,
  trace: WeChatOAuthTraceRecord,
): URLSearchParams => {
  query.set("traceId", trace.traceId);
  query.set("traceStartedAtMs", String(trace.startedAtMs));
  return query;
};

export const trackWeChatOAuthTrace = (
  phase: WeChatOAuthTracePhase,
  options: TrackWeChatOAuthTraceOptions = {},
): void => {
  const record = readWeChatOAuthTrace();
  if (!record) return;

  const nowMs = Date.now();
  trackEvent("wechat_oauth_trace", {
    traceId: record.traceId,
    flow: record.flow,
    phase,
    sinceStartMs: Math.max(0, nowMs - record.startedAtMs),
    durationMs: options.durationMs,
    attempt: options.attempt,
    result: options.result,
    failureReason: options.failureReason,
  });
};
