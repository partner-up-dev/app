import { describe, expect, test } from "vitest";
import {
  buildAllowEditAfterReadyForTimeWindowMode,
  findFuzzyPresetForTimeWindow,
} from "@/domains/event/model/pr-time-window-editor";

describe("PR time window editor model", () => {
  test("builds ready-edit policy only for fuzzy complete time windows", () => {
    const timeWindow: [string, string] = ["2026-06-01T16:00:00.000Z", "2026-06-02T16:00:00.000Z"];

    expect(buildAllowEditAfterReadyForTimeWindowMode("FUZZY", timeWindow)).toEqual({
      timeWindow,
    });
    expect(buildAllowEditAfterReadyForTimeWindowMode("NORMAL", timeWindow)).toBeNull();
    expect(buildAllowEditAfterReadyForTimeWindowMode("FUZZY", [timeWindow[0], null])).toBeNull();
  });

  test("resolves all-day fuzzy preset from a PR time window", () => {
    expect(
      findFuzzyPresetForTimeWindow(["2026-06-01T16:00:00.000Z", "2026-06-02T16:00:00.000Z"]),
    ).toEqual({
      dateValue: "2026-06-02",
      timePreset: "ALL_DAY",
    });
  });
});
