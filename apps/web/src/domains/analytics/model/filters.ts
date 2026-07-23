export const analyticsViewModes = ["FORM", "CARD", "LIST"] as const;
export type AnalyticsViewMode = (typeof analyticsViewModes)[number];

export type AnalyticsDashboardKind = "overview" | "pr-funnels" | "pr-discovery";

export type AnalyticsFilters = {
  startAt?: string;
  endAt?: string;
  prType?: string | null;
  viewMode?: AnalyticsViewMode | null;
  origin?: string | null;
};

export type AnalyticsDraftFilters = {
  startAt: string;
  endAt: string;
  prType: string;
  viewMode: AnalyticsViewMode | "";
  origin: string;
};

const DAY_MS = 24 * 60 * 60 * 1_000;
const MINUTE_MS = 60 * 1_000;

export const toLocalInputValue = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const parseLocalInputValue = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

export const createDefaultRange = (now = new Date()): AnalyticsDraftFilters => {
  const end = new Date(Math.ceil(now.getTime() / MINUTE_MS) * MINUTE_MS);
  const start = new Date(end.getTime() - 30 * DAY_MS);
  return {
    startAt: toLocalInputValue(start),
    endAt: toLocalInputValue(end),
    prType: "",
    viewMode: "",
    origin: "",
  };
};

export const toAppliedFilters = (
  draft: Pick<AnalyticsDraftFilters, "startAt" | "endAt" | "prType" | "viewMode" | "origin">,
): AnalyticsFilters | null => {
  const startAt = parseLocalInputValue(draft.startAt);
  const endAt = parseLocalInputValue(draft.endAt);
  if (!startAt || !endAt || startAt.getTime() >= endAt.getTime()) return null;
  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    prType: draft.prType.trim() || null,
    viewMode: draft.viewMode || null,
    origin: draft.origin.trim() || null,
  };
};

export const normalizeAnalyticsFilters = (input: AnalyticsFilters): AnalyticsFilters => ({
  startAt: input.startAt,
  endAt: input.endAt,
  prType: input.prType?.trim() || null,
  viewMode: input.viewMode ?? null,
  origin: input.origin?.trim() || null,
});

export const normalizeFunnelFilters = (
  input: AnalyticsFilters,
): Pick<AnalyticsFilters, "startAt" | "endAt"> => ({
  startAt: input.startAt,
  endAt: input.endAt,
});
