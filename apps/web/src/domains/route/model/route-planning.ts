import type { MapCoordinate } from "@/shared/map/types";
import type { Route } from "@/domains/route/model/route";
import { pickRoutePointCoordinate } from "@/domains/route/model/route";

const TENCENT_DRIVING_DIRECTION_ENDPOINT = "https://apis.map.qq.com/ws/direction/v1/driving/";

export type TencentDrivingRoutePlan = {
  id: string;
  distance: number | null;
  duration: number | null;
  polyline: MapCoordinate[];
  waypoints: Array<{
    title: string | null;
    location: MapCoordinate;
    polylineIndex: number | null;
  }>;
};

export class TencentDirectionPlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TencentDirectionPlanningError";
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

let jsonpRequestCounter = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asFiniteNumber = (value: unknown): number | null => {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const formatCoordinate = (coordinate: MapCoordinate): string =>
  `${coordinate.lat},${coordinate.lng}`;

export const decompressTencentDirectionPolyline = (raw: readonly number[]): MapCoordinate[] => {
  const points = raw.map((value) => Number(value));
  if (points.length < 2 || points.some((value) => !Number.isFinite(value))) {
    return [];
  }

  for (let index = 2; index < points.length; index += 1) {
    points[index] = Number(points[index - 2]) + Number(points[index]) / 1_000_000;
  }

  const coordinates: MapCoordinate[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    coordinates.push({
      lat: points[index],
      lng: points[index + 1],
    });
  }
  return coordinates;
};

export const buildTencentDrivingDirectionUrl = ({
  route,
  apiKey,
  endpoint = TENCENT_DRIVING_DIRECTION_ENDPOINT,
}: {
  route: Route | null | undefined;
  apiKey: string;
  endpoint?: string;
}): string | null => {
  const trimmedKey = apiKey.trim();
  if (!route || route.length < 2 || trimmedKey.length === 0) {
    return null;
  }

  const coordinates = route.map(pickRoutePointCoordinate);
  const departure = coordinates[0];
  const arrival = coordinates[coordinates.length - 1];
  if (!departure || !arrival) {
    return null;
  }

  const waypointCoordinates = coordinates.slice(1, -1);
  if (waypointCoordinates.some((coordinate) => coordinate === null)) {
    return null;
  }

  const url = new URL(endpoint);
  url.searchParams.set("from", formatCoordinate(departure));
  url.searchParams.set("to", formatCoordinate(arrival));
  url.searchParams.set("output", "json");
  url.searchParams.set("no_step", "1");
  url.searchParams.set("key", trimmedKey);

  const waypoints = waypointCoordinates
    .filter((coordinate): coordinate is MapCoordinate => coordinate !== null)
    .map(formatCoordinate)
    .join(";");
  if (waypoints.length > 0) {
    url.searchParams.set("waypoints", waypoints);
  }

  return url.toString();
};

const parseWaypoint = (value: unknown): TencentDrivingRoutePlan["waypoints"][number] | null => {
  if (!isRecord(value) || !isRecord(value.location)) {
    return null;
  }

  const lat = asFiniteNumber(value.location.lat);
  const lng = asFiniteNumber(value.location.lng);
  if (lat === null || lng === null) {
    return null;
  }

  return {
    title: typeof value.title === "string" ? value.title : null,
    location: { lat, lng },
    polylineIndex: asFiniteNumber(value.polyline_idx),
  };
};

const parseRoute = (value: unknown, index: number): TencentDrivingRoutePlan | null => {
  if (!isRecord(value) || !Array.isArray(value.polyline)) {
    return null;
  }

  const rawPolyline = value.polyline.filter((point): point is number => typeof point === "number");
  const polyline = decompressTencentDirectionPolyline(rawPolyline);
  if (polyline.length < 2) {
    return null;
  }

  const waypoints = Array.isArray(value.waypoints)
    ? value.waypoints
        .map(parseWaypoint)
        .filter(
          (waypoint): waypoint is TencentDrivingRoutePlan["waypoints"][number] => waypoint !== null,
        )
    : [];

  return {
    id: `driving-route-${index}`,
    distance: asFiniteNumber(value.distance),
    duration: asFiniteNumber(value.duration),
    polyline,
    waypoints,
  };
};

export const parseTencentDrivingDirectionResponse = (
  payload: unknown,
): TencentDrivingRoutePlan[] => {
  if (!isRecord(payload)) {
    throw new TencentDirectionPlanningError("Invalid Tencent route response.");
  }

  const status = asFiniteNumber(payload.status);
  if (status !== 0) {
    const message =
      typeof payload.message === "string" ? payload.message : "Tencent route planning failed.";
    throw new TencentDirectionPlanningError(message);
  }

  const routes = isRecord(payload.result) ? payload.result.routes : null;
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.map(parseRoute).filter((route): route is TencentDrivingRoutePlan => route !== null);
};

export const fetchTencentDrivingRoutePlans = async ({
  url,
  signal,
  fetcher,
}: {
  url: string;
  signal?: AbortSignal;
  fetcher?: Fetcher;
}): Promise<TencentDrivingRoutePlan[]> => {
  if (!fetcher && typeof window !== "undefined") {
    return requestTencentDrivingRoutePlansJsonp({ url, signal });
  }

  const requestFetcher = fetcher ?? fetch;
  const response = await requestFetcher(url, { signal });
  if (!response.ok) {
    throw new TencentDirectionPlanningError(
      `Tencent route planning request failed with HTTP ${response.status}.`,
    );
  }

  return parseTencentDrivingDirectionResponse((await response.json()) as unknown);
};

const requestTencentDrivingRoutePlansJsonp = ({
  url,
  signal,
}: {
  url: string;
  signal?: AbortSignal;
}): Promise<TencentDrivingRoutePlan[]> => {
  if (typeof document === "undefined") {
    throw new TencentDirectionPlanningError(
      "Tencent route planning JSONP requires a browser document.",
    );
  }

  return new Promise((resolve, reject) => {
    const requestUrl = new URL(url);
    const callbackName = `__partnerUpTencentDirection${Date.now()}${jsonpRequestCounter}`;
    jsonpRequestCounter += 1;
    requestUrl.searchParams.set("output", "jsonp");
    requestUrl.searchParams.set("callback", callbackName);

    const script = document.createElement("script");
    const globalWindow = window as unknown as Window &
      Record<string, ((payload: unknown) => void) | undefined>;
    let settled = false;

    const cleanup = () => {
      delete globalWindow[callbackName];
      script.remove();
      signal?.removeEventListener("abort", handleAbort);
    };

    const settle = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      handler();
    };

    const handleAbort = () => {
      settle(() => {
        reject(new TencentDirectionPlanningError("Tencent route planning aborted."));
      });
    };

    globalWindow[callbackName] = (payload: unknown) => {
      settle(() => {
        try {
          resolve(parseTencentDrivingDirectionResponse(payload));
        } catch (error) {
          reject(error);
        }
      });
    };

    script.onerror = () => {
      settle(() => {
        reject(new TencentDirectionPlanningError("Tencent route planning failed."));
      });
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }

    script.src = requestUrl.toString();
    document.head.append(script);
  });
};
