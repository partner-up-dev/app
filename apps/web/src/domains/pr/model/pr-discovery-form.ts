import type { PRRoute } from "@partner-up-dev/backend";
import type { PRAuthoringOptions } from "@/domains/pr/queries/usePRAuthoringOptions";

export type PRDiscoveryPlaceSelection =
  | { kind: "location"; location: string }
  | { kind: "route"; route: PRRoute };

const PRODUCT_TIME_ZONE = "Asia/Shanghai";
const MINUTE_MS = 60 * 1000;
const FIVE_MINUTE_MS = 5 * MINUTE_MS;

const datePartFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  month: "numeric",
  day: "numeric",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timePartFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  hour12: false,
});

type PresetTag = PRAuthoringOptions["preferenceTags"][number] & { id?: number };
type StartOption = {
  key: string;
  startAt: string;
  endAt: string;
  description: string | null;
};

const normalizeTagLabel = (value: string): string => value.trim();
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const FUZZY_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type PRDiscoveryTimeMode = "NORMAL" | "ADVANCED" | "FUZZY";

export type PRDiscoveryFuzzyTimePreset =
  | "MORNING"
  | "NOON"
  | "AFTERNOON"
  | "DUSK"
  | "NIGHT"
  | "LATE_NIGHT"
  | "ALL_DAY";

export type PRDiscoveryTimeSelection = {
  mode: PRDiscoveryTimeMode;
  label: string;
  timeWindows: PRDiscoveryRecommendationTimeWindow[];
  createTimeWindow: PRDiscoveryCreateTimeWindow | null;
};

export type PRDiscoveryRecommendationTimeWindow = {
  startAt: string;
  endAt: string;
};

export type PRDiscoveryCreateTimeWindow = {
  startAt: string;
  endAt: string | null;
};

export type PRDiscoveryFuzzyDateOption = {
  label: string;
  value: string;
  dateKey: string;
};

export type PRDiscoveryFuzzyTimeOption = {
  label: string;
  value: PRDiscoveryFuzzyTimePreset;
  startTime: string;
  endTime: string;
};

const parsePRDiscoveryDateTime = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isValidPRDiscoveryDateTime = (value: string | null | undefined): value is string =>
  typeof value === "string" && parsePRDiscoveryDateTime(value) !== null;

export const buildPRDiscoveryDateKey = (isoDateTime: string): string => {
  const date = parsePRDiscoveryDateTime(isoDateTime);
  return date === null ? "" : dateKeyFormatter.format(date);
};

export const formatPRDiscoveryDateLabel = (isoDateTime: string): string => {
  const date = parsePRDiscoveryDateTime(isoDateTime);
  return date === null ? "" : datePartFormatter.format(date);
};

export const formatPRDiscoveryTimeLabel = (isoDateTime: string): string => {
  const date = parsePRDiscoveryDateTime(isoDateTime);
  return date === null ? "" : timePartFormatter.format(date);
};

const parseDateKeyAsUtc = (dateKey: string): Date | null => {
  if (!FUZZY_DATE_KEY_PATTERN.test(dateKey)) {
    return null;
  }
  const [yearText, monthText, dayText] = dateKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
};

