const DEFAULT_RESOLUTION_MS = 1_000;
const DEFAULT_EARLY_TOLERANCE_UNITS = 0;
const DEFAULT_LATE_TOLERANCE_UNITS = 0;
const MAX_DB_INTEGER = 2_147_483_647;

export const NO_LATE_TOLERANCE_UNITS = -1;

export interface ScheduleTimingConfig {
  resolutionMs: number;
  earlyToleranceUnits?: number;
  lateToleranceUnits?: number;
}

export interface ResolvedScheduleTiming {
  resolutionMs: number;
  earlyToleranceUnits: number;
  lateToleranceUnits: number;
}

const nonNegativeOr = (value: number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
};

const positiveOr = (value: number | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const resolveLateToleranceUnits = (value: number | undefined): number =>
  value === NO_LATE_TOLERANCE_UNITS
    ? NO_LATE_TOLERANCE_UNITS
    : nonNegativeOr(value, DEFAULT_LATE_TOLERANCE_UNITS);

const ensureDbInteger = (value: number, label: string): number => {
  if (value > MAX_DB_INTEGER) {
    throw new Error(`${label} exceeds integer storage limit`);
  }
  return value;
};

export const getBucketStartMs = (timestampMs: number, resolutionMs: number): number =>
  Math.floor(timestampMs / resolutionMs) * resolutionMs;

export const getBucketIndex = (timestampMs: number, resolutionMs: number): number =>
  Math.floor(timestampMs / resolutionMs);

export const resolveScheduleTiming = (config: ScheduleTimingConfig): ResolvedScheduleTiming => {
  const resolutionMs = ensureDbInteger(
    positiveOr(config.resolutionMs, DEFAULT_RESOLUTION_MS),
    "resolutionMs",
  );
  const earlyToleranceUnits = ensureDbInteger(
    nonNegativeOr(config.earlyToleranceUnits, DEFAULT_EARLY_TOLERANCE_UNITS),
    "earlyToleranceUnits",
  );
  const lateToleranceUnitsRaw = resolveLateToleranceUnits(config.lateToleranceUnits);
  const lateToleranceUnits =
    lateToleranceUnitsRaw === NO_LATE_TOLERANCE_UNITS
      ? NO_LATE_TOLERANCE_UNITS
      : ensureDbInteger(lateToleranceUnitsRaw, "lateToleranceUnits");

  return {
    resolutionMs,
    earlyToleranceUnits,
    lateToleranceUnits,
  };
};

export const getClaimWindowBounds = (input: {
  runAt: Date;
  resolutionMs: number;
  earlyToleranceUnits: number;
  lateToleranceUnits: number;
}): {
  dueBucket: number;
  earliestClaimAtMs: number;
  latestClaimExclusiveAtMs: number | null;
} => {
  const runAtMs = input.runAt.getTime();
  const dueBucket = getBucketIndex(runAtMs, input.resolutionMs);
  const earliestClaimAtMs = (dueBucket - input.earlyToleranceUnits) * input.resolutionMs;
  const latestClaimExclusiveAtMs =
    input.lateToleranceUnits === NO_LATE_TOLERANCE_UNITS
      ? null
      : (dueBucket + input.lateToleranceUnits + 1) * input.resolutionMs;

  return {
    dueBucket,
    earliestClaimAtMs,
    latestClaimExclusiveAtMs,
  };
};
