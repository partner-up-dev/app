import type { PRTimeWindow } from "../contracts/partner-request";
import type { PoiAvailabilityRule } from "../../../entities/poi";
import { normalizePoiAvailabilityRules } from "../../../entities/poi";
import { ProblemDetailsError } from "../../../lib/problem-details";

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Interval = {
  startMs: number;
  endMs: number;
};

const parseTimestamp = (value: string | null): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTimeOfDayMinutes = (value: string): number | null => {
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
  return hour * 60 + minute;
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

const matchesRecurringDate = (
  rule: Extract<PoiAvailabilityRule, { kind: "RECURRING" }>,
  dayStartUtc: Date,
): boolean => {
  const local = toProductLocalDate(dayStartUtc);
  const weekday = local.getUTCDay();
  const month = local.getUTCMonth() + 1;
  const monthDay = local.getUTCDate();

  switch (rule.frequency) {
    case "DAILY":
      return true;
    case "WEEKLY":
      return rule.weekdays.includes(weekday);
    case "MONTHLY":
      return rule.monthDays.includes(monthDay);
    case "YEARLY":
      return rule.months.includes(month) && rule.monthDays.includes(monthDay);
  }
};

const buildRecurringInterval = (
  rule: Extract<PoiAvailabilityRule, { kind: "RECURRING" }>,
  dayStartUtc: Date,
): Interval | null => {
  const startMinutes = parseTimeOfDayMinutes(rule.startTime);
  const endMinutes = parseTimeOfDayMinutes(rule.endTime);
  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  const startAt = new Date(dayStartUtc.getTime() + startMinutes * MINUTE_MS);
  const endDayOffset = endMinutes <= startMinutes ? DAY_MS : 0;
  const endAt = new Date(dayStartUtc.getTime() + endDayOffset + endMinutes * MINUTE_MS);

  return {
    startMs: startAt.getTime(),
    endMs: endAt.getTime(),
  };
};

const overlaps = (left: Interval, right: Interval): boolean =>
  left.startMs < right.endMs && right.startMs < left.endMs;

const expandRuleIntervals = (rule: PoiAvailabilityRule, target: Interval): Interval[] => {
  if (rule.kind === "ABSOLUTE") {
    const startMs = parseTimestamp(rule.startAt);
    const endMs = parseTimestamp(rule.endAt);
    if (startMs === null || endMs === null || endMs <= startMs) {
      return [];
    }
    const interval = { startMs, endMs };
    return overlaps(interval, target) ? [interval] : [];
  }

  const firstDay = new Date(getProductLocalDayStart(new Date(target.startMs)).getTime() - DAY_MS);
  const lastDay = new Date(getProductLocalDayStart(new Date(target.endMs)).getTime() + DAY_MS);
  const intervals: Interval[] = [];

  for (
    let cursor = firstDay;
    cursor.getTime() <= lastDay.getTime();
    cursor = new Date(cursor.getTime() + DAY_MS)
  ) {
    if (!matchesRecurringDate(rule, cursor)) {
      continue;
    }
    const interval = buildRecurringInterval(rule, cursor);
    if (interval && overlaps(interval, target)) {
      intervals.push(interval);
    }
  }

  return intervals;
};

const intervalsCoverTarget = (intervals: Interval[], target: Interval): boolean => {
  const sorted = intervals
    .map((interval) => ({
      startMs: Math.max(interval.startMs, target.startMs),
      endMs: Math.min(interval.endMs, target.endMs),
    }))
    .filter((interval) => interval.endMs > interval.startMs)
    .sort((left, right) => left.startMs - right.startMs);

  let coveredUntil = target.startMs;
  for (const interval of sorted) {
    if (interval.startMs > coveredUntil) {
      return false;
    }
    coveredUntil = Math.max(coveredUntil, interval.endMs);
    if (coveredUntil >= target.endMs) {
      return true;
    }
  }

  return coveredUntil >= target.endMs;
};

export const isTimeWindowAvailableByPoiRules = (
  rules: PoiAvailabilityRule[],
  timeWindow: PRTimeWindow,
): boolean => {
  const startMs = parseTimestamp(timeWindow[0]);
  const endMs = parseTimestamp(timeWindow[1]);
  if (startMs === null || endMs === null || endMs <= startMs) {
    return true;
  }

  const normalizedRules = normalizePoiAvailabilityRules(rules);
  if (normalizedRules.length === 0) {
    return true;
  }

  const target = { startMs, endMs };
  const includeRules = normalizedRules.filter((rule) => rule.mode === "INCLUDE");
  const excludeIntervals = normalizedRules
    .filter((rule) => rule.mode === "EXCLUDE")
    .flatMap((rule) => expandRuleIntervals(rule, target));
  if (excludeIntervals.some((interval) => overlaps(interval, target))) {
    return false;
  }

  if (includeRules.length === 0) {
    return true;
  }

  const includeIntervals = includeRules.flatMap((rule) => expandRuleIntervals(rule, target));
  return intervalsCoverTarget(includeIntervals, target);
};

const buildUnavailableProblem = (location: string): ProblemDetailsError =>
  new ProblemDetailsError({
    status: 400,
    type: "https://partner-up.app/problems/poi-time-window-unavailable",
    localizedText: {
      zhCN: {
        title: "地点在该时间不可用",
        detail: `${location} 在所选时间段内不可用，请选择其它时间或地点。`,
      },
      enUS: {
        title: "Location unavailable at this time",
        detail: `${location} is unavailable for the selected time window. Choose another time or location.`,
      },
    },
  });

export const assertPRTimeWindowAvailableAtLocation = async (input: {
  location: string | null;
  timeWindow: PRTimeWindow;
}): Promise<void> => {
  const location = input.location?.trim() ?? "";
  if (!location) {
    return;
  }

  const { resolvePublishedPoiByLocation } = await import("../../poi");
  const poi = await resolvePublishedPoiByLocation(location);
  if (!poi || poi.availabilityRules.length === 0) {
    return;
  }

  if (!isTimeWindowAvailableByPoiRules(poi.availabilityRules, input.timeWindow)) {
    throw buildUnavailableProblem(location);
  }
};
