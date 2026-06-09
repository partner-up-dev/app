import { describe, expect, test } from "vitest";
import type { PRRoute } from "@partner-up-dev/backend";
import {
  areRoutesOppositeDirections,
  buildCreateTimeWindowPlaceOptions,
  buildFormModePlaceOptions,
  buildLocationPlaceOptionId,
  buildRoutePlaceOptionId,
  buildRoutePlaceOptionGroups,
  getExclusiveCreateTimeWindowLocationOptions,
  getFirstEnabledPlaceOption,
  hasEnabledCreateTimeWindowPlaceOption,
  type AnchorEventRoutePlaceOption,
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

const reversedRoute: PRRoute = [route[1]!, route[0]!].map((point) => ({
  ...point,
}));

const routeOption = (
  routePoolEntryId: string,
  optionRoute: PRRoute,
): AnchorEventRoutePlaceOption => ({
  kind: "route",
  id: buildRoutePlaceOptionId(routePoolEntryId),
  routePoolEntryId,
  label: routePoolEntryId,
  route: optionRoute,
  remainingQuota: null,
  disabled: false,
  disabledReason: "NONE",
});

describe("anchor event place options", () => {
  test("recognizes opposite route directions", () => {
    expect(areRoutesOppositeDirections(route, reversedRoute)).toBe(true);
    expect(areRoutesOppositeDirections(route, route)).toBe(false);
  });

  test("groups opposite route-pool directions into one display group", () => {
    const groups = buildRoutePlaceOptionGroups([
      routeOption("route-a-b", route),
      routeOption("route-b-a", reversedRoute),
      routeOption("route-c-d", [
        {
          ...route[0]!,
          name: "天河体育中心",
        },
        {
          ...route[1]!,
          name: "广州东站",
        },
      ]),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.variants.map((option) => option.routePoolEntryId))
      .toEqual(["route-a-b", "route-b-a"]);
    expect(groups[1]?.variants.map((option) => option.routePoolEntryId))
      .toEqual(["route-c-d"]);
  });

  test("does not group routes that are not full reverse paths", () => {
    const firstRoute: PRRoute = [
      route[0]!,
      {
        ...route[0]!,
        name: "花城广场",
      },
      route[1]!,
    ];
    const secondRoute: PRRoute = [
      route[1]!,
      {
        ...route[0]!,
        name: "珠江新城",
      },
      route[0]!,
    ];

    const groups = buildRoutePlaceOptionGroups([
      routeOption("route-a-c-b", firstRoute),
      routeOption("route-b-d-a", secondRoute),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.variants)).toHaveLength(2);
    expect(groups.every((group) => group.variants.length === 1)).toBe(true);
  });

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

  test("route selector option labels keep full endpoint names", () => {
    const longRoute: PRRoute = [
      {
        ...route[0],
        name: "广东外语外贸大学大学城校区北门",
      },
      route[1],
      {
        ...route[route.length - 1]!,
        name: "广州南站西广场网约车上车点",
      },
    ];
    const options = buildCreateTimeWindowPlaceOptions({
      placeSelector: null,
      locationOptions: [],
      routeOptions: [
        {
          routePoolEntryId: "long-route",
          route: longRoute,
          disabled: false,
          disabledReason: "NONE",
        },
      ],
      poiByName: new Map(),
    });

    expect(options[0]).toMatchObject({
      kind: "route",
      label: "广东外语外贸大学大学城校区北门~广州南站西广场网约车上车点",
    });
    expect(options[0]?.label.length).toBeGreaterThan(16);
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
