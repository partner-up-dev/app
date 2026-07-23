import assert from "node:assert/strict";
import { test } from "vitest";
import { resolveAnalyticsRange } from "./analytics-range";

test("analytics range normalizes offset-equivalent instants", () => {
  assert.deepEqual(
    resolveAnalyticsRange({
      startAt: new Date("2026-05-01T08:00:00.000Z"),
      endAt: new Date("2026-05-02T08:00:00.000Z"),
    }),
    resolveAnalyticsRange({
      startAt: new Date("2026-05-01T16:00:00.000+08:00"),
      endAt: new Date("2026-05-02T16:00:00.000+08:00"),
    }),
  );
});

test("analytics range accepts 31 days and rejects equal, reversed and longer windows", () => {
  const startAt = new Date("2026-05-01T00:00:00.000Z");
  assert.equal(
    resolveAnalyticsRange({
      startAt,
      endAt: new Date("2026-06-01T00:00:00.000Z"),
    }).endAt,
    "2026-06-01T00:00:00.000Z",
  );
  for (const endAt of [
    startAt,
    new Date("2026-04-30T23:59:59.999Z"),
    new Date("2026-06-01T00:00:00.001Z"),
  ]) {
    assert.throws(() => resolveAnalyticsRange({ startAt, endAt }));
  }
});