const addDaysToDateKey = (dateKey: string, days: number): string | null => {
  const date = parseDateKeyAsUtc(dateKey);
  if (!date) {
    return null;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const getDateKeyDayOfWeek = (dateKey: string): number | null => {
  const date = parseDateKeyAsUtc(dateKey);
  return date ? date.getUTCDay() : null;
};

const getDateKeyWeekStart = (dateKey: string): string | null => {
  const date = parseDateKeyAsUtc(dateKey);
  if (!date) {
    return null;
  }
  const weekdayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekdayOffset);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

const formatMonthDayFromDateKey = (dateKey: string): string => {
  const date = parseDateKeyAsUtc(dateKey);
  if (!date) {
    return dateKey;
  }
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
};

const formatRelativeDateOptionLabel = (dateKey: string, now: Date): string => {
  const todayKey = dateKeyFormatter.format(now);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  if (dateKey === todayKey) {
    return "今天";
  }
  if (tomorrowKey && dateKey === tomorrowKey) {
    return "明天";
  }

  const weekday = getDateKeyDayOfWeek(dateKey);
  const weekdayLabel = weekday === null ? "" : (WEEKDAY_LABELS[weekday] ?? "");
  const currentWeekStart = getDateKeyWeekStart(todayKey);
  const optionWeekStart = getDateKeyWeekStart(dateKey);
  const nextWeekStart = currentWeekStart ? addDaysToDateKey(currentWeekStart, 7) : null;
  if (optionWeekStart && optionWeekStart === currentWeekStart) {
    return `本${weekdayLabel}`;
  }
  if (optionWeekStart && optionWeekStart === nextWeekStart) {
    return `下${weekdayLabel}`;
  }
  return `${formatMonthDayFromDateKey(dateKey)} ${weekdayLabel}`.trim();
};

export const buildPRDiscoveryFuzzyDateOptions = (
  now: Date = new Date(),
): PRDiscoveryFuzzyDateOption[] => {
  const todayKey = dateKeyFormatter.format(now);
  const dateKeys = Array.from({ length: 7 }, (_, index) =>
    addDaysToDateKey(todayKey, index),
  ).filter((dateKey): dateKey is string => dateKey !== null);

  return dateKeys.map((dateKey) => ({
    label: formatRelativeDateOptionLabel(dateKey, now),
    value: dateKey,
    dateKey,
  }));
};

export const buildPRDiscoveryFuzzyTimeOptions = (): PRDiscoveryFuzzyTimeOption[] => [
  { label: "上午", value: "MORNING", startTime: "06:00", endTime: "11:00" },
  { label: "中午", value: "NOON", startTime: "11:00", endTime: "13:00" },
  { label: "下午", value: "AFTERNOON", startTime: "13:00", endTime: "17:00" },
  { label: "傍晚", value: "DUSK", startTime: "17:00", endTime: "19:00" },
  { label: "夜晚", value: "NIGHT", startTime: "19:00", endTime: "23:00" },
  { label: "午夜", value: "LATE_NIGHT", startTime: "23:00", endTime: "06:00" },
  { label: "全天", value: "ALL_DAY", startTime: "00:00", endTime: "00:00" },
];

const buildProductLocalIso = (dateKey: string, timeKey: string): string | null => {
  const isoDateTime = buildPRDiscoveryStartAtFromRouteParts(dateKey, timeKey);
  return isoDateTime;
};

export const buildPRDiscoveryPointTimeWindows = (
  startAt: string,
): PRDiscoveryRecommendationTimeWindow[] =>
  isValidPRDiscoveryDateTime(startAt) ? [{ startAt, endAt: startAt }] : [];

export const buildPRDiscoveryCreateTimeWindow = (
  startAt: string,
  durationMinutes: number | null,
): PRDiscoveryCreateTimeWindow | null => {
  if (!isValidPRDiscoveryDateTime(startAt)) {
    return null;
  }

  if (durationMinutes === null) {
    return { startAt, endAt: null };
  }

  return {
    startAt,
    endAt: new Date(new Date(startAt).getTime() + durationMinutes * MINUTE_MS).toISOString(),
  };
};

export const buildPRDiscoveryFuzzyTimeWindows = (
  dateKey: string,
  timePreset: PRDiscoveryFuzzyTimePreset,
): PRDiscoveryRecommendationTimeWindow[] => {
  const option = buildPRDiscoveryFuzzyTimeOptions().find((item) => item.value === timePreset);
  if (!option) {
    return [];
  }

  const startAt = buildProductLocalIso(dateKey, option.startTime);
  const endDateKey = option.endTime <= option.startTime ? addDaysToDateKey(dateKey, 1) : dateKey;
  const endAt = endDateKey ? buildProductLocalIso(endDateKey, option.endTime) : null;
  if (!startAt || !endAt) {
    return [];
  }

  return [{ startAt, endAt }];
};

export const formatPRDiscoveryFuzzySelectionLabel = (
  dateValue: string,
  timePreset: PRDiscoveryFuzzyTimePreset,
  now: Date = new Date(),
): string => {
  const dateOption = buildPRDiscoveryFuzzyDateOptions(now).find(
    (option) => option.value === dateValue,
  );
  const timeOption = buildPRDiscoveryFuzzyTimeOptions().find(
    (option) => option.value === timePreset,
  );
  const dateLabel = dateOption?.label ?? "";
  const timeLabel = timeOption?.label ?? "";
  return dateLabel || timeLabel ? `${dateLabel}${timeLabel}` : "";
};

export const buildPRDiscoveryRouteDateKey = (isoDateTime: string): string =>
  buildPRDiscoveryDateKey(isoDateTime);

export const buildPRDiscoveryRouteTimeKey = (isoDateTime: string): string =>
  formatPRDiscoveryTimeLabel(isoDateTime);

export const buildPRDiscoveryStartAtFromRouteParts = (
  dateKey: string,
  timeKey: string,
): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(timeKey)) {
    return null;
  }

  const [hourText, minuteText] = timeKey.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const date = new Date(`${dateKey}T${timeKey}:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const isoDateTime = date.toISOString();
  if (
    buildPRDiscoveryRouteDateKey(isoDateTime) !== dateKey ||
    buildPRDiscoveryRouteTimeKey(isoDateTime) !== timeKey
  ) {
    return null;
  }

  return isoDateTime;
};

export const formatPRDiscoveryDurationLabel = (durationMinutes: number | null): string => {
  if (durationMinutes === null || durationMinutes <= 0) {
    return "";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `持续 ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `持续 ${hours}h`;
  }
  return `持续 ${minutes}m`;
};

