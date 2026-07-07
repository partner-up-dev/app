import { describe, expect, test } from "vitest";
import type { PRRoute } from "@partner-up-dev/backend";
import { normalizePRRouteForSubmit } from "./pr-route";
import { toPartnerRequestFields, type PRFormFields } from "./types";

const route: PRRoute = [
  {
    name: "广州塔东广场",
    full_address: "  广州市海珠区  ",
    gcj02: [23.10647, 113.32446],
    wgs84: null,
    bd09: null,
  },
  {
    name: "体育西路地铁站",
    full_address: null,
    gcj02: [23.13402, 113.32172],
    wgs84: null,
    bd09: null,
  },
];

describe("PR route payload mapping", () => {
  test("partner request submit fields clear inactive place mode", () => {
    const baseFields: PRFormFields = {
      title: undefined,
      type: "徒步",
      time: [null, null],
      location: "广州塔",
      route: null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
    };

    expect(toPartnerRequestFields(baseFields).location).toBe("广州塔");
    expect(toPartnerRequestFields(baseFields).route).toBeNull();

    const routeFields = {
      ...baseFields,
      location: "广州塔",
      route,
    };
    expect(toPartnerRequestFields(routeFields).location).toBeNull();
    expect(toPartnerRequestFields(routeFields).route).toEqual(
      normalizePRRouteForSubmit(route),
    );
  });
});
