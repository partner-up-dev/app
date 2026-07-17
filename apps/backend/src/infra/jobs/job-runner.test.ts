import assert from "node:assert/strict";
import { test } from "vitest";
import {
  NO_LATE_TOLERANCE_UNITS,
  getBucketIndex,
  getBucketStartMs,
  getClaimWindowBounds,
  resolveScheduleTiming,
} from "./schedule-timing";

test("getBucketStartMs aligns timestamps to the current resolution bucket", () => {
  const timestampMs = Date.UTC(2026, 3, 12, 9, 4, 59, 999);
  const resolutionMs = 5 * 60 * 1_000;
  const expectedBucketStartMs = Date.UTC(2026, 3, 12, 9, 0, 0, 0);

  assert.equal(getBucketStartMs(timestampMs, resolutionMs), expectedBucketStartMs);
  assert.equal(getBucketIndex(timestampMs, resolutionMs), expectedBucketStartMs / resolutionMs);
});

test("resolveScheduleTiming returns canonical bucket-based timing fields", () => {
  const resolved = resolveScheduleTiming({
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });

  assert.deepEqual(resolved, {
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });
});

test("resolveScheduleTiming rejects values that exceed integer storage", () => {
  assert.throws(
    () =>
      resolveScheduleTiming({
        resolutionMs: 2_147_483_648,
      }),
    /resolutionMs exceeds integer storage limit/,
  );
});

test("getClaimWindowBounds uses the full due bucket when tolerances are zero", () => {
  const resolutionMs = 5 * 60 * 1_000;
  const dueBucketStartMs = Date.UTC(2026, 3, 12, 9, 0, 0, 0);
  const bounds = getClaimWindowBounds({
    runAt: new Date(Date.UTC(2026, 3, 12, 9, 4, 59, 999)),
    resolutionMs,
    earlyToleranceUnits: 0,
    lateToleranceUnits: 0,
  });

  assert.deepEqual(bounds, {
    dueBucket: dueBucketStartMs / resolutionMs,
    earliestClaimAtMs: dueBucketStartMs,
    latestClaimExclusiveAtMs: dueBucketStartMs + resolutionMs,
  });
});

test("getClaimWindowBounds keeps the late side unbounded when tolerance is infinite", () => {
  const bounds = getClaimWindowBounds({
    runAt: new Date(Date.UTC(2026, 3, 12, 9, 0, 1, 0)),
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });

  assert.equal(bounds.earliestClaimAtMs, Date.UTC(2026, 3, 12, 8, 45, 0, 0));
  assert.equal(bounds.latestClaimExclusiveAtMs, null);
});
