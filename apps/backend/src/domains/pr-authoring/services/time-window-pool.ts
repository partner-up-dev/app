import type { PRTypeConfig } from "../../../entities/pr-type-config";

export type PRAuthoringTimeWindow = [string | null, string | null];
export type PRAuthoringStartOption = {
  key: string;
  startAt: string;
  endAt: string;
  description: string | null;
};

type PRTypeTimePoolConfig = PRTypeConfig["timePoolConfig"];
type PRTypeStartRule = PRTypeTimePoolConfig["startRules"][number];

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const parseTime = (value: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const parseTimeOfDay = (value: string): { hour: number; minute: number } | null => {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
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
  return { hour, minute };
};

const toProductLocalDate = (value: Date): Date =>
  new Date(value.getTime() + PRODUCT_TIME_ZONE_OFFSET_MS);

const toUtcFromProductLocalParts = (
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  hour: number,
  minute: number,
): Date =>
  new Date(Date.UTC(year, monthIndex, dayOfMonth, hour, minute) - PRODUCT_TIME_ZONE_OFFSET_MS);

const getProductLocalDayStart = (value: Date): Date => {
  const local = toProductLocalDate(value);
  return toUtcFromProductLocalParts(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    0,
    0,
  );
};

const getProductLocalWeekday = (value: Date): number => toProductLocalDate(value).getUTCDay();

const materializeWindow = (startAt: Date, durationMinutes: number): PRAuthoringTimeWindow => [
  startAt.toISOString(),
  new Date(startAt.getTime() + durationMinutes * MINUTE_MS).toISOString(),
];

const buildRecurringStart = (
  dayStartUtc: Date,
  rule: Extract<PRTypeStartRule, { kind: "RECURRING" }>,
): Date | null => {
  const localDay = toProductLocalDate(dayStartUtc);
  const timeOfDay = parseTimeOfDay(rule.timeOfDay);
  if (!timeOfDay) return null;
  return toUtcFromProductLocalParts(
    localDay.getUTCFullYear(),
    localDay.getUTCMonth(),
    localDay.getUTCDate(),
    timeOfDay.hour,
    timeOfDay.minute,
  );
};

const descriptionForRule = (rule: PRTypeStartRule): string | null => {
  const description = rule.description?.trim() ?? "";
  return description || null;
};

const descriptionByWindow = (
  config: PRTypeTimePoolConfig,
  timeWindow: PRAuthoringTimeWindow,
): string | null => {
  const [start] = timeWindow;
  if (!start) return null;
  const startTimestamp = parseTime(start);
  if (startTimestamp === null) return null;
  for (const rule of config.startRules) {
    const ruleStart = rule.kind === "ABSOLUTE" ? parseTime(rule.startAt) : null;
    if (ruleStart !== null && ruleStart === startTimestamp) return descriptionForRule(rule);
    if (rule.kind === "RECURRING") {
      const date = new Date(startTimestamp);
      const dayStart = getProductLocalDayStart(date);
      const weekday = getProductLocalWeekday(dayStart);
      const recurringStart = buildRecurringStart(dayStart, rule);
      if (recurringStart?.getTime() === startTimestamp && rule.weekdays.includes(weekday)) {
        return descriptionForRule(rule);
      }
    }
  }
  return null;
};

const isDiscoverableAt = (
  timeWindow: PRAuthoringTimeWindow,
  earliestLeadMinutes: number | null,
  now: Date,
): boolean => {
  const endTimestamp = parseTime(timeWindow[1]);
  return (
    endTimestamp !== null &&
    (earliestLeadMinutes === null ||
      endTimestamp <= now.getTime() + earliestLeadMinutes * MINUTE_MS)
  );
};

const isPreviewVisible = (timeWindow: PRAuthoringTimeWindow, now: Date): boolean => {
  const startTimestamp = parseTime(timeWindow[0]);
  const endTimestamp = parseTime(timeWindow[1]);
  return (
    startTimestamp !== null &&
    startTimestamp > now.getTime() &&
    endTimestamp !== null &&
    endTimestamp >= getProductLocalDayStart(now).getTime()
  );
};

export const buildPRAuthoringTimeWindowKey = (timeWindow: PRAuthoringTimeWindow): string =>
  `${timeWindow[0] ?? "_"}::${timeWindow[1] ?? "_"}`;

export const listPRAuthoringTimeWindows = (
  config: Pick<PRTypeConfig, "timePoolConfig">,
  now = new Date(),
): PRAuthoringTimeWindow[] => {
  const pool = config.timePoolConfig;
  if (pool.durationMinutes === null || pool.startRules.length === 0) return [];
  const unique = new Map<string, PRAuthoringTimeWindow>();
  for (const rule of pool.startRules) {
    if (rule.kind === "ABSOLUTE") {
      const startAt = new Date(rule.startAt);
      if (Number.isNaN(startAt.getTime())) continue;
      const window = materializeWindow(startAt, pool.durationMinutes);
      if (
        isPreviewVisible(window, now) &&
        isDiscoverableAt(window, pool.earliestLeadMinutes, now)
      ) {
        unique.set(buildPRAuthoringTimeWindowKey(window), window);
      }
      continue;
    }
    if (pool.earliestLeadMinutes === null) continue;
    const boundary = new Date(now.getTime() + pool.earliestLeadMinutes * MINUTE_MS);
    for (
      let dayStart = getProductLocalDayStart(now);
      dayStart.getTime() <= getProductLocalDayStart(boundary).getTime();
      dayStart = new Date(dayStart.getTime() + DAY_MS)
    ) {
      if (!rule.weekdays.includes(getProductLocalWeekday(dayStart))) continue;
      const startAt = buildRecurringStart(dayStart, rule);
      if (!startAt) continue;
      const window = materializeWindow(startAt, pool.durationMinutes);
      if (
        isPreviewVisible(window, now) &&
        isDiscoverableAt(window, pool.earliestLeadMinutes, now)
      ) {
        unique.set(buildPRAuthoringTimeWindowKey(window), window);
      }
    }
  }
  return [...unique.values()].sort((left, right) => left[0]!.localeCompare(right[0]!));
};

export const listPRAuthoringStartOptions = (
  config: Pick<PRTypeConfig, "timePoolConfig">,
  now = new Date(),
): PRAuthoringStartOption[] =>
  listPRAuthoringTimeWindows(config, now).map((timeWindow) => ({
    key: buildPRAuthoringTimeWindowKey(timeWindow),
    startAt: timeWindow[0]!,
    endAt: timeWindow[1]!,
    description: descriptionByWindow(config.timePoolConfig, timeWindow),
  }));
