import { describe, expect, test } from "vitest";
import { formatFriendlyTimeWindowLabel } from "./formatLocalDateTime";

describe("formatFriendlyTimeWindowLabel", () => {
  test("hides time for same-day all-day windows", () => {
    expect(formatFriendlyTimeWindowLabel(["2026-06-02T00:00:00", "2026-06-03T00:00:00"])).toBe(
      "2026-06-02",
    );
  });

  test("keeps only one date for same-day partial windows", () => {
    expect(formatFriendlyTimeWindowLabel(["2026-06-02T17:00:00", "2026-06-02T19:00:00"])).toBe(
      "2026-06-02 17:00 - 19:00",
    );
  });

  test("renders date range for multi-day all-day windows", () => {
    expect(formatFriendlyTimeWindowLabel(["2026-06-02T00:00:00", "2026-06-04T00:00:00"])).toBe(
      "2026-06-02 - 2026-06-04",
    );
  });

  test("keeps legacy 23:59 all-day windows readable", () => {
    expect(formatFriendlyTimeWindowLabel(["2026-06-02T00:00:00", "2026-06-02T23:59:00"])).toBe(
      "2026-06-02",
    );
  });
});
