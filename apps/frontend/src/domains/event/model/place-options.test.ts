import { describe, expect, test } from "vitest";
import type { PRRoute } from "@partner-up-dev/backend";
import {
  buildCreateTimeWindowPlaceOptions,
  buildFormModePlaceOptions,
  buildLocationPlaceOptionId,
  buildRoutePlaceOptionId,
  getExclusiveCreateTimeWindowLocationOptions,
  getFirstEnabledPlaceOption,
  hasEnabledCreateTimeWindowPlaceOption,
  toAnchorEventSelectedPlace,
} from "./place-options";

const route: PRRoute = [
  {
    name: "广州塔东广场",
    full_address: null,
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

describe("anchor event place options", () => {
  test("buildFormModePlaceOptions treats route pool as exclusive when routes exist", () => {
    const options = buildFormModePlaceOptions({
      placeSelector: null,
      locations: [
        {
          id: "天河体育中心",
          gallery: ["https://example.test/a.jpg"],
          availableStartKeys: ["slot-a"],
        },
      ],
      routes: [
        {
          id: "route-a",
          route,
          availableStartKeys: ["slot-b"],
        },
      ],
    });

    expect(options.map((option) => option.id)).toEqual([
      buildRoutePlaceOptionId("route-a"),
    ]);
    expect(options[0]).toMatchObject({
      kind: "route",
      routePoolEntryId: "route-a",
      label: "广州塔东广场~体育西路地铁站",
      availableStartKeys: ["slot-b"],
    });
  });

  test("buildFormModePlaceOptions returns locations when no routes exist", () => {
    const options = buildFormModePlaceOptions({
      placeSelector: null,
      locations: [
        {
          id: "天河体育中心",
          gallery: ["https://example.test/a.jpg"],
          availableStartKeys: ["slot-a"],
        },
      ],
      routes: [],
    });

    expect(options.map((option) => option.id)).toEqual([
      buildLocationPlaceOptionId("天河体育中心"),
    ]);
  });

  test("buildFormModePlaceOptions honors backend-owned place selector", () => {
    const options = buildFormModePlaceOptions({
      placeSelector: {
        kind: "route" as const,
        labelKey: "anchorEvent.placeSelector.routeLabel",
        placeholderKey: "anchorEvent.placeSelector.routePlaceholder",
        ariaLabelKey: "anchorEvent.placeSelector.routeAriaLabel",
        applyActionKey: "anchorEvent.placeSelector.applyRoute",
        options: [
          {
            kind: "route" as const,
            id: buildRoutePlaceOptionId("backend-route"),
            routePoolEntryId: "backend-route",
            label: "后端路线",
            route,
            remainingQuota: null,
            disabled: false,
            disabledReason: "NONE" as const,
          },
        ],
      },
      locations: [
        {
          id: "天河体育中心",
          gallery: ["https://example.test/a.jpg"],
          availableStartKeys: ["slot-a"],
        },
      ],
      routes: [],
    });

    expect(options.map((option) => option.id)).toEqual([
      buildRoutePlaceOptionId("backend-route"),
    ]);
    expect(options[0]).toMatchObject({
      kind: "route",
      label: "后端路线",
    });
  });

  test("buildCreateTimeWindowPlaceOptions returns location coordinates when no route options exist", () => {
    const options = buildCreateTimeWindowPlaceOptions({
      locationOptions: [
        {
          locationId: "珠江新城",
          remainingQuota: 2,
          disabled: false,
          disabledReason: "NONE",
        },
      ],
      routeOptions: [],
      poiByName: new Map([
        [
          "珠江新城",
          {
            name: "珠江新城",
            gallery: ["https://example.test/b.jpg"],
            gcj02: [23.12005, 113.32331],
          },
        ],
      ]),
    });

    expect(options[0]).toMatchObject({
      kind: "location",
      label: "珠江新城",
      coordinate: {
        lat: 23.12005,
        lng: 113.32331,
      },
      remainingQuota: 2,
    });
    expect(toAnchorEventSelectedPlace(options[0])).toEqual({
      kind: "location",
      locationId: "珠江新城",
    });
  });

  test("buildCreateTimeWindowPlaceOptions treats route options as exclusive", () => {
    const options = buildCreateTimeWindowPlaceOptions({
      placeSelector: null,
      locationOptions: [
        {
          locationId: "珠江新城",
          remainingQuota: 2,
          disabled: false,
          disabledReason: "NONE",
        },
      ],
      routeOptions: [
        {
          routePoolEntryId: "route-a",
          route,
          disabled: false,
          disabledReason: "NONE",
        },
      ],
      poiByName: new Map(),
    });

    expect(options).toHaveLength(1);
    expect(getFirstEnabledPlaceOption(options)?.id).toBe(
      buildRoutePlaceOptionId("route-a"),
    );
    expect(toAnchorEventSelectedPlace(options[0])).toEqual({
      kind: "route",
      routePoolEntryId: "route-a",
      route,
    });
  });

  test("backend-owned create place selector decides active kind", () => {
    const input = {
      placeSelector: {
        kind: "location" as const,
        labelKey: "anchorEvent.placeSelector.locationLabel",
        placeholderKey: "anchorEvent.placeSelector.locationPlaceholder",
        ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel",
        applyActionKey: "anchorEvent.placeSelector.applyLocation",
        options: [
          {
            kind: "location" as const,
            id: buildLocationPlaceOptionId("珠江新城"),
            locationId: "珠江新城",
            label: "珠江新城",
            gallery: [],
            coordinate: null,
            remainingQuota: 1,
            disabled: false,
            disabledReason: "NONE" as const,
          },
        ],
      },
      locationOptions: [],
      routeOptions: [
        {
          routePoolEntryId: "route-a",
          route,
          disabled: false,
          disabledReason: "NONE" as const,
        },
      ],
    };

    expect(buildCreateTimeWindowPlaceOptions({ ...input, poiByName: new Map() }))
      .toMatchObject([
        {
          kind: "location",
          locationId: "珠江新城",
        },
      ]);
    expect(getExclusiveCreateTimeWindowLocationOptions(input)).toEqual([
      {
        locationId: "珠江新城",
        remainingQuota: 1,
        disabled: false,
        disabledReason: "NONE",
      },
    ]);
    expect(hasEnabledCreateTimeWindowPlaceOption(input)).toBe(true);
  });

  test("disabled route pool does not fall back to location options", () => {
    const input = {
      placeSelector: null,
      locationOptions: [
        {
          locationId: "珠江新城",
          remainingQuota: 2,
          disabled: false,
          disabledReason: "NONE" as const,
        },
      ],
      routeOptions: [
        {
          routePoolEntryId: "route-a",
          route,
          disabled: true,
          disabledReason: "TIME_UNAVAILABLE" as const,
        },
      ],
    };
    const options = buildCreateTimeWindowPlaceOptions({
      ...input,
      poiByName: new Map(),
    });

    expect(options).toHaveLength(1);
    expect(getExclusiveCreateTimeWindowLocationOptions(input)).toEqual([]);
    expect(hasEnabledCreateTimeWindowPlaceOption(input)).toBe(false);
    expect(toAnchorEventSelectedPlace(options[0])).toBeNull();
  });
});
