import assert from "node:assert/strict";
import { test } from "vitest";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { validateAdminPRTimeWindow } from "./validation";

test("admin PR time-window validation accepts open-ended windows", () => {
  assert.doesNotThrow(() => validateAdminPRTimeWindow([null, null]));
  assert.doesNotThrow(() =>
    validateAdminPRTimeWindow(["2026-07-16T10:00:00.000Z", "2026-07-16T11:00:00.000Z"]),
  );
});

test("admin PR time-window validation rejects reversed or malformed windows", () => {
  assert.throws(
    () => validateAdminPRTimeWindow(["2026-07-16T11:00:00.000Z", "2026-07-16T10:00:00.000Z"]),
    (error: unknown) => error instanceof ProblemDetailsError && error.status === 400,
  );
  assert.throws(() => validateAdminPRTimeWindow(["not-a-date", null]));
  assert.throws(() =>
    validateAdminPRTimeWindow(["2026-07-16T10:00:00.000Z", "2026-07-16T10:00:00.000Z"]),
  );
});
