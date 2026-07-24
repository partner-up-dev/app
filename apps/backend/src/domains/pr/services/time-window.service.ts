/**
 * Time-window domain service — pure functions for PR time-window calculations.
 *
 * These are extracted from the retired legacy PR facade to enable
 * reuse across multiple use-cases without coupling to any specific
 * use-case class.
 */

import type { PartnerRequestFields } from "../contracts/partner-request";

export type TimeWindow = PartnerRequestFields["time"];
export type ComparableTimeWindowRange = {
  start: Date;
  end: Date;
};

const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCT_TIME_ZONE = "Asia/Shanghai";
const productLocalDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PRODUCT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatProductLocalDateKey = (date: Date): string => {
  let year = "";
  let month = "";
  let day = "";

  for (const part of productLocalDateFormatter.formatToParts(date)) {
    if (part.type === "year") year = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "day") day = part.value;
  }

  return `${year}-${month}-${day}`;
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseTimeWindowDate(value: string | null): Date | null {
  if (!value) return null;

  const isDateOnly = ISO_DATE_ONLY_PATTERN.test(value);
  const normalized = isDateOnly ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getProductLocalDateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return formatProductLocalDateKey(value);
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (ISO_DATE_ONLY_PATTERN.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatProductLocalDateKey(parsed);
}

export function getProductLocalDateKeyForTimeWindowStart(timeWindow: TimeWindow): string | null {
  return getProductLocalDateKey(timeWindow[0]);
}

// ---------------------------------------------------------------------------
// Window boundaries
// ---------------------------------------------------------------------------

export function getTimeWindowStart(timeWindow: TimeWindow): Date | null {
  const [startRaw] = timeWindow;
  return parseTimeWindowDate(startRaw);
}

export function getTimeWindowClose(timeWindow: TimeWindow): Date | null {
  const [startRaw, endRaw] = timeWindow;
  const end = parseTimeWindowDate(endRaw);
  if (end) return end;

  const start = parseTimeWindowDate(startRaw);
  if (!start) return null;

  // Default close: 12 hours after start
  return new Date(start.getTime() + 12 * 60 * 60 * 1000);
}

export function resolveComparableTimeWindowRange(
  timeWindow: TimeWindow,
): ComparableTimeWindowRange | null {
  const start = getTimeWindowStart(timeWindow);
  const end = getTimeWindowClose(timeWindow);
  if (!start || !end) return null;
  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}

export function doTimeWindowRangesOverlap(
  left: ComparableTimeWindowRange,
  right: ComparableTimeWindowRange,
): boolean {
  return left.start.getTime() < right.end.getTime() && right.start.getTime() < left.end.getTime();
}

export function doTimeWindowsOverlap(left: TimeWindow, right: TimeWindow): boolean {
  const leftRange = resolveComparableTimeWindowRange(left);
  const rightRange = resolveComparableTimeWindowRange(right);
  if (!leftRange || !rightRange) return false;
  return doTimeWindowRangesOverlap(leftRange, rightRange);
}

// ---------------------------------------------------------------------------
// Derived deadlines
// ---------------------------------------------------------------------------

/** T-1h: deadline for unconfirmed slots auto-release. */
export function getConfirmDeadline(timeWindow: TimeWindow): Date | null {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;
  return new Date(start.getTime() - 60 * 60 * 1000);
}

/** T-30min: join lock time — no new participants after this point. */
export function getJoinLockTime(timeWindow: TimeWindow): Date | null {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;
  return new Date(start.getTime() - 30 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Temporal predicates
// ---------------------------------------------------------------------------

/**
 * Between T-1h and T-30min a newly joining partner is auto-confirmed.
 */
export function shouldAutoConfirmImmediately(timeWindow: TimeWindow): boolean {
  const confirmDeadline = getConfirmDeadline(timeWindow);
  const joinLockTime = getJoinLockTime(timeWindow);
  if (!confirmDeadline || !joinLockTime) return false;

  const now = Date.now();
  return now >= confirmDeadline.getTime() && now < joinLockTime.getTime();
}

/** After T-30min no one can join. */
export function isJoinLockedByTime(timeWindow: TimeWindow): boolean {
  const joinLockTime = getJoinLockTime(timeWindow);
  if (!joinLockTime) return false;
  return Date.now() >= joinLockTime.getTime();
}

/** Has this PR's participation window started? */
export function hasPRTimeWindowStarted(timeWindow: TimeWindow): boolean {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return true;
  return Date.now() >= start.getTime();
}

/** Is the current moment inside the active execution window? */
export function isWithinActiveWindow(timeWindow: TimeWindow): boolean {
  const start = getTimeWindowStart(timeWindow);
  if (!start) return false;

  const now = Date.now();
  if (start.getTime() > now) return false;

  const close = getTimeWindowClose(timeWindow);
  if (close && close.getTime() <= now) return false;

  return true;
}
