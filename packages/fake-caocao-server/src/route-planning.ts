import type { FakeCaocaoCoordinate } from "./state";

const TENCENT_DRIVING_DIRECTION_ENDPOINT = "https://apis.map.qq.com/ws/direction/v1/driving/";

export type FakeCaocaoRouteKind = "PICKUP" | "DROPOFF";

export type FakeCaocaoRoutePlan = {
  coordinates: FakeCaocaoCoordinate[];
  distanceMeters: number | null;
  durationSeconds: number | null;
};

export type FakeCaocaoRoutePlannerInput = {
  providerOrderId: string;
  routeKind: FakeCaocaoRouteKind;
  from: FakeCaocaoCoordinate;
  to: FakeCaocaoCoordinate;
};

export type FakeCaocaoRoutePlanner = (
  input: FakeCaocaoRoutePlannerInput,
) => Promise<FakeCaocaoRoutePlan>;

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

type TencentDrivingRoutePlan = {
  distance: number | null;
  duration: number | null;
  polyline: FakeCaocaoCoordinate[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const formatCoordinate = (coordinate: FakeCaocaoCoordinate): string =>
  `${coordinate.latitude},${coordinate.longitude}`;

export class FakeCaocaoRoutePlanningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FakeCaocaoRoutePlanningError";
  }
}

export const decompressTencentDirectionPolyline = (
  raw: readonly number[],
): FakeCaocaoCoordinate[] => {
  const points = raw.map((value) => Number(value));
  if (points.length < 2 || points.some((value) => !Number.isFinite(value))) {
    return [];
  }

  for (let index = 2; index < points.length; index += 1) {
    points[index] = Number(points[index - 2]) + Number(points[index]) / 1_000_000;
  }

  const coordinates: FakeCaocaoCoordinate[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    coordinates.push({
      latitude: points[index]!,
      longitude: points[index + 1]!,
    });
  }
  return coordinates;
};

export const buildTencentDrivingDirectionUrl = ({
  from,
  to,
  apiKey,
  endpoint = TENCENT_DRIVING_DIRECTION_ENDPOINT,
}: {
  from: FakeCaocaoCoordinate;
  to: FakeCaocaoCoordinate;
  apiKey: string;
  endpoint?: string;
}): string => {
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length === 0) {
    throw new FakeCaocaoRoutePlanningError("Tencent LBS key is required");
  }

  const url = new URL(endpoint);
  url.searchParams.set("from", formatCoordinate(from));
  url.searchParams.set("to", formatCoordinate(to));
  url.searchParams.set("output", "json");
  url.searchParams.set("no_step", "1");
  url.searchParams.set("key", trimmedKey);
  return url.toString();
};

const parseRoute = (value: unknown): TencentDrivingRoutePlan | null => {
  if (!isRecord(value) || !Array.isArray(value.polyline)) {
    return null;
  }

  const rawPolyline = value.polyline.filter((point): point is number => typeof point === "number");
  const polyline = decompressTencentDirectionPolyline(rawPolyline);
  if (polyline.length < 2) {
    return null;
  }

  return {
    distance: asFiniteNumber(value.distance),
    duration: asFiniteNumber(value.duration),
    polyline,
  };
};

export const parseTencentDrivingDirectionResponse = (
  payload: unknown,
): TencentDrivingRoutePlan[] => {
  if (!isRecord(payload)) {
    throw new FakeCaocaoRoutePlanningError("Invalid Tencent route response.");
  }

  const status = asFiniteNumber(payload.status);
  if (status !== 0) {
    throw new FakeCaocaoRoutePlanningError(
      typeof payload.message === "string" ? payload.message : "Tencent route planning failed.",
    );
  }

  const routes = isRecord(payload.result) ? payload.result.routes : null;
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes.map(parseRoute).filter((route): route is TencentDrivingRoutePlan => route !== null);
};

export const createTencentDrivingRoutePlanner = ({
  apiKey,
  fetcher = fetch,
}: {
  apiKey: string;
  fetcher?: Fetcher;
}): FakeCaocaoRoutePlanner => {
  const trimmedKey = apiKey.trim();
  if (trimmedKey.length === 0) {
    throw new FakeCaocaoRoutePlanningError("Tencent LBS key is required");
  }

  return async (input) => {
    const url = buildTencentDrivingDirectionUrl({
      apiKey: trimmedKey,
      from: input.from,
      to: input.to,
    });
    const response = await fetcher(url);
    if (!response.ok) {
      throw new FakeCaocaoRoutePlanningError(
        `Tencent route planning request failed with HTTP ${response.status}.`,
      );
    }
    const plans = parseTencentDrivingDirectionResponse((await response.json()) as unknown);
    const primary = plans[0];
    if (!primary) {
      throw new FakeCaocaoRoutePlanningError("Tencent route planning returned no usable route.");
    }
    return {
      coordinates: primary.polyline,
      distanceMeters: primary.distance,
      durationSeconds: primary.duration,
    };
  };
};
