import { describe, expect, test } from "vitest";
import { parsePickedLocation, serializePickedLocation } from "./location-picker";

describe("location picker helpers", () => {
  test("picked location serialization keeps a validated payload", () => {
    const serialized = serializePickedLocation({
      name: "广州塔",
      address: null,
      cityName: "广州市",
      gcj02: [23.10647, 113.32446],
    });

    expect(parsePickedLocation(serialized)).toEqual({
      name: "广州塔",
      address: null,
      cityName: "广州市",
      gcj02: [23.10647, 113.32446],
    });
    expect(parsePickedLocation("{}")).toBeNull();
  });
});
