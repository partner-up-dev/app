import type {
  MapCoordinate,
  MapMarker,
  MapPolyline,
} from "@/shared/map/types";

export type RouteCoordinate = [number, number];

export type RoutePoint = {
  wgs84: RouteCoordinate | null;
  bd09: RouteCoordinate | null;
  gcj02: RouteCoordinate | null;
  name: string;
  full_address: string | null;
};

export type Route = RoutePoint[];

export type RoutePointRole = "departure" | "waypoint" | "arrival";
export type RouteValidationIssue =
  | "min-points"
  | "name-required"
  | "coordinate-required";

export type PickedRoutePointLocation = {
  name: string;
  address: string | null;
  gcj02: RouteCoordinate;
};

const ROUTE_SUMMARY_SEPARATOR = "~";
const DEFAULT_ROUTE_SUMMARY_MAX_LENGTH = 16;

export const createEmptyRoutePoint = (): RoutePoint => ({
  wgs84: null,
  bd09: null,
  gcj02: null,
  name: "",
  full_address: null,
});

export const createEmptyRouteDraft = (): Route => [
  createEmptyRoutePoint(),
  createEmptyRoutePoint(),
];

const cloneCoordinate = (
  coordinate: RouteCoordinate | null,
): RouteCoordinate | null =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

export const cloneRoutePoint = (point: RoutePoint): RoutePoint => ({
  wgs84: cloneCoordinate(point.wgs84),
  bd09: cloneCoordinate(point.bd09),
  gcj02: cloneCoordinate(point.gcj02),
  name: point.name,
  full_address: point.full_address,
});

export const cloneRoute = (route: Route | null | undefined): Route | null =>
  route ? route.map(cloneRoutePoint) : null;

export const resolveRoutePointRole = (
  index: number,
  total: number,
): RoutePointRole => {
  if (index === 0) {
    return "departure";
  }

  if (index === total - 1) {
    return "arrival";
  }

  return "waypoint";
};

const normalizeRoutePointText = (value: string | null | undefined): string =>
  value?.trim() ?? "";

const truncateText = (value: string, maxLength: number): string =>
  Array.from(value).slice(0, Math.max(0, maxLength)).join("");

export const buildRouteSummary = (
  route: Route | null | undefined,
  maxLength = DEFAULT_ROUTE_SUMMARY_MAX_LENGTH,
): string | null => {
  const first = route?.[0];
  const last = route?.[route.length - 1];
  const startName = normalizeRoutePointText(first?.name);
  const endName = normalizeRoutePointText(last?.name);
  if (!startName || !endName || maxLength <= ROUTE_SUMMARY_SEPARATOR.length) {
    return null;
  }

  const availableLength = maxLength - ROUTE_SUMMARY_SEPARATOR.length;
  let startLimit = Math.floor(availableLength / 2);
  let endLimit = availableLength - startLimit;
  const startLength = Array.from(startName).length;
  const endLength = Array.from(endName).length;

  if (startLength < startLimit) {
    endLimit += startLimit - startLength;
    startLimit = startLength;
  }
  if (endLength < endLimit) {
    startLimit += endLimit - endLength;
    endLimit = endLength;
  }

  return [
    truncateText(startName, startLimit),
    truncateText(endName, endLimit),
  ].join(ROUTE_SUMMARY_SEPARATOR);
};

