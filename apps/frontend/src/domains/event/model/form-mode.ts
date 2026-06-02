import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";

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

type PresetTag = AnchorEventFormModeResponse["presetTags"][number];
type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const normalizeTagLabel = (value: string): string => value.trim();
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const FUZZY_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type FormModeTimeMode = "NORMAL" | "ADVANCED" | "FUZZY";

export type FormModeFuzzyTimePreset =
  | "MORNING"
  | "NOON"
  | "AFTERNOON"
  | "DUSK"
  | "NIGHT"
  | "LATE_NIGHT"
  | "ALL_DAY";

export type FormModeTimeSelection =
  {
    mode: FormModeTimeMode;
    label: string;
    timeWindows: FormModeRecommendationTimeWindow[];
    createTimeWindow: FormModeCreateTimeWindow | null;
  };

export type FormModeRecommendationTimeWindow = {
  startAt: string;
  endAt: string;
};

export type FormModeCreateTimeWindow = {
  startAt: string;
  endAt: string | null;
};

export type FormModeFuzzyDateOption = {
  label: string;
  value: string;
  dateKey: string;
};

export type FormModeFuzzyTimeOption = {
  label: string;
  value: FormModeFuzzyTimePreset;
  startTime: string;
  endTime: string;
};

const parseFormModeDateTime = (value: string): Date | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isValidFormModeDateTime = (
  value: string | null | undefined,
): value is string =>
  typeof value === "string" && parseFormModeDateTime(value) !== null;

export const buildFormModeDateKey = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
  return date === null ? "" : dateKeyFormatter.format(date);
};

export const formatFormModeDateLabel = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
  return date === null ? "" : datePartFormatter.format(date);
};

