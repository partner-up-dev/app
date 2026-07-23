import { describe, expect, test } from "vitest";
import {
  createDefaultRange,
  normalizeAnalyticsFilters,
  normalizeFunnelFilters,
  parseLocalInputValue,
  toAppliedFilters,
} from "./filters";

describe("analytics filters", () => {
  test("creates a 30-day local input range and converts it to ISO instants", () => {
    const now = new Date("2026-07-23T12:00:30.000Z");
    const range = createDefaultRange(now);
    const startAt = parseLocalInputValue(range.startAt);
    const endAt = parseLocalInputValue(range.endAt);
    expect(range.startAt).toContain("2026-06-23T");
    expect(range.endAt).toContain("2026-07-23T");
    expect(endAt?.getTime()).toBeGreaterThan(now.getTime());
    expect((endAt?.getTime() ?? 0) - (startAt?.getTime() ?? 0)).toBe(30 * 24 * 60 * 60 * 1_000);
    expect(toAppliedFilters(range)).toEqual({
      startAt: startAt?.toISOString(),
      endAt: endAt?.toISOString(),
      prType: null,
      viewMode: null,
      origin: null,
    });
  });

  test("rejects missing and reversed ranges while trimming dimensions", () => {
    expect(
      toAppliedFilters({ startAt: "", endAt: "", prType: " x ", viewMode: "", origin: " y " }),
    ).toBeNull();
    expect(
      toAppliedFilters({
        startAt: "2026-07-24T00:00",
        endAt: "2026-07-23T00:00",
        prType: " x ",
        viewMode: "FORM",
        origin: " y ",
      }),
    ).toBeNull();
    expect(
      normalizeAnalyticsFilters({
        startAt: "a",
        endAt: "b",
        prType: " x ",
        viewMode: "FORM",
        origin: " y ",
      }),
    ).toEqual({ startAt: "a", endAt: "b", prType: "x", viewMode: "FORM", origin: "y" });
    expect(
      normalizeFunnelFilters({
        startAt: "a",
        endAt: "b",
        prType: "x",
        viewMode: "FORM",
        origin: "y",
      }),
    ).toEqual({ startAt: "a", endAt: "b" });
  });
});
