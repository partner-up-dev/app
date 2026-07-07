export type AnchorEventRecurringStartRulePreviewInput = {
  id: string;
  kind: "RECURRING";
  weekdays: number[];
  timeOfDay: string;
  description: string | null;
};

export type AnchorEventTimeWindowPreview = {
  key: string;
  timeWindow: [string | null, string | null];
  description: string | null;
};

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const toCanonicalIso = (value: Date): string => value.toISOString();

const parseTime = (value: string | null): number | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTimeOfDay = (
  value: string,
): { hour: number; minute: number } | null => {
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
  new Date(
    Date.UTC(year, monthIndex, dayOfMonth, hour, minute) -
      PRODUCT_TIME_ZONE_OFFSET_MS,
  );

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

const getProductLocalWeekday = (value: Date): number =>
  toProductLocalDate(value).getUTCDay();

const buildRecurringOccurrenceStart = (
  dayStartUtc: Date,
  rule: AnchorEventRecurringStartRulePreviewInput,
): Date | null => {
  const localDay = toProductLocalDate(dayStartUtc);
  const timeOfDay = parseTimeOfDay(rule.timeOfDay);
  if (!timeOfDay) {
    return null;
  }

  return toUtcFromProductLocalParts(
    localDay.getUTCFullYear(),
    localDay.getUTCMonth(),
    localDay.getUTCDate(),
    timeOfDay.hour,
    timeOfDay.minute,
  );
};

const materializeTimeWindow = (
  startAt: Date,
  durationMinutes: number,
): [string | null, string | null] => {
  const endAt = new Date(startAt.getTime() + durationMinutes * MINUTE_MS);
  return [toCanonicalIso(startAt), toCanonicalIso(endAt)];
};

const buildTimeWindowKey = (timeWindow: [string | null, string | null]): string => {
  const [start, end] = timeWindow;
  return `${start ?? "_"}::${end ?? "_"}`;
};

const compareTimeWindow = (
  left: [string | null, string | null],
  right: [string | null, string | null],
): number => {
  const leftStart = left[0] ?? "";
  const rightStart = right[0] ?? "";
  if (leftStart !== rightStart) {
    return leftStart.localeCompare(rightStart);
  }

  const leftEnd = left[1] ?? "";
  const rightEnd = right[1] ?? "";
  return leftEnd.localeCompare(rightEnd);
};

const isTimeWindowDiscoverableAt = (
  timeWindow: [string | null, string | null],
  earliestLeadMinutes: number | null,
  now: Date,
): boolean => {
  const endAt = parseTime(timeWindow[1]);
  if (endAt === null) {
    return false;
  }

  if (earliestLeadMinutes === null) {
    return true;
  }

  return endAt <= now.getTime() + earliestLeadMinutes * MINUTE_MS;
};

const isTimeWindowWithinPreviewLowerBound = (
  timeWindow: [string | null, string | null],
  previewLowerBound: Date,
): boolean => {
  const endAt = parseTime(timeWindow[1]);
  if (endAt === null) {
    return false;
  }
  return endAt >= previewLowerBound.getTime();
};

const materializeRecurringRule = ({
  rule,
  durationMinutes,
  now,
  earliestLeadMinutes,
}: {
  rule: AnchorEventRecurringStartRulePreviewInput;
  durationMinutes: number;
  now: Date;
  earliestLeadMinutes: number | null;
}): AnchorEventTimeWindowPreview[] => {
  if (earliestLeadMinutes === null) {
    return [];
  }

  const boundary = new Date(now.getTime() + earliestLeadMinutes * MINUTE_MS);
  const firstDayStart = getProductLocalDayStart(now);
  const lastDayStart = getProductLocalDayStart(boundary);
  const values: AnchorEventTimeWindowPreview[] = [];

  for (
    let dayStart = firstDayStart;
    dayStart.getTime() <= lastDayStart.getTime();
    dayStart = new Date(dayStart.getTime() + DAY_MS)
  ) {
    const weekday = getProductLocalWeekday(dayStart);
    if (!rule.weekdays.includes(weekday)) {
      continue;
    }

    const startAt = buildRecurringOccurrenceStart(dayStart, rule);
    if (!startAt) {
      continue;
    }

    const timeWindow = materializeTimeWindow(startAt, durationMinutes);
    if (
      isTimeWindowWithinPreviewLowerBound(timeWindow, firstDayStart) &&
      isTimeWindowDiscoverableAt(timeWindow, earliestLeadMinutes, now)
    ) {
      values.push({
        key: buildTimeWindowKey(timeWindow),
        timeWindow,
        description: rule.description,
      });
    }
  }

  return values;
};

export const listRecurringAnchorEventTimeWindowPreview = ({
  durationMinutes,
  earliestLeadMinutes,
  recurringRules,
  now = new Date(),
}: {
  durationMinutes: number | null;
  earliestLeadMinutes: number | null;
  recurringRules: AnchorEventRecurringStartRulePreviewInput[];
  now?: Date;
}): AnchorEventTimeWindowPreview[] => {
  if (
    durationMinutes === null ||
    durationMinutes <= 0 ||
    recurringRules.length === 0
  ) {
    return [];
  }

  const unique = new Map<string, AnchorEventTimeWindowPreview>();
  for (const rule of recurringRules) {
    for (const preview of materializeRecurringRule({
      rule,
      durationMinutes,
      now,
      earliestLeadMinutes,
    })) {
      unique.set(preview.key, preview);
    }
  }

  return Array.from(unique.values()).sort((left, right) =>
    compareTimeWindow(left.timeWindow, right.timeWindow),
  );
};
