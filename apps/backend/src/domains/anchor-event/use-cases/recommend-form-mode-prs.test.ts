import assert from "node:assert/strict";
import { test } from "vitest";
import type { AnchorEvent } from "../../../entities";
import { resolveAnchorEventFormModeSelectionTimeWindows } from "../services/form-mode";

const event = {
  timePoolConfig: {
    durationMinutes: 120,
    earliestLeadMinutes: null,
    startRules: [
      {
        kind: "ABSOLUTE",
        startAt: "2030-05-19T06:00:00.000Z",
      },
      {
        kind: "ABSOLUTE",
        startAt: "2030-05-19T12:00:00.000Z",
      },
    ],
  },
} as AnchorEvent;

test("resolveAnchorEventFormModeSelectionTimeWindows expands fuzzy presets against event start options", () => {
  const timeWindows = resolveAnchorEventFormModeSelectionTimeWindows(event, {
    mode: "FUZZY",
    datePreset: "DATE:2030-05-19",
    timePreset: "AFTERNOON",
  });

  assert.deepEqual(timeWindows, [
    ["2030-05-19T06:00:00.000Z", "2030-05-19T08:00:00.000Z"],
  ]);
});
