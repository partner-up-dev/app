import assert from "node:assert/strict";
import { test } from "vitest";
import { listPRAuthoringStartOptions, listPRAuthoringTimeWindows } from "./time-window-pool";

test("absolute start rules materialize UTC windows and retain description", () => {
  const config = {
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "absolute",
          kind: "ABSOLUTE" as const,
          startAt: "2038-01-01T17:00:00+08:00",
          description: "  晚间自习  ",
        },
      ],
    },
  };
  const startOptions = listPRAuthoringStartOptions(config, new Date("2037-12-01T00:00:00.000Z"));
  assert.deepEqual(startOptions[0], {
    key: "2038-01-01T09:00:00.000Z::2038-01-01T10:00:00.000Z",
    startAt: "2038-01-01T09:00:00.000Z",
    endAt: "2038-01-01T10:00:00.000Z",
    description: "晚间自习",
  });
});

test("recurring start rules honor product-local weekday and lead boundary", () => {
  const config = {
    timePoolConfig: {
      durationMinutes: 30,
      earliestLeadMinutes: 180,
      startRules: [
        {
          id: "recurring",
          kind: "RECURRING" as const,
          weekdays: [5],
          timeOfDay: "10:00",
          description: "周五活动",
        },
      ],
    },
  };
  const now = new Date("2038-01-01T00:00:00.000Z");
  const windows = listPRAuthoringTimeWindows(config, now);
  assert.deepEqual(windows, [["2038-01-01T02:00:00.000Z", "2038-01-01T02:30:00.000Z"]]);
});