export const formatFormModeTimeLabel = (isoDateTime: string): string => {
  const date = parseFormModeDateTime(isoDateTime);
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
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
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

const formatRelativeDateOptionLabel = (
  dateKey: string,
  now: Date,
): string => {
  const todayKey = dateKeyFormatter.format(now);
  const tomorrowKey = addDaysToDateKey(todayKey, 1);
  if (dateKey === todayKey) {
    return "今天";
  }
  if (tomorrowKey && dateKey === tomorrowKey) {
    return "明天";
  }

  const weekday = getDateKeyDayOfWeek(dateKey);
  const weekdayLabel = weekday === null ? "" : WEEKDAY_LABELS[weekday] ?? "";
  const currentWeekStart = getDateKeyWeekStart(todayKey);
  const optionWeekStart = getDateKeyWeekStart(dateKey);
  const nextWeekStart = currentWeekStart
    ? addDaysToDateKey(currentWeekStart, 7)
    : null;
  if (optionWeekStart && optionWeekStart === currentWeekStart) {
    return `本${weekdayLabel}`;
  }
  if (optionWeekStart && optionWeekStart === nextWeekStart) {
    return `下${weekdayLabel}`;
  }
  return `${formatMonthDayFromDateKey(dateKey)} ${weekdayLabel}`.trim();
};

export const buildFormModeFuzzyDateOptions = (
  now: Date = new Date(),
): FormModeFuzzyDateOption[] => {
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

export const buildFormModeFuzzyTimeOptions = (): FormModeFuzzyTimeOption[] => [
  { label: "上午", value: "MORNING", startTime: "06:00", endTime: "11:00" },
  { label: "中午", value: "NOON", startTime: "11:00", endTime: "13:00" },
  { label: "下午", value: "AFTERNOON", startTime: "13:00", endTime: "17:00" },
  { label: "傍晚", value: "DUSK", startTime: "17:00", endTime: "19:00" },
  { label: "夜晚", value: "NIGHT", startTime: "19:00", endTime: "23:00" },
  { label: "午夜", value: "LATE_NIGHT", startTime: "23:00", endTime: "06:00" },
  { label: "全天", value: "ALL_DAY", startTime: "00:00", endTime: "23:59" },
];

const buildProductLocalIso = (dateKey: string, timeKey: string): string | null => {
  const isoDateTime = buildFormModeStartAtFromRouteParts(dateKey, timeKey);
  return isoDateTime;
};

export const buildFormModePointTimeWindows = (
  startAt: string,
): FormModeRecommendationTimeWindow[] =>
  isValidFormModeDateTime(startAt) ? [{ startAt, endAt: startAt }] : [];

export const buildFormModeCreateTimeWindow = (
  startAt: string,
  durationMinutes: number | null,
): FormModeCreateTimeWindow | null => {
  if (!isValidFormModeDateTime(startAt)) {
    return null;
  }

  if (durationMinutes === null) {
    return { startAt, endAt: null };
  }

  return {
    startAt,
    endAt: new Date(
      new Date(startAt).getTime() + durationMinutes * MINUTE_MS,
    ).toISOString(),
  };
};

export const buildFormModeFuzzyTimeWindows = (
  dateKey: string,
  timePreset: FormModeFuzzyTimePreset,
): FormModeRecommendationTimeWindow[] => {
  const option = buildFormModeFuzzyTimeOptions().find(
    (item) => item.value === timePreset,
  );
  if (!option) {
    return [];
  }

  const startAt = buildProductLocalIso(dateKey, option.startTime);
  const endDateKey =
    option.endTime <= option.startTime
      ? addDaysToDateKey(dateKey, 1)
      : dateKey;
  const endAt = endDateKey
    ? buildProductLocalIso(endDateKey, option.endTime)
    : null;
  if (!startAt || !endAt) {
    return [];
  }

  return [{ startAt, endAt }];
};

export const formatFormModeFuzzySelectionLabel = (
  dateValue: string,
  timePreset: FormModeFuzzyTimePreset,
  now: Date = new Date(),
): string => {
  const dateOption = buildFormModeFuzzyDateOptions(now).find(
    (option) => option.value === dateValue,
  );
  const timeOption = buildFormModeFuzzyTimeOptions().find(
    (option) => option.value === timePreset,
  );
  const dateLabel = dateOption?.label ?? "";
  const timeLabel = timeOption?.label ?? "";
  return dateLabel || timeLabel ? `${dateLabel}${timeLabel}` : "";
};

export const buildFormModeRouteDateKey = (isoDateTime: string): string =>
  buildFormModeDateKey(isoDateTime);

export const buildFormModeRouteTimeKey = (isoDateTime: string): string =>
  formatFormModeTimeLabel(isoDateTime);

export const buildFormModeStartAtFromRouteParts = (
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
    buildFormModeRouteDateKey(isoDateTime) !== dateKey ||
    buildFormModeRouteTimeKey(isoDateTime) !== timeKey
  ) {
    return null;
  }

  return isoDateTime;
};

export const formatFormModeDurationLabel = (
  durationMinutes: number | null,
): string => {
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
  Array.from(seed).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0,
  );

export const pickStableGalleryImage = (
  gallery: readonly string[],
  seed: string,
): string | null => {
  const normalizedGallery = gallery
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
      id: number;
      label: string;
      description: string;
    }>
  >();
  const uncategorized: Array<{
    id: number;
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
    uncategorizedLabel:
      categorized.size === 0 && uncategorized.length > 0 ? "偏好" : "其它",
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

  for (
    let cursor = start.getTime();
    cursor <= boundary.getTime();
    cursor += FIVE_MINUTE_MS
  ) {
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
    if (!isValidFormModeDateTime(option.startAt)) {
      continue;
    }
    const dateKey = buildFormModeDateKey(option.startAt);
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
      dateLabel: formatFormModeDateLabel(options[0]?.startAt ?? dateKey),
      options: [...options].sort((left, right) =>
        left.startAt.localeCompare(right.startAt),
      ),
    }))
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey));
};

export const shouldAutoOpenAdvancedFormModeTime = (
  startOptions: readonly StartOption[],
  earliestLeadMinutes: number | null,
  now: Date = new Date(),
): boolean =>
  buildStartOptionsByDate(startOptions).length === 0 &&
  buildAdvancedModeStartOptions(earliestLeadMinutes, now).length > 0;