const buildStableSeed = (seed: string): number =>
  Array.from(seed).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0);

export const pickStableGalleryImage = (gallery: readonly string[], seed: string): string | null => {
  const normalizedGallery = gallery.map((item) => item.trim()).filter((item) => item.length > 0);
  if (normalizedGallery.length === 0) {
    return null;
  }

  const index = buildStableSeed(seed) % normalizedGallery.length;
  return normalizedGallery[index] ?? null;
};

export const derivePreferenceCategory = (label: string): string | null => {
  const normalized = normalizeTagLabel(label);
  if (!normalized.includes(":")) {
    return null;
  }

  const [category] = normalized.split(":", 1);
  const resolved = category?.trim() ?? "";
  return resolved.length > 0 ? resolved : null;
};

export const buildPreferenceTagGroups = (tags: readonly PresetTag[]) => {
  const categorized = new Map<
    string,
    Array<{
      id?: number;
      label: string;
      description: string;
    }>
  >();
  const uncategorized: Array<{
    id?: number;
    label: string;
    description: string;
  }> = [];

  for (const tag of tags) {
    const category = derivePreferenceCategory(tag.label);
    if (!category) {
      uncategorized.push(tag);
      continue;
    }

    const items = categorized.get(category) ?? [];
    items.push(tag);
    categorized.set(category, items);
  }

  return {
    categorized: Array.from(categorized.entries()).map(([category, items]) => ({
      category,
      tags: items,
    })),
    uncategorized,
    uncategorizedLabel: categorized.size === 0 && uncategorized.length > 0 ? "偏好" : "其它",
  };
};

const roundUpToFiveMinutes = (value: Date): Date => {
  const timestamp = value.getTime();
  const rounded = Math.ceil(timestamp / FIVE_MINUTE_MS) * FIVE_MINUTE_MS;
  return new Date(rounded);
};

export const buildAdvancedModeStartOptions = (
  earliestLeadMinutes: number | null,
  now: Date = new Date(),
): StartOption[] => {
  if (earliestLeadMinutes === null || earliestLeadMinutes <= 0) {
    return [];
  }

  const start = roundUpToFiveMinutes(now);
  const boundary = new Date(now.getTime() + earliestLeadMinutes * MINUTE_MS);
  const values: StartOption[] = [];

  for (let cursor = start.getTime(); cursor <= boundary.getTime(); cursor += FIVE_MINUTE_MS) {
    const startAt = new Date(cursor).toISOString();
    values.push({
      key: `${startAt}::advanced`,
      startAt,
      endAt: startAt,
      description: null,
    });
  }

  return values;
};

export const buildStartOptionsByDate = (startOptions: readonly StartOption[]) => {
  const groups = new Map<string, StartOption[]>();

  for (const option of startOptions) {
    if (!isValidPRDiscoveryDateTime(option.startAt)) {
      continue;
    }
    const dateKey = buildPRDiscoveryDateKey(option.startAt);
    if (!dateKey) {
      continue;
    }
    const items = groups.get(dateKey) ?? [];
    items.push(option);
    groups.set(dateKey, items);
  }

  return Array.from(groups.entries())
    .map(([dateKey, options]) => ({
      dateKey,
      dateLabel: formatPRDiscoveryDateLabel(options[0]?.startAt ?? dateKey),
      options: [...options].sort((left, right) => left.startAt.localeCompare(right.startAt)),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

export const shouldAutoOpenAdvancedPRDiscoveryTime = (
  startOptions: readonly StartOption[],
  earliestLeadMinutes: number | null,
  now: Date = new Date(),
): boolean =>
  buildStartOptionsByDate(startOptions).length === 0 &&
  buildAdvancedModeStartOptions(earliestLeadMinutes, now).length > 0;