export const pickRoutePointCoordinate = (
  point: RoutePoint,
): MapCoordinate | null => {
  const coordinate = point.gcj02 ?? point.wgs84 ?? point.bd09;
  if (!coordinate) {
    return null;
  }

  const [lat, lng] = coordinate;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

export const hasRoutePointCoordinate = (point: RoutePoint): boolean =>
  pickRoutePointCoordinate(point) !== null;

export const getRouteValidationIssue = (
  route: Route | null | undefined,
): RouteValidationIssue | null => {
  if (!route || route.length < 2) {
    return "min-points";
  }

  if (route.some((point) => point.name.trim().length === 0)) {
    return "name-required";
  }

  if (route.some((point) => !hasRoutePointCoordinate(point))) {
    return "coordinate-required";
  }

  return null;
};

export const normalizeRouteForSubmit = (
  route: Route | null | undefined,
): Route | null => {
  if (!route) {
    return null;
  }

  return route.map((point) => {
    const fullAddress = point.full_address?.trim() ?? "";
    return {
      wgs84: cloneCoordinate(point.wgs84),
      bd09: cloneCoordinate(point.bd09),
      gcj02: cloneCoordinate(point.gcj02),
      name: point.name.trim(),
      full_address: fullAddress.length > 0 ? fullAddress : null,
    };
  });
};

export const insertRouteWaypoint = (
  route: Route | null | undefined,
): Route => {
  const draft = cloneRoute(route) ?? createEmptyRouteDraft();
  const waypoint = createEmptyRoutePoint();
  return [...draft.slice(0, -1), waypoint, draft[draft.length - 1]];
};

export const removeRoutePointAt = (
  route: Route,
  index: number,
): Route => {
  const role = resolveRoutePointRole(index, route.length);
  if (role !== "waypoint") {
    return cloneRoute(route) ?? createEmptyRouteDraft();
  }

  return route.filter((_, routeIndex) => routeIndex !== index).map(cloneRoutePoint);
};

export const swapRoutePointWithNeighbor = ({
  route,
  index,
  direction,
}: {
  route: Route;
  index: number;
  direction: "up" | "down";
}): Route => {
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (
    index < 0 ||
    index >= route.length ||
    nextIndex < 0 ||
    nextIndex >= route.length
  ) {
    return cloneRoute(route) ?? createEmptyRouteDraft();
  }

  const nextRoute = route.map(cloneRoutePoint);
  const currentPoint = nextRoute[index];
  const nextPoint = nextRoute[nextIndex];
  if (!currentPoint || !nextPoint) {
    return cloneRoute(route) ?? createEmptyRouteDraft();
  }

  nextRoute[index] = nextPoint;
  nextRoute[nextIndex] = currentPoint;
  return nextRoute;
};

export const replaceRoutePointAt = ({
  route,
  index,
  point,
}: {
  route: Route;
  index: number;
  point: RoutePoint;
}): Route =>
  route.map((current, routeIndex) =>
    routeIndex === index ? cloneRoutePoint(point) : cloneRoutePoint(current),
  );

export const applyPickedLocationToRoutePoint = ({
  point,
  location,
}: {
  point: RoutePoint;
  location: PickedRoutePointLocation;
}): RoutePoint => ({
  ...cloneRoutePoint(point),
  name: location.name,
  full_address: location.address,
  gcj02: [location.gcj02[0], location.gcj02[1]],
});

export const toRouteMapProjection = (
  route: Route | null | undefined,
): {
  markers: MapMarker[];
  polylines: MapPolyline[];
} => {
  if (!route) {
    return {
      markers: [],
      polylines: [],
    };
  }

  const markers = route.flatMap((point, index): MapMarker[] => {
    const position = pickRoutePointCoordinate(point);
    if (!position) {
      return [];
    }

    const role = resolveRoutePointRole(index, route.length);
    return [
      {
        id: `route-point-${index}`,
        position,
        title: point.name,
        icon:
          role === "departure"
            ? "routeStart"
            : role === "arrival"
              ? "routeEnd"
              : "routeWaypoint",
      },
    ];
  });

  const path = route
    .map(pickRoutePointCoordinate)
    .filter((coordinate): coordinate is MapCoordinate => coordinate !== null);

  return {
    markers,
    polylines:
      path.length >= 2
        ? [
            {
              id: "route",
              path,
              title: buildRouteSummary(route) ?? undefined,
              tone: "routeInvalid",
            },
          ]
        : [],
  };
};
