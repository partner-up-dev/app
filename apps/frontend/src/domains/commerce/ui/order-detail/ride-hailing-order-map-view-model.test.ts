import { describe, expect, test } from "vitest";
import {
  buildRideHailingOrderMapViewModel,
  type RideHailingOrderMapRouteSnapshot,
} from "./ride-hailing-order-map-view-model";

const route = (): RideHailingOrderMapRouteSnapshot => ({
  origin: {
    latitude: 30.2912,
    longitude: 120.212,
  },
  waypoints: [],
  destination: {
    latitude: 30.24,
    longitude: 120.102,
  },
  drivingPlan: {
    polyline: [
      { latitude: 30.2912, longitude: 120.212 },
      { latitude: 30.27, longitude: 120.16 },
      { latitude: 30.24, longitude: 120.102 },
    ],
  },
});

describe("buildRideHailingOrderMapViewModel", () => {
  test("centers origin while dispatching", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "DISPATCHING",
      live: null,
      route: route(),
    });

    expect(viewModel.mode).toBe("SEARCHING_ORIGIN");
    expect(viewModel.activeGeometry).toEqual({
      kind: "marker",
      id: "route-point-0",
    });
    expect(viewModel.plannedPolyline).toBeNull();
    expect(viewModel.planRoute).toBe(false);
    expect(viewModel.showFallbackPolyline).toBe(false);
  });

  test("uses provider pickup route and driver marker after acceptance", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "ACCEPTED",
      route: route(),
      live: {
        vehicleLocation: {
          headingDegrees: 90,
          latitude: 30.286,
          longitude: 120.19,
        },
        navigationRoute: {
          routeKind: "PICKUP",
          polyline: [
            { latitude: 30.286, longitude: 120.19 },
            { latitude: 30.2871, longitude: 120.197 },
            { latitude: 30.2893, longitude: 120.203 },
            { latitude: 30.2912, longitude: 120.212 },
          ],
        },
      },
    });

    expect(viewModel.mode).toBe("PICKING_UP");
    expect(viewModel.activeGeometry).toEqual({
      kind: "polyline",
      id: "ride-hailing-provider-route",
    });
    expect(viewModel.extraMarkers).toHaveLength(1);
    expect(viewModel.extraMarkers[0]?.icon).toBe("routeDriver");
    expect(viewModel.extraMarkers[0]?.headingDegrees).toBe(90);
    expect(viewModel.extraPolylines).toHaveLength(1);
    expect(viewModel.extraPolylines[0]?.path).toEqual([
      { lat: 30.286, lng: 120.19 },
      { lat: 30.2871, lng: 120.197 },
      { lat: 30.2893, lng: 120.203 },
      { lat: 30.2912, lng: 120.212 },
    ]);
    expect(viewModel.plannedPolyline).toBeNull();
  });

  test("does not use provider live phase while local phase is still dispatching", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "DISPATCHING",
      route: route(),
      live: {
        phase: "ACCEPTED",
        vehicleLocation: {
          latitude: 30.286,
          longitude: 120.19,
        },
      },
    });

    expect(viewModel.mode).toBe("SEARCHING_ORIGIN");
    expect(viewModel.activeGeometry).toEqual({
      kind: "marker",
      id: "route-point-0",
    });
    expect(viewModel.extraMarkers).toEqual([]);
    expect(viewModel.extraPolylines).toEqual([]);
  });

  test("shows only driver marker when the driver has arrived at pickup", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "ARRIVED_AT_PICKUP",
      route: route(),
      live: {
        vehicleLocation: {
          latitude: 30.2912,
          longitude: 120.212,
        },
        navigationRoute: {
          routeKind: "WAITING",
          polyline: [
            { latitude: 30.2912, longitude: 120.212 },
            { latitude: 30.24, longitude: 120.102 },
          ],
        },
      },
    });

    expect(viewModel.mode).toBe("ARRIVED_AT_PICKUP");
    expect(viewModel.activeGeometry).toEqual({
      kind: "marker",
      id: "ride-hailing-driver",
    });
    expect(viewModel.extraMarkers).toHaveLength(1);
    expect(viewModel.extraPolylines).toEqual([]);
    expect(viewModel.plannedPolyline).toBeNull();
  });

  test("uses muted planned route fallback during trip when provider route is missing", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "IN_TRIP",
      route: route(),
      live: {
        vehicleLocation: {
          latitude: 30.27,
          longitude: 120.16,
        },
        navigationRoute: null,
      },
    });

    expect(viewModel.mode).toBe("IN_TRIP");
    expect(viewModel.activeGeometry).toEqual({
      kind: "marker",
      id: "ride-hailing-driver",
    });
    expect(viewModel.extraMarkers).toHaveLength(1);
    expect(viewModel.extraPolylines).toEqual([
      {
        id: "ride-hailing-planned-fallback",
        path: [
          { lat: 30.2912, lng: 120.212 },
          { lat: 30.27, lng: 120.16 },
          { lat: 30.24, lng: 120.102 },
        ],
        title: "原始规划路线",
        tone: "muted",
      },
    ]);
    expect(viewModel.plannedPolyline).toBeNull();
  });

  test("keeps planned route for terminal phases", () => {
    const viewModel = buildRideHailingOrderMapViewModel({
      executionPhase: "FINISHED",
      live: null,
      route: route(),
    });

    expect(viewModel.mode).toBe("PLANNED_ROUTE");
    expect(viewModel.activeGeometry).toEqual({ kind: "all" });
    expect(viewModel.extraMarkers).toEqual([]);
    expect(viewModel.extraPolylines).toEqual([]);
    expect(viewModel.plannedPolyline).toEqual([
      { lat: 30.2912, lng: 120.212 },
      { lat: 30.27, lng: 120.16 },
      { lat: 30.24, lng: 120.102 },
    ]);
    expect(viewModel.planRoute).toBe(true);
  });
});
