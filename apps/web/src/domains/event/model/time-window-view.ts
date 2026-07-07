import {
  addDaysToProductLocalDateKey,
  getTodayProductLocalDateKey,
  parseProductLocalDateKey,
  type ProductLocalDateKey,
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

export const resolveTimeWindowStartTimestamp = (
  timeWindow: TimeWindow,
): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(start).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

export const resolveTimeWindowEndTimestamp = (
  timeWindow: TimeWindow,
): number => {
  const [, end] = timeWindow;
  if (!end) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(end).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

export const hasTimeWindowStarted = (timeWindow: TimeWindow): boolean => {
  const startTimestamp = resolveTimeWindowStartTimestamp(timeWindow);
  return Number.isFinite(startTimestamp) && Date.now() >= startTimestamp;
};

export const isEndedTimeWindow = (timeWindow: TimeWindow): boolean => {
  const endTimestamp = resolveTimeWindowEndTimestamp(timeWindow);
  if (Number.isFinite(endTimestamp)) {
    return Date.now() >= endTimestamp;
  }

  return hasTimeWindowStarted(timeWindow);
};

const resolveRelativeDayLabel = (
  dateKey: ProductLocalDateKey,
): "今天" | "明天" | "后天" | null => {
  const todayDateKey = getTodayProductLocalDateKey();
  if (dateKey === todayDateKey) {
    return "今天";
  }

  const tomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 1);
  if (tomorrowDateKey !== null && dateKey === tomorrowDateKey) {
    return "明天";
  }

  const dayAfterTomorrowDateKey = addDaysToProductLocalDateKey(
    todayDateKey,
    2,
  );
  if (
    dayAfterTomorrowDateKey !== null &&
    dateKey === dayAfterTomorrowDateKey
  ) {
    return "后天";
  }

  return null;
};

export const resolveTimeWindowDateKey = (
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

export const formatDateKeyLabel = (dateKey: ProductLocalDateKey): string => {
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

export const formatTimeWindowLabel = (
  timeWindow: TimeWindow,
  index: number,
  batchLabel: string,
): string => {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      const dateKey = resolveTimeWindowDateKey(timeWindow);
      if (Number.isNaN(date.getTime()) || dateKey === null) {
        return `${batchLabel} ${index + 1}`;
      }

      const datePart = formatDateKeyLabel(dateKey);
      const timePart = productLocalTimeFormatter.format(date);
      return `${datePart} ${timePart}`;
    } catch {
      return `${batchLabel} ${index + 1}`;
    }
  }

  return `${batchLabel} ${index + 1}`;
};

export const formatTimeWindowOptionLabel = (
  timeWindow: TimeWindow,
  index: number,
  batchLabel: string,
  description: string | null | undefined,
): string => {
  const baseLabel = formatTimeWindowLabel(timeWindow, index, batchLabel);
  const normalizedDescription = description?.trim() ?? "";
  return normalizedDescription
    ? `${baseLabel} - ${normalizedDescription}`
    : baseLabel;
};

export const formatTimeWindowTimeLabel = (
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
