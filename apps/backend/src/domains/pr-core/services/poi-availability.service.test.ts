import assert from "node:assert/strict";
import { test } from "vitest";
import type { PoiAvailabilityRule } from "../../../entities/poi";
import {
  assertPRTimeWindowAvailableAtLocation,
  isTimeWindowAvailableByPoiRules,
} from "./poi-availability.service";

test("empty POI availability rules mean all day available", () => {
  assert.equal(
    isTimeWindowAvailableByPoiRules([], [
      "2026-04-24T15:00:00.000Z",
      "2026-04-24T16:00:00.000Z",
    ]),
    true,
  );
});

test("weekly include rules require the full PR window to fit inside one segment", () => {
  const rules: PoiAvailabilityRule[] = [
    {
      id: "fri-sun-waterbar-hours",
      mode: "INCLUDE",
      kind: "RECURRING",
      frequency: "WEEKLY",
      weekdays: [5, 6, 0],
      startTime: "11:30",
      endTime: "22:00",
      monthDays: [],
      months: [],
    },
  ];

  assert.equal(
    isTimeWindowAvailableByPoiRules(rules, [
      "2026-04-24T04:00:00.000Z",
      "2026-04-24T05:00:00.000Z",
    ]),
    true,
  );
  assert.equal(
    isTimeWindowAvailableByPoiRules(rules, [
      "2026-04-24T14:30:00.000Z",
      "2026-04-24T15:00:00.000Z",
    ]),
    false,
  );
});

test("exclude rules make overlapping windows unavailable", () => {
  const rules: PoiAvailabilityRule[] = [
    {
      id: "all-day",
      mode: "INCLUDE",
      kind: "RECURRING",
      frequency: "DAILY",
      startTime: "00:00",
      endTime: "00:00",
      weekdays: [],
      monthDays: [],
      months: [],
    },
    {
      id: "maintenance",
      mode: "EXCLUDE",
      kind: "ABSOLUTE",
      startAt: "2026-04-24T13:00:00+08:00",
      endAt: "2026-04-24T14:00:00+08:00",
    },
  ];

  assert.equal(
    isTimeWindowAvailableByPoiRules(rules, [
      "2026-04-24T04:30:00.000Z",
      "2026-04-24T05:30:00.000Z",
    ]),
    false,
  );
});

test("PR availability check skips lookup when location is null", async () => {
  await assertPRTimeWindowAvailableAtLocation({
    location: null,
    timeWindow: [
      "2026-04-24T04:30:00.000Z",
      "2026-04-24T05:30:00.000Z",
    ],
  });
});
