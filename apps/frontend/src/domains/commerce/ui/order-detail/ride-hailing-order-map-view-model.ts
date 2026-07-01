import type { MapActiveGeometry, MapCoordinate, MapMarker, MapPolyline } from "@/shared/map/types";

export type RideHailingOrderMapMode =
  | "SEARCHING_ORIGIN"
  | "PICKING_UP"
  | "ARRIVED_AT_PICKUP"
  | "IN_TRIP"
  | "PLANNED_ROUTE";

export type RideHailingMapExecutionPhase =
  | "INITIATING"
  | "DISPATCHING"
  | "ACCEPTED"
  | "ARRIVED_AT_PICKUP"
  | "IN_TRIP"
  | "FINISHED"
  | "CANCELLED"
  | "FAILED";

export type RideHailingOrderMapCoordinateSnapshot = {
  latitude: number;
  longitude: number;
};

export type RideHailingOrderMapRouteSnapshot = {
  origin: RideHailingOrderMapCoordinateSnapshot;
  waypoints: RideHailingOrderMapCoordinateSnapshot[];
  destination: RideHailingOrderMapCoordinateSnapshot;
  drivingPlan?: {
    polyline?: RideHailingOrderMapCoordinateSnapshot[] | null;
  } | null;
};

export type RideHailingOrderMapVehicleLocation = RideHailingOrderMapCoordinateSnapshot & {
  headingDegrees?: number | null;
};

export type RideHailingOrderMapLiveProjection = {
  phase?: string | null;
  vehicleLocation?: RideHailingOrderMapVehicleLocation | null;
  navigationRoute?: {
    routeKind?: string;
    polyline?: readonly RideHailingOrderMapCoordinateSnapshot[] | null;
    vehicleLocation?: RideHailingOrderMapVehicleLocation | null;
  } | null;
} | null;

export type RideHailingOrderMapViewModel = {
  mode: RideHailingOrderMapMode;
  plannedPolyline: MapCoordinate[] | null;
  planRoute: boolean;
  showFallbackPolyline: boolean;
  extraMarkers: MapMarker[];
  extraPolylines: MapPolyline[];
  activeGeometry: MapActiveGeometry;
  overviewGeometry: MapActiveGeometry;
};

const DRIVER_MARKER_ID = "ride-hailing-driver";
const PROVIDER_ROUTE_POLYLINE_ID = "ride-hailing-provider-route";
const PLANNED_FALLBACK_POLYLINE_ID = "ride-hailing-planned-fallback";
const ORIGIN_MARKER_ID = "route-point-0";

const toMapCoordinate = (
  point: RideHailingOrderMapCoordinateSnapshot | null | undefined,
): MapCoordinate | null => {
  if (!point) return null;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
  return {
    lat: point.latitude,
    lng: point.longitude,
  };
};

const toMapPolyline = (
  points: readonly RideHailingOrderMapCoordinateSnapshot[] | null | undefined,
): MapCoordinate[] | null => {
  const path = points
    ?.map(toMapCoordinate)
    .filter((point): point is MapCoordinate => point !== null);
  return path && path.length >= 2 ? path : null;
};

const buildPlannedPolyline = (route: RideHailingOrderMapRouteSnapshot): MapCoordinate[] | null =>
  toMapPolyline(route.drivingPlan?.polyline);

const buildDriverMarker = (
  location: RideHailingOrderMapVehicleLocation | null,
): MapMarker | null => {
  const position = toMapCoordinate(location);
  if (!position) return null;
  const headingDegrees = location?.headingDegrees ?? null;
  return {
    id: DRIVER_MARKER_ID,
    position,
    title: "司机车辆",
    icon: "routeDriver",
    headingDegrees,
    active: true,
  };
};

const buildProviderRoutePolyline = (path: MapCoordinate[] | null): MapPolyline | null =>
  path
    ? {
        id: PROVIDER_ROUTE_POLYLINE_ID,
        path,
        title: "服务商实时路线",
        tone: "secondary",
      }
    : null;

const buildPlannedFallbackPolyline = (path: MapCoordinate[] | null): MapPolyline | null =>
  path
    ? {
        id: PLANNED_FALLBACK_POLYLINE_ID,
        path,
        title: "原始规划路线",
        tone: "tertiary",
      }
    : null;

const buildRideHailingLiveOverviewGeometry = ({
  includeOrigin,
  driverMarker,
  providerRoutePolyline,
}: {
  includeOrigin: boolean;
  driverMarker: MapMarker | null;
  providerRoutePolyline: MapPolyline | null;
}): MapActiveGeometry => {
  const markerIds = [
    ...(includeOrigin ? [ORIGIN_MARKER_ID] : []),
    ...(driverMarker ? [DRIVER_MARKER_ID] : []),
  ];
  const polylineIds = providerRoutePolyline ? [PROVIDER_ROUTE_POLYLINE_ID] : [];

  return markerIds.length > 0 || polylineIds.length > 0
    ? {
        kind: "selection",
        markerIds,
        polylineIds,
      }
    : { kind: "all" };
};

