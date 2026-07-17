import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import {
  buildPRDiscoveryDateKey,
  buildPRDiscoveryFuzzyTimeOptions,
  buildPRDiscoveryFuzzyTimeWindows,
  type PRDiscoveryFuzzyTimePreset,
  type PRDiscoveryTimeMode,
} from "@/domains/pr/model/pr-discovery-form";
import {
  addDaysToProductLocalDateKey,
  getTodayProductLocalDateKey,
  type ProductLocalDateKey,
  parseProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";

export type TimeWindow = [string | null, string | null];

const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const productLocalWeekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  weekday: "short",
});

export const resolvePRDiscoveryTimeWindowStartTimestamp = (timeWindow: TimeWindow): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(start).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

export const resolvePRDiscoveryTimeWindowEndTimestamp = (timeWindow: TimeWindow): number => {
  const [, end] = timeWindow;
  if (!end) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(end).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

export const hasPRDiscoveryTimeWindowStarted = (timeWindow: TimeWindow): boolean => {
  const startTimestamp = resolvePRDiscoveryTimeWindowStartTimestamp(timeWindow);
  return Number.isFinite(startTimestamp) && Date.now() >= startTimestamp;
};

export const isEndedPRDiscoveryTimeWindow = (timeWindow: TimeWindow): boolean => {
  const endTimestamp = resolvePRDiscoveryTimeWindowEndTimestamp(timeWindow);
  if (Number.isFinite(endTimestamp)) {
    return Date.now() >= endTimestamp;
  }

  return hasPRDiscoveryTimeWindowStarted(timeWindow);
};

const resolveRelativeDayLabel = (dateKey: ProductLocalDateKey): "今天" | "明天" | "后天" | null => {
  const todayDateKey = getTodayProductLocalDateKey();
  if (dateKey === todayDateKey) {
    return "今天";
  }

  const tomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 1);
  if (tomorrowDateKey !== null && dateKey === tomorrowDateKey) {
    return "明天";
  }

  const dayAfterTomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 2);
  if (dayAfterTomorrowDateKey !== null && dateKey === dayAfterTomorrowDateKey) {
    return "后天";
  }

  return null;
};

export const resolvePRDiscoveryTimeWindowDateKey = (
  timeWindow: TimeWindow,
): ProductLocalDateKey | null => {
  const [start] = timeWindow;
  if (!start) {
    return null;
  }

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return getTodayProductLocalDateKey(date);
};

export const formatPRDiscoveryDateKeyLabel = (dateKey: ProductLocalDateKey): string => {
  const parsed = parseProductLocalDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();
  const relativeDayLabel = resolveRelativeDayLabel(dateKey);
  if (relativeDayLabel) {
    return `${month}月${day}日(${relativeDayLabel})`;
  }

  return `${month}月${day}日${productLocalWeekdayFormatter.format(parsed)}`;
};

export const formatPRDiscoveryTimeWindowLabel = (
  timeWindow: TimeWindow,
  index: number,
  batchLabel: string,
): string => {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      const dateKey = resolvePRDiscoveryTimeWindowDateKey(timeWindow);
      if (Number.isNaN(date.getTime()) || dateKey === null) {
        return `${batchLabel} ${index + 1}`;
      }

      const datePart = formatPRDiscoveryDateKeyLabel(dateKey);
      const timePart = productLocalTimeFormatter.format(date);
      return `${datePart} ${timePart}`;
    } catch {
      return `${batchLabel} ${index + 1}`;
    }
  }

  return `${batchLabel} ${index + 1}`;
};

export const formatPRDiscoveryTimeWindowOptionLabel = (
  timeWindow: TimeWindow,
  index: number,
  batchLabel: string,
  description: string | null | undefined,
): string => {
  const baseLabel = formatPRDiscoveryTimeWindowLabel(timeWindow, index, batchLabel);
  const normalizedDescription = description?.trim() ?? "";
  return normalizedDescription ? `${baseLabel} - ${normalizedDescription}` : baseLabel;
};

export const formatPRDiscoveryTimeWindowTimeLabel = (
  timeWindow: TimeWindow,
  index: number,
  batchLabel: string,
): string => {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      if (!Number.isNaN(date.getTime())) {
        return productLocalTimeFormatter.format(date);
      }
    } catch {
      return `${batchLabel} ${index + 1}`;
    }
  }

  return `${batchLabel} ${index + 1}`;
};

export type PRDiscoveryTimeWindow = TimeWindow;
export const resolvePRDiscoveryDateKey = (
  value: string | TimeWindow | null | undefined,
): string => {
  const start = Array.isArray(value) ? value[0] : value;
  if (typeof start !== "string") return "";
  return buildPRDiscoveryDateKey(start);
};
export const formatPRDiscoveryDateKey = (dateKey: string): string =>
  parseProductLocalDateKey(dateKey)
    ? formatPRDiscoveryDateKeyLabel(dateKey as ProductLocalDateKey)
    : dateKey;
export const formatPRDiscoveryTimeWindow = (value: TimeWindow | null | undefined): string =>
  value ? formatPRDiscoveryTimeWindowLabel(value, 0, "时间") : "";

export type PRTimeWindowEditorMode = PRDiscoveryTimeMode;
export type PRDiscoveryTimeWindowEditorMode = PRTimeWindowEditorMode;
export type PRTimeWindowPresetOption = {
  key: string;
  startAt: string;
  endAt: string;
  description: string | null;
};
export type PRTimeWindowPickerOption = { label: string; value: string };
export type PRTimeWindowEditorAllowEditAfterReady = PRAllowEditAfterReady | null;

export const timeWindowsEqual = (
  left: TimeWindow | null | undefined,
  right: TimeWindow | null | undefined,
): boolean =>
  (left?.[0] ?? null) === (right?.[0] ?? null) && (left?.[1] ?? null) === (right?.[1] ?? null);

export const isCompleteTimeWindow = (
  timeWindow: TimeWindow | null | undefined,
): timeWindow is [string, string] =>
  typeof timeWindow?.[0] === "string" &&
  typeof timeWindow[1] === "string" &&
  timeWindow[0].length > 0 &&
  timeWindow[1].length > 0;

export const buildAllowEditAfterReadyForTimeWindowMode = (
  mode: PRTimeWindowEditorMode,
  timeWindow: TimeWindow | null,
): PRTimeWindowEditorAllowEditAfterReady => {
  if (mode !== "FUZZY" || !isCompleteTimeWindow(timeWindow)) return null;
  return { timeWindow: [timeWindow[0], timeWindow[1]] };
};

export const findFuzzyPresetForTimeWindow = (
  timeWindow: TimeWindow | null,
): { dateValue: string; timePreset: PRDiscoveryFuzzyTimePreset } | null => {
  if (!isCompleteTimeWindow(timeWindow)) return null;
  const dateValue = buildPRDiscoveryDateKey(timeWindow[0]);
  if (!dateValue) return null;
  for (const option of buildPRDiscoveryFuzzyTimeOptions()) {
    const [candidate] = buildPRDiscoveryFuzzyTimeWindows(dateValue, option.value);
    if (candidate?.startAt === timeWindow[0] && candidate.endAt === timeWindow[1]) {
      return { dateValue, timePreset: option.value };
    }
  }
  return null;
};
