import { describe, expect, test } from "vitest";
import type { PRRoute } from "@partner-up-dev/backend";
import { buildDummyPRMaterializationBody } from "./useMaterializeDummyPR";

const route: PRRoute = [
  {
    name: "广州南站",
    full_address: null,
    wgs84: null,
    bd09: null,
    gcj02: [23.0674, 113.2698],
  },
  {
    name: "天河体育中心",
    full_address: null,
    wgs84: null,
    bd09: null,
    gcj02: [23.1405, 113.327],
  },
];

describe("dummy PR materialization query", () => {
  test("submits dummy route scope without full PR fields", () => {
    const body = buildDummyPRMaterializationBody({
      timeWindow: [
        "2038-01-02T12:35:00.000Z",
        "2038-01-02T13:35:00.000Z",
      ],
      place: {
        kind: "route",
        route,
      },
      preferences: ["数学"],
    });

    expect(body).toEqual({
      timeWindow: [
        "2038-01-02T12:35:00.000Z",
        "2038-01-02T13:35:00.000Z",
      ],
      place: {
        kind: "route",
        route,
      },
      preferences: ["数学"],
    });
    expect(body).not.toHaveProperty("fields");
    expect(body).not.toHaveProperty("createSource");
  });

  test("rejects non-concrete dummy time windows before request body creation", () => {
    expect(() =>
      buildDummyPRMaterializationBody({
        timeWindow: [null, "2038-01-02T13:35:00.000Z"],
        place: {
          kind: "location",
          locationId: "大学城体育中心",
        },
        preferences: [],
      }),
    ).toThrow("Dummy PR materialization requires a concrete time window");
  });
});