const resolveMode = (phase: RideHailingMapExecutionPhase): RideHailingOrderMapMode => {
  if (phase === "ACCEPTED") return "PICKING_UP";
  if (phase === "ARRIVED_AT_PICKUP") return "ARRIVED_AT_PICKUP";
  if (phase === "IN_TRIP") return "IN_TRIP";
  if (phase === "FINISHED" || phase === "CANCELLED" || phase === "FAILED") {
    return "PLANNED_ROUTE";
  }
  return "SEARCHING_ORIGIN";
};

export function buildRideHailingOrderMapViewModel(input: {
  executionPhase: RideHailingMapExecutionPhase;
  route: RideHailingOrderMapRouteSnapshot;
  live: RideHailingOrderMapLiveProjection;
}): RideHailingOrderMapViewModel {
  const mode = resolveMode(input.executionPhase);
  const plannedPolyline = buildPlannedPolyline(input.route);
  const liveVehicleLocation =
    input.live?.vehicleLocation ?? input.live?.navigationRoute?.vehicleLocation ?? null;
  const driverMarker = buildDriverMarker(liveVehicleLocation);
  const providerRoutePath = toMapPolyline(input.live?.navigationRoute?.polyline);
  const providerRoutePolyline = buildProviderRoutePolyline(providerRoutePath);

  if (mode === "SEARCHING_ORIGIN") {
    return {
      activeGeometry: { kind: "marker", id: ORIGIN_MARKER_ID },
      overviewGeometry: { kind: "marker", id: ORIGIN_MARKER_ID },
      extraMarkers: [],
      extraPolylines: [],
      mode,
      plannedPolyline: null,
      planRoute: false,
      showFallbackPolyline: false,
    };
  }

  if (mode === "PICKING_UP") {
    const hasLiveGeometry = Boolean(providerRoutePolyline || driverMarker);
    return {
      activeGeometry: driverMarker
        ? { kind: "marker", id: DRIVER_MARKER_ID }
        : providerRoutePolyline
          ? { kind: "polyline", id: PROVIDER_ROUTE_POLYLINE_ID }
          : { kind: "all" },
      overviewGeometry: buildRideHailingLiveOverviewGeometry({
        includeOrigin: true,
        driverMarker,
        providerRoutePolyline,
      }),
      extraMarkers: driverMarker ? [driverMarker] : [],
      extraPolylines: providerRoutePolyline ? [providerRoutePolyline] : [],
      mode,
      plannedPolyline: hasLiveGeometry ? null : plannedPolyline,
      planRoute: !hasLiveGeometry,
      showFallbackPolyline: !hasLiveGeometry,
    };
  }

  if (mode === "ARRIVED_AT_PICKUP") {
    return {
      activeGeometry: driverMarker
        ? { kind: "marker", id: DRIVER_MARKER_ID }
        : { kind: "marker", id: ORIGIN_MARKER_ID },
      overviewGeometry: driverMarker
        ? {
            kind: "selection",
            markerIds: [ORIGIN_MARKER_ID, DRIVER_MARKER_ID],
          }
        : { kind: "marker", id: ORIGIN_MARKER_ID },
      extraMarkers: driverMarker ? [driverMarker] : [],
      extraPolylines: [],
      mode,
      plannedPolyline: null,
      planRoute: false,
      showFallbackPolyline: false,
    };
  }

  if (mode === "IN_TRIP") {
    const plannedFallback = providerRoutePolyline
      ? null
      : buildPlannedFallbackPolyline(plannedPolyline);
    return {
      activeGeometry: driverMarker
        ? { kind: "marker", id: DRIVER_MARKER_ID }
        : providerRoutePolyline
          ? { kind: "polyline", id: PROVIDER_ROUTE_POLYLINE_ID }
          : { kind: "all" },
      overviewGeometry: { kind: "all" },
      extraMarkers: driverMarker ? [driverMarker] : [],
      extraPolylines: [
        ...(plannedFallback ? [plannedFallback] : []),
        ...(providerRoutePolyline ? [providerRoutePolyline] : []),
      ],
      mode,
      plannedPolyline: providerRoutePolyline || driverMarker ? null : plannedPolyline,
      planRoute: !providerRoutePolyline && !driverMarker,
      showFallbackPolyline: !providerRoutePolyline && !driverMarker,
    };
  }

  return {
    activeGeometry: { kind: "all" },
    overviewGeometry: { kind: "all" },
    extraMarkers: [],
    extraPolylines: [],
    mode,
    plannedPolyline,
    planRoute: true,
    showFallbackPolyline: true,
  };
}
