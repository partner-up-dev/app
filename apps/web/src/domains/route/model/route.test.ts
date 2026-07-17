import { describe, expect, test } from "vitest";
import type { Route } from "./route";
import {
  buildRouteEndpointLabel,
  buildRouteSummary,
  cloneRoute,
  createEmptyRouteDraft,
  getRouteValidationIssue,
  insertRouteWaypoint,
  normalizeRouteForSubmit,
  pickRoutePointCoordinate,
  removeRoutePointAt,
  resolveRoutePointRole,
  swapRoutePointWithNeighbor,
  toRouteMapProjection,
} from "./route";

const route: Route = [
  {
    name: "广州塔东广场",
    full_address: "  广州市海珠区  ",
    gcj02: [23.10647, 113.32446],
    wgs84: null,
    bd09: null,
  },
  {
    name: "花城广场",
    full_address: null,
    gcj02: [23.12005, 113.32331],
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

describe("route helpers", () => {
  test("buildRouteSummary truncates endpoint names within total limit", () => {
    expect(buildRouteSummary(route)).toBe("广州塔东广场~体育西路地铁站");
    expect(buildRouteSummary(route, 7)).toHaveLength(7);
    expect(buildRouteSummary(route, 7)).toBe("广州塔~体育西");
  });

  test("buildRouteEndpointLabel keeps full endpoint names", () => {
    const longRoute: Route = [
      {
        ...route[0],
        name: "广东外语外贸大学大学城校区北门",
      },
      route[1],
      {
        ...route[2],
        name: "广州南站西广场网约车上车点",
      },
    ];

    expect(buildRouteEndpointLabel(longRoute)).toBe(
      "广东外语外贸大学大学城校区北门~广州南站西广场网约车上车点",
    );
    expect(buildRouteEndpointLabel(longRoute)?.length).toBeGreaterThan(16);
  });

  test("clone and normalize route preserve coordinate tuples without shared references", () => {
    const cloned = cloneRoute(route);
    expect(cloned).toEqual(route);
    expect(cloned?.[0]).not.toBe(route[0]);
    expect(cloned?.[0]?.gcj02).not.toBe(route[0].gcj02);

    const normalized = normalizeRouteForSubmit(route);
    expect(normalized?.[0]?.full_address).toBe("广州市海珠区");
  });

  test("route draft insertion and removal keep endpoint roles stable", () => {
    const draft = createEmptyRouteDraft();
    const withWaypoint = insertRouteWaypoint(draft);
    expect(withWaypoint).toHaveLength(3);
    expect(resolveRoutePointRole(0, withWaypoint.length)).toBe("departure");
    expect(resolveRoutePointRole(1, withWaypoint.length)).toBe("waypoint");
    expect(resolveRoutePointRole(2, withWaypoint.length)).toBe("arrival");

    expect(removeRoutePointAt(withWaypoint, 0)).toHaveLength(3);
    expect(removeRoutePointAt(withWaypoint, 1)).toHaveLength(2);
  });

  test("route point swap moves a point to the adjacent slot", () => {
    expect(
      swapRoutePointWithNeighbor({
        route,
        index: 1,
        direction: "up",
      }).map((point) => point.name),
    ).toEqual(["花城广场", "广州塔东广场", "体育西路地铁站"]);

    expect(
      swapRoutePointWithNeighbor({
        route,
        index: 1,
        direction: "down",
      }).map((point) => point.name),
    ).toEqual(["广州塔东广场", "体育西路地铁站", "花城广场"]);

    expect(
      swapRoutePointWithNeighbor({
        route,
        index: 0,
        direction: "up",
      }),
    ).toEqual(route);
  });

  test("map projection prefers gcj02 and builds marker/polyline geometry", () => {
    expect(pickRoutePointCoordinate(route[0])).toEqual({
      lat: 23.10647,
      lng: 113.32446,
    });

    const projection = toRouteMapProjection(route);
    expect(projection.markers.map((marker) => marker.id)).toEqual([
      "route-point-0",
      "route-point-1",
      "route-point-2",
    ]);
    expect(projection.polylines[0]?.path).toHaveLength(3);
  });

  test("route validation reports first blocking route issue", () => {
    expect(getRouteValidationIssue(null)).toBe("min-points");
    expect(getRouteValidationIssue(createEmptyRouteDraft())).toBe("name-required");
    expect(getRouteValidationIssue([{ ...route[0], gcj02: null }, route[1]])).toBe(
      "coordinate-required",
    );
    expect(getRouteValidationIssue(route)).toBeNull();
  });
});
