import assert from "node:assert/strict";
import { test } from "vitest";
import { NO_LATE_TOLERANCE_UNITS, getClaimWindowBounds } from "../jobs/schedule-timing";
import { resolveConfirmationReminderSchedulePolicy } from "./job-schedule-policy";

test("confirmation start reminders cannot be claimed before their scheduled time", () => {
  const runAt = new Date(Date.UTC(2026, 4, 5, 8, 3, 12, 345));
  const policy = resolveConfirmationReminderSchedulePolicy("CONFIRM_START");
  const bounds = getClaimWindowBounds({
    runAt,
    resolutionMs: policy.resolutionMs,
    earlyToleranceUnits: policy.earlyToleranceUnits,
    lateToleranceUnits: policy.lateToleranceUnits,
  });

  assert.equal(bounds.earliestClaimAtMs, runAt.getTime());
  assert.equal(bounds.latestClaimExclusiveAtMs, null);
});

test("confirmation end reminders keep the existing coarse reminder policy", () => {
  const policy = resolveConfirmationReminderSchedulePolicy("CONFIRM_END_MINUS_30M");

  assert.deepEqual(policy, {
    resolutionMs: 5 * 60 * 1_000,
    earlyToleranceUnits: 3,
    lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
  });
});
