export const ANALYTICS_MAX_RANGE_DAYS = 31;
export const ANALYTICS_MAX_RANGE_MS = ANALYTICS_MAX_RANGE_DAYS * 24 * 60 * 60 * 1_000;
export const ANALYTICS_DEFAULT_RANGE_DAYS = 7;

export type AnalyticsRangeInput = {
  startAt?: Date;
  endAt?: Date;
};

export type AnalyticsRange = {
  startAt: string;
  endAt: string;
};

/** Resolve one half-open instant range for every Analytics reader. */
export const resolveAnalyticsRange = (input: AnalyticsRangeInput): AnalyticsRange => {
  const endAt = input.endAt ?? new Date();
  const startAt =
    input.startAt ??
    new Date(endAt.getTime() - ANALYTICS_DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1_000);

  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
    throw new Error("Analytics range must contain valid instants");
  }
  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("startAt must be before endAt");
  }
  if (endAt.getTime() - startAt.getTime() > ANALYTICS_MAX_RANGE_MS) {
    throw new Error(`Analytics range must not exceed ${ANALYTICS_MAX_RANGE_DAYS} days`);
  }

  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
};
