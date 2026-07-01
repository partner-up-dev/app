import { describe, expect, test } from "vitest";
import {
  instantToLocalDateTimeInputParts,
  localDateTimeInputPartsToInstant,
} from "./localDateTimeInput";

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toExpectedLocalParts = (value: string) => {
  const date = new Date(value);
  return {
    date: [date.getFullYear(), pad2(date.getMonth() + 1), pad2(date.getDate())].join("-"),
    time: [pad2(date.getHours()), pad2(date.getMinutes())].join(":"),
  };
};

describe("local date-time input adapters", () => {
  test("deserializes instants through local Date instead of string splitting", () => {
    const instant = "2026-06-26T16:00:00.000Z";

    expect(instantToLocalDateTimeInputParts(instant)).toEqual(toExpectedLocalParts(instant));
  });

  test("serializes local input parts to canonical ISO instants", () => {
    expect(localDateTimeInputPartsToInstant("2026-06-27", "00:00")).toBe(
      new Date(2026, 5, 27, 0, 0, 0, 0).toISOString(),
    );
  });

  test("uses local midnight when time is omitted", () => {
    expect(localDateTimeInputPartsToInstant("2026-06-27", null)).toBe(
      new Date(2026, 5, 27, 0, 0, 0, 0).toISOString(),
    );
  });
});
