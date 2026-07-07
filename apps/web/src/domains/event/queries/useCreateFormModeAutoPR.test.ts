import { describe, expect, test } from "vitest";
import type { PRAllowEditAfterReady, PRRoute } from "@partner-up-dev/backend";
import { buildFormModeAutoCreateBody } from "./useCreateFormModeAutoPR";

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

describe("Form Mode auto PR create query", () => {
  test("submits auto-create route scope without user-owned structured fields", () => {
    const allowEditAfterReady: PRAllowEditAfterReady = {
      timeWindow: ["2038-01-01T16:00:00.000Z", "2038-01-02T16:00:00.000Z"],
    };
    const body = buildFormModeAutoCreateBody({
      timeWindow: ["2038-01-02T12:35:00.000Z", "2038-01-02T13:35:00.000Z"],
      place: {
        kind: "route",
        route,
      },
      preferences: ["安静", "新手友好"],
      allowEditAfterReady,
    });

    expect(body).toEqual({
      timeWindow: ["2038-01-02T12:35:00.000Z", "2038-01-02T13:35:00.000Z"],
      place: {
        kind: "route",
        route,
      },
      preferences: ["安静", "新手友好"],
      allowEditAfterReady,
    });
    expect(body).not.toHaveProperty("fields");
    expect(body).not.toHaveProperty("createSource");
  });

  test("rejects non-concrete auto-create time windows before request body creation", () => {
    expect(() =>
      buildFormModeAutoCreateBody({
        timeWindow: [null, "2038-01-02T13:35:00.000Z"],
        place: {
          kind: "location",
          locationId: "大学城体育中心",
        },
        preferences: [],
      }),
    ).toThrow("Form Mode auto create requires a concrete time window");
  });
});
