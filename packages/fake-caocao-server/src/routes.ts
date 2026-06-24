import type { IncomingMessage, ServerResponse } from "node:http";
import type { FakeCaocaoFixture } from "./fixtures";
import {
  bearingDegrees,
  type FakeCaocaoMovementSnapshot,
  movementSnapshotFromRoute,
  polylineLengthMeters,
} from "./movement";
import type { FakeCaocaoRouteKind, FakeCaocaoRoutePlanner } from "./route-planning";
import {
  createFakeCaocaoSignature,
  type FakeCaocaoSignedParams,
  fakeCaocaoSignaturesMatch,
} from "./signature";
import type {
  FakeCaocaoCoordinate,
  FakeCaocaoDriverSnapshot,
  FakeCaocaoOrderPhase,
  FakeCaocaoOrderState,
  FakeCaocaoState,
  FakeCaocaoVehicleEstimate,
} from "./state";

export type FakeCaocaoRouteInput = {
  fixture: FakeCaocaoFixture;
  routePlanner?: FakeCaocaoRoutePlanner | null;
  state: FakeCaocaoState;
  verifyRequests: boolean;
};

const defaultHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json; charset=utf-8",
};

const sendJson = (res: ServerResponse, status: number, value: unknown): void => {
  res.writeHead(status, defaultHeaders);
  res.end(JSON.stringify(value));
};

const sendHealth = (req: IncomingMessage, res: ServerResponse): void => {
  res.writeHead(200, defaultHeaders);
  res.end(req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
};

const readBodyText = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("error", reject);
    req.on("end", () => resolve(body));
  });

const formToRecord = (params: URLSearchParams): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    record[key] = value;
  }
  return record;
};

const readParams = async (req: IncomingMessage, url: URL): Promise<Record<string, string>> => {
  if (req.method === "GET") {
    return formToRecord(url.searchParams);
  }

  const body = await readBodyText(req);
  if (body.length === 0) return {};
  const contentType = req.headers["content-type"] ?? "";
  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(body) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  }
  return formToRecord(new URLSearchParams(body));
};

const caocaoSuccess = (data: unknown): unknown => ({
  code: 200,
  data,
  msg: "OK",
  success: true,
});

const caocaoFailure = (code: number, msg: string): unknown => ({
  code,
  data: null,
  msg,
  success: false,
});

const verifySignedParams = (input: {
  fixture: FakeCaocaoFixture;
  params: Record<string, string>;
  verifyRequests: boolean;
}): void => {
  if (!input.verifyRequests) return;

  const { sign, ...unsigned } = input.params;
  if (!sign) {
    throw new Error("Missing Caocao sign");
  }
  if (unsigned.client_id !== input.fixture.clientId) {
    throw new Error("Unexpected Caocao client_id");
  }

  const expected = createFakeCaocaoSignature({
    params: unsigned,
    signKey: input.fixture.signKey,
  });
  if (!fakeCaocaoSignaturesMatch(expected, sign)) {
    throw new Error("Fake Caocao request signature verification failed");
  }
};

const readFirstParam = (params: Record<string, string>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) return value;
  }
  return null;
};

const readRequiredNumberParam = (params: Record<string, string>, keys: string[]): number => {
  const raw = readFirstParam(params, keys);
  const parsed = raw === null ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Missing numeric fake Caocao parameter: ${keys[0]}`);
  }
  return parsed;
};

const readOptionalNumberParam = (
  params: Record<string, string>,
  keys: string[],
): number | undefined => {
  const raw = readFirstParam(params, keys);
  if (raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric fake Caocao parameter: ${keys[0]}`);
  }
  return parsed;
};

const readRequiredBooleanParam = (params: Record<string, string>, keys: string[]): boolean => {
  const raw = readFirstParam(params, keys)?.toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new Error(`Missing boolean fake Caocao parameter: ${keys[0]}`);
};

const estimatePayload = (estimate: FakeCaocaoVehicleEstimate): unknown => ({
  carType: estimate.carType,
  carTypeName: estimate.carTypeName,
  car_type: estimate.carType,
  car_type_name: estimate.carTypeName,
  distance: estimate.distanceMeters,
  distanceMeters: estimate.distanceMeters,
  duration: estimate.durationSeconds,
  durationSeconds: estimate.durationSeconds,
  estimateAmountFen: estimate.estimateAmountFen,
  estimatePriceFen: estimate.estimateAmountFen,
  estimate_price: estimate.estimateAmountFen,
  price_token: `fake_quote_${estimate.carType}`,
});

const defaultDriverLocation = (): FakeCaocaoCoordinate => ({
  latitude: 30.2688,
  longitude: 120.1608,
});

const ACTIVE_MOVEMENT_POLL_INTERVAL_SECONDS = 2;
const ACTIVE_MOVEMENT_TIME_SCALE = 4;
const ACTIVE_MOVEMENT_MAX_PROGRESS_RATIO = 0.94;
const PICKUP_SPEED_KPH = 28;
const IN_TRIP_SPEED_KPH = 36;

const interpolateCoordinate = (
  from: FakeCaocaoCoordinate,
  to: FakeCaocaoCoordinate,
  ratio: number,
): FakeCaocaoCoordinate => ({
  latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  longitude: from.longitude + (to.longitude - from.longitude) * ratio,
});

const bendCoordinate = (
  from: FakeCaocaoCoordinate,
  to: FakeCaocaoCoordinate,
  ratio: number,
  bendRatio: number,
): FakeCaocaoCoordinate => {
  const base = interpolateCoordinate(from, to, ratio);
  const latitudeSpan = to.latitude - from.latitude;
  const longitudeSpan = to.longitude - from.longitude;
  return {
    latitude: base.latitude - longitudeSpan * bendRatio,
    longitude: base.longitude + latitudeSpan * bendRatio,
  };
};

const curvedPolyline = (input: {
  from: FakeCaocaoCoordinate;
  to: FakeCaocaoCoordinate;
  bendRatio: number;
}): FakeCaocaoCoordinate[] =>
  [
    [0, 0],
    [0.16, input.bendRatio * 0.35],
    [0.34, input.bendRatio * 0.72],
    [0.52, input.bendRatio],
    [0.68, input.bendRatio * 0.82],
    [0.84, input.bendRatio * 0.42],
    [1, 0],
  ].map(([ratio, bendRatio]) =>
    ratio === 0
      ? input.from
      : ratio === 1
        ? input.to
        : bendCoordinate(input.from, input.to, ratio, bendRatio),
  );

const driverStartCoordinate = (order: FakeCaocaoOrderState): FakeCaocaoCoordinate =>
  interpolateCoordinate(order.origin, order.destination, -0.12);

const fallbackPickupRoute = (order: FakeCaocaoOrderState): FakeCaocaoCoordinate[] =>
  curvedPolyline({
    bendRatio: 0.24,
    from: driverStartCoordinate(order),
    to: order.origin,
  });

const fallbackDropoffRoute = (order: FakeCaocaoOrderState): FakeCaocaoCoordinate[] =>
  curvedPolyline({
    bendRatio: -0.18,
    from: order.origin,
    to: order.destination,
  });

const fallbackRoute = (
  order: FakeCaocaoOrderState,
  routeKind: FakeCaocaoRouteKind,
): FakeCaocaoCoordinate[] =>
  routeKind === "PICKUP" ? fallbackPickupRoute(order) : fallbackDropoffRoute(order);

const movementRouteKind = (order: FakeCaocaoOrderState): FakeCaocaoRouteKind => {
  if (order.phase === "IN_TRIP" || order.phase === "FINISHED") return "DROPOFF";
  return "PICKUP";
};

const resolveMovementRoute = async (input: {
  order: FakeCaocaoOrderState;
  routeKind: FakeCaocaoRouteKind;
  routePlanner?: FakeCaocaoRoutePlanner | null;
  state: FakeCaocaoState;
}): Promise<FakeCaocaoCoordinate[]> => {
  const cached = input.state.findRoutePlan(input.order.providerOrderId, input.routeKind);
  if (cached) return cached;

  const fallback = fallbackRoute(input.order, input.routeKind);
  if (!input.routePlanner) return fallback;

  const from = fallback[0];
  const to = fallback[fallback.length - 1];
  if (!from || !to) return fallback;

  try {
    const plan = await input.routePlanner({
      from,
      providerOrderId: input.order.providerOrderId,
      routeKind: input.routeKind,
      to,
    });
    if (plan.coordinates.length >= 2) {
      input.state.cacheRoutePlan({
        coordinates: plan.coordinates,
        providerOrderId: input.order.providerOrderId,
        routeKind: input.routeKind,
      });
      return plan.coordinates;
    }
  } catch {
    return fallback;
  }

  return fallback;
};

const movementSpeedKph = (order: FakeCaocaoOrderState): number =>
  order.phase === "IN_TRIP" ? IN_TRIP_SPEED_KPH : PICKUP_SPEED_KPH;

const activeMovementDistanceMeters = (
  order: FakeCaocaoOrderState,
  route: readonly FakeCaocaoCoordinate[],
): number => {
  const routeLengthMeters = polylineLengthMeters(route);
  const scaledSeconds =
    order.queryCount * ACTIVE_MOVEMENT_POLL_INTERVAL_SECONDS * ACTIVE_MOVEMENT_TIME_SCALE;
  const speedMetersPerSecond = movementSpeedKph(order) / 3.6;
  return Math.min(
    speedMetersPerSecond * scaledSeconds,
    routeLengthMeters * ACTIVE_MOVEMENT_MAX_PROGRESS_RATIO,
  );
};

const terminalRouteHeading = (route: readonly FakeCaocaoCoordinate[]): number => {
  const destination = route[route.length - 1];
  const previous = route[route.length - 2];
  return destination && previous ? bearingDegrees(previous, destination) : 0;
};

const stationaryMovementSnapshot = (input: {
  coordinate: FakeCaocaoCoordinate;
  headingDegrees: number;
}): FakeCaocaoMovementSnapshot => ({
  coordinate: input.coordinate,
  headingDegrees: input.headingDegrees,
  remainingDistanceMeters: 0,
  remainingRoute: [],
});

const movementSnapshot = (
  order: FakeCaocaoOrderState | null,
  plannedRoute?: readonly FakeCaocaoCoordinate[] | null,
): FakeCaocaoMovementSnapshot => {
  if (!order) {
    return stationaryMovementSnapshot({
      coordinate: defaultDriverLocation(),
      headingDegrees: 0,
    });
  }

  if (order.phase === "ACCEPTED") {
    const route = plannedRoute ?? fallbackPickupRoute(order);
    return movementSnapshotFromRoute({
      distanceAlongRouteMeters: activeMovementDistanceMeters(order, route),
      fallbackHeadingDegrees: terminalRouteHeading(route),
      route,
    });
  }

  if (order.phase === "ARRIVED_AT_PICKUP") {
    return stationaryMovementSnapshot({
      coordinate: order.origin,
      headingDegrees: terminalRouteHeading(plannedRoute ?? fallbackPickupRoute(order)),
    });
  }

  if (order.phase === "IN_TRIP") {
    const route = plannedRoute ?? fallbackDropoffRoute(order);
    return movementSnapshotFromRoute({
      distanceAlongRouteMeters: activeMovementDistanceMeters(order, route),
      fallbackHeadingDegrees: terminalRouteHeading(route),
      route,
    });
  }

  if (order.phase === "FINISHED") {
    return stationaryMovementSnapshot({
      coordinate: order.destination,
      headingDegrees: terminalRouteHeading(plannedRoute ?? fallbackDropoffRoute(order)),
    });
  }

  const route = plannedRoute ?? fallbackPickupRoute(order);
  return movementSnapshotFromRoute({
    fallbackHeadingDegrees: terminalRouteHeading(route),
    progressRatio: 0,
    route,
  });
};

const driverSnapshot = (
  order: FakeCaocaoOrderState | null = null,
  plannedRoute?: readonly FakeCaocaoCoordinate[] | null,
): FakeCaocaoDriverSnapshot => {
  const snapshot = movementSnapshot(order, plannedRoute);
  return {
    driverName: "曹操测试司机",
    driverPhone: "13900139000",
    direction: snapshot.headingDegrees,
    latitude: snapshot.coordinate.latitude,
    longitude: snapshot.coordinate.longitude,
    speedKph:
      order?.phase === "ACCEPTED" || order?.phase === "IN_TRIP"
        ? order.phase === "IN_TRIP"
          ? 36
          : 28
        : 0,
    vehicleBrand: "几何",
    vehicleColor: "白色",
    vehiclePlate: "浙A·TEST",
  };
};

const phaseEvent = (phase: FakeCaocaoOrderState["phase"]): number => {
  if (phase === "ACCEPTED") return 1;
  if (phase === "ARRIVED_AT_PICKUP") return 3;
  if (phase === "IN_TRIP") return 4;
  if (phase === "FINISHED") return 6;
  if (phase === "CANCELLED") return 21;
  return 14;
};

const parseOrderPhase = (phase: string | null): FakeCaocaoOrderPhase | null => {
  if (
    phase === "CREATED" ||
    phase === "ACCEPTED" ||
    phase === "ARRIVED_AT_PICKUP" ||
    phase === "IN_TRIP" ||
    phase === "FINISHED" ||
    phase === "CANCELLED"
  ) {
    return phase;
  }
  return null;
};

const readOptionalCoordinateParam = (
  params: Record<string, string>,
  keys: { latitude: string[]; longitude: string[] },
): FakeCaocaoCoordinate | null => {
  const latitudeRaw = readFirstParam(params, keys.latitude);
  const longitudeRaw = readFirstParam(params, keys.longitude);
  const latitude = latitudeRaw === null ? Number.NaN : Number(latitudeRaw);
  const longitude = longitudeRaw === null ? Number.NaN : Number(longitudeRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const routePolyline = (
  order: FakeCaocaoOrderState,
  plannedRoute: readonly FakeCaocaoCoordinate[],
): FakeCaocaoCoordinate[] => {
  if (order.phase === "ACCEPTED" || order.phase === "IN_TRIP") {
    return movementSnapshot(order, plannedRoute).remainingRoute;
  }
  return [];
};

const formatRouteCoordinates = (coordinates: FakeCaocaoCoordinate[]): string =>
  coordinates.map((point) => `${point.latitude},${point.longitude}`).join(";");

const navigationPolylineType = (order: FakeCaocaoOrderState): number => {
  if (order.phase === "ACCEPTED") return 1;
  if (order.phase === "ARRIVED_AT_PICKUP") return 2;
  if (order.phase === "IN_TRIP") return 3;
  return 2;
};

const expectedNavigationPolylineRequestType = (order: FakeCaocaoOrderState): number | null => {
  if (order.phase === "ACCEPTED" || order.phase === "ARRIVED_AT_PICKUP") return 1;
  if (order.phase === "IN_TRIP") return 3;
  return null;
};

const readNavigationPolylineRequestType = (params: Record<string, string>): number | null => {
  const raw = readFirstParam(params, ["navigation_polyline_type", "navigationPolylineType"]);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
};

const driverLocationPayload = (
  order: FakeCaocaoOrderState,
  plannedRoute: readonly FakeCaocaoCoordinate[],
): unknown => {
  const driver = driverSnapshot(order, plannedRoute);
  return {
    direction: driver.direction,
    latitude: driver.latitude,
    longitude: driver.longitude,
    speed: driver.speedKph,
  };
};

const driverPolylinePayload = (
  order: FakeCaocaoOrderState,
  plannedRoute: readonly FakeCaocaoCoordinate[],
): unknown => {
  const polyline = routePolyline(order, plannedRoute);
  const driver = driverSnapshot(order, plannedRoute);
  const remainingDistanceMeters = Math.round(polylineLengthMeters(polyline));
  const speedKph = driver.speedKph > 0 ? driver.speedKph : 28;
  const remainingDurationSeconds =
    remainingDistanceMeters > 0 ? Math.round(remainingDistanceMeters / (speedKph / 3.6)) : 0;
  return {
    allLength: remainingDistanceMeters,
    allTime: remainingDurationSeconds,
    driverEtaInfoVO: {
      direction: driver.direction,
      isMatchNaviPath: 1,
      lat: driver.latitude,
      lng: driver.longitude,
      remainDistance: remainingDistanceMeters,
      remainLightCount: order.phase === "IN_TRIP" ? 3 : 0,
      remainTime: remainingDurationSeconds,
      speed: driver.speedKph,
      timestamp: String(Date.now()),
    },
    navigationPolylineType: navigationPolylineType(order),
    orderNo: order.providerOrderId,
    pathId: `${order.providerOrderId}-fake-path`,
    steps:
      polyline.length > 0
        ? [
            {
              length: order.phase === "ACCEPTED" ? 820 : 4300,
              links: [
                {
                  coords: formatRouteCoordinates(polyline),
                  length: remainingDistanceMeters,
                  time: remainingDurationSeconds,
                },
              ],
              time: remainingDurationSeconds,
            },
          ]
        : [],
  };
};

const orderDetailPayload = (order: FakeCaocaoOrderState): unknown => {
  const driver =
    order.phase === "ACCEPTED" ||
    order.phase === "ARRIVED_AT_PICKUP" ||
    order.phase === "IN_TRIP" ||
    order.phase === "FINISHED"
      ? driverSnapshot(order)
      : null;
  const statusCode =
    order.phase === "CREATED"
      ? "1"
      : order.phase === "ACCEPTED"
        ? "9"
        : order.phase === "ARRIVED_AT_PICKUP"
          ? "12"
          : order.phase === "IN_TRIP"
            ? "3"
            : order.phase === "FINISHED"
              ? "5"
              : "20";
  return {
    actual_price: order.phase === "FINISHED" ? order.finalAmountFen : null,
    basicOrderVO: {
      endName: "Fake Destination",
      estimatePrice: order.finalAmountFen - 400,
      extOrderId: order.externalOrderId,
      fromLocation: {
        lat: order.origin.latitude,
        lng: order.origin.longitude,
      },
      orderId: order.providerOrderId,
      startName: "Fake Origin",
      status: statusCode,
      toLocation: {
        lat: order.destination.latitude,
        lng: order.destination.longitude,
      },
    },
    driver,
    driverInfoVO: driver
      ? {
          carBrand: driver.vehicleBrand,
          card: driver.vehiclePlate,
          color: driver.vehicleColor,
          location: {
            direction: driver.direction,
            latitude: driver.latitude,
            longitude: driver.longitude,
            speed: driver.speedKph,
          },
          name: driver.driverName,
          phone: driver.driverPhone,
        }
      : null,
    event: phaseEvent(order.phase),
    ext_order_id: order.externalOrderId,
    finalAmountFen: order.phase === "FINISHED" ? order.finalAmountFen : null,
    orderFeeVO: {
      totalFee: order.phase === "FINISHED" ? order.finalAmountFen : null,
    },
    orderNo: order.providerOrderId,
    order_id: order.providerOrderId,
    phase: order.phase,
    status: order.phase,
    vehicle: driver
      ? {
          brand: driver.vehicleBrand,
          color: driver.vehicleColor,
          plate: driver.vehiclePlate,
        }
      : null,
  };
};

const buildCallbackForm = (input: {
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  event: number;
}): URLSearchParams => {
  const driver =
    input.order.phase === "ACCEPTED" ||
    input.order.phase === "ARRIVED_AT_PICKUP" ||
    input.order.phase === "IN_TRIP" ||
    input.order.phase === "FINISHED"
      ? driverSnapshot(input.order)
      : null;
  const unsigned: FakeCaocaoSignedParams = {
    event: String(input.event),
    ext_order_id: input.order.externalOrderId,
    order_id: input.order.providerOrderId,
    timestamp: String(Date.now()),
    ...(driver
      ? {
          car_no: driver.vehiclePlate,
          driver_name: driver.driverName,
          driver_phone: driver.driverPhone,
          vehicle_brand: driver.vehicleBrand,
          vehicle_color: driver.vehicleColor,
        }
      : {}),
    ...(input.order.phase === "FINISHED"
      ? {
          final_amount_fen: String(input.order.finalAmountFen),
        }
      : {}),
  };
  return new URLSearchParams({
    ...unsigned,
    sign: createFakeCaocaoSignature({
      params: unsigned,
      signKey: input.fixture.signKey,
    }),
  });
};

type FakeCaocaoCallbackDelivery =
  | {
      ok: true;
      skipped: true;
      callbackUrl: null;
      message: string;
    }
  | {
      ok: true;
      skipped: false;
      callbackUrl: string;
      status: number;
      statusText: string;
      bodyPreview: string | null;
    }
  | {
      ok: false;
      skipped: false;
      callbackUrl: string;
      status: number | null;
      statusText: string | null;
      message: string;
      bodyPreview: string | null;
    };

class FakeCaocaoCallbackDeliveryError extends Error {
  readonly delivery: Extract<FakeCaocaoCallbackDelivery, { ok: false }>;
  readonly order: FakeCaocaoOrderState;

  constructor(
    delivery: Extract<FakeCaocaoCallbackDelivery, { ok: false }>,
    order: FakeCaocaoOrderState,
  ) {
    super(delivery.message);
    this.delivery = delivery;
    this.order = order;
  }
}

const readResponseBodyPreview = async (response: Response): Promise<string | null> => {
  const body = await response.text().catch(() => "");
  const trimmed = body.trim();
  if (!trimmed) return null;
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
};

const postCallback = async (input: {
  callbackUrl: string;
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  event: number;
}): Promise<FakeCaocaoCallbackDelivery> => {
  try {
    const response = await fetch(input.callbackUrl, {
      body: buildCallbackForm(input).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const bodyPreview = await readResponseBodyPreview(response);
    if (response.ok) {
      return {
        bodyPreview,
        callbackUrl: input.callbackUrl,
        ok: true,
        skipped: false,
        status: response.status,
        statusText: response.statusText,
      };
    }
    return {
      bodyPreview,
      callbackUrl: input.callbackUrl,
      message: `Fake Caocao callback POST failed with HTTP ${response.status}`,
      ok: false,
      skipped: false,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      bodyPreview: null,
      callbackUrl: input.callbackUrl,
      message: error instanceof Error ? error.message : "Fake Caocao callback POST failed",
      ok: false,
      skipped: false,
      status: null,
      statusText: null,
    };
  }
};

const postOrderPhaseCallback = async (input: {
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
}): Promise<FakeCaocaoCallbackDelivery> => {
  if (!input.order.callbackUrl) {
    return {
      callbackUrl: null,
      message: "No callback URL configured",
      ok: true,
      skipped: true,
    };
  }
  return await postCallback({
    callbackUrl: input.order.callbackUrl,
    event: phaseEvent(input.order.phase),
    fixture: input.fixture,
    order: input.order,
  });
};

const assertCallbackDelivered = (
  delivery: FakeCaocaoCallbackDelivery,
  order: FakeCaocaoOrderState,
): void => {
  if (delivery.ok) return;
  throw new FakeCaocaoCallbackDeliveryError(delivery, order);
};

const maybePostCreateCallback = (input: {
  callbackUrl: string | null;
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  state: FakeCaocaoState;
}): void => {
  if (!input.callbackUrl) return;
  const acceptedOrder = input.state.setOrderPhase(input.order.providerOrderId, "ACCEPTED");
  if (!acceptedOrder) return;
  setTimeout(() => {
    postCallback({
      callbackUrl: input.callbackUrl!,
      event: phaseEvent(acceptedOrder.phase),
      fixture: input.fixture,
      order: acceptedOrder,
    }).catch(() => undefined);
  }, 0);
};

export async function handleFakeCaocaoRequest(
  req: IncomingMessage,
  res: ServerResponse,
  input: FakeCaocaoRouteInput,
): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204, defaultHeaders);
    res.end();
    return;
  }

  const host = req.headers.host ?? "127.0.0.1";
  const url = new URL(req.url ?? "/", `http://${host}`);

  try {
    if (url.pathname === "/health" && (req.method === "GET" || req.method === "HEAD")) {
      sendHealth(req, res);
      return;
    }

    if (url.pathname === "/__fake_caocao/reset" && req.method === "POST") {
      await readBodyText(req);
      input.state.reset();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/__fake_caocao/create-failure/next" && req.method === "POST") {
      await readBodyText(req);
      input.state.configureNextCreateFailure();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/__fake_caocao/estimates" && req.method === "POST") {
      const params = await readParams(req, url);
      const carType = readFirstParam(params, ["carType", "car_type"]);
      if (!carType) {
        throw new Error("Missing fake Caocao car type");
      }
      const estimate = input.state.updateEstimate({
        carType,
        carTypeName: readFirstParam(params, ["carTypeName", "car_type_name"]) ?? undefined,
        distanceMeters: readOptionalNumberParam(params, ["distanceMeters", "distance"]),
        durationSeconds: readOptionalNumberParam(params, ["durationSeconds", "duration"]),
        estimateAmountFen: readRequiredNumberParam(params, [
          "estimateAmountFen",
          "estimatePriceFen",
          "estimate_price",
        ]),
      });
      sendJson(res, 200, { estimate, ok: true });
      return;
    }

    if (url.pathname === "/__fake_caocao/estimates/availability" && req.method === "POST") {
      const params = await readParams(req, url);
      const carType = readFirstParam(params, ["carType", "car_type"]);
      if (!carType) {
        throw new Error("Missing fake Caocao car type");
      }
      const estimate = input.state.setEstimateAvailability({
        carType,
        available: readRequiredBooleanParam(params, ["available"]),
      });
      sendJson(res, 200, { estimate, ok: true });
      return;
    }

    if (url.pathname === "/__fake_caocao/state" && req.method === "GET") {
      sendJson(res, 200, input.state.snapshot());
      return;
    }

    if (url.pathname === "/__fake_caocao/orders/latest/advance" && req.method === "POST") {
      await readBodyText(req);
      const order = input.state.advanceLatestNonTerminalOrder();
      if (!order) {
        sendJson(res, 404, {
          code: "FAKE_CAOCAO_ORDER_NOT_FOUND",
          message: "No non-terminal fake Caocao order found",
        });
        return;
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      sendJson(res, 200, { callback, ok: true, order });
      return;
    }

    if (url.pathname === "/__fake_caocao/orders/latest/retreat" && req.method === "POST") {
      await readBodyText(req);
      const order = input.state.retreatLatestOrder();
      if (!order) {
        sendJson(res, 404, {
          code: "FAKE_CAOCAO_ORDER_NOT_FOUND",
          message: "No retreatable fake Caocao order found",
        });
        return;
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      sendJson(res, 200, { callback, ok: true, order });
      return;
    }

    const orderAdvanceMatch = url.pathname.match(/^\/__fake_caocao\/orders\/([^/]+)\/advance$/);
    if (orderAdvanceMatch && req.method === "POST") {
      await readBodyText(req);
      const order = input.state.advanceOrderPhase(decodeURIComponent(orderAdvanceMatch[1]!));
      if (!order) {
        sendJson(res, 404, {
          code: "FAKE_CAOCAO_ORDER_NOT_FOUND",
          message: "Fake Caocao order not found",
        });
        return;
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      sendJson(res, 200, { callback, ok: true, order });
      return;
    }

    const orderRetreatMatch = url.pathname.match(/^\/__fake_caocao\/orders\/([^/]+)\/retreat$/);
    if (orderRetreatMatch && req.method === "POST") {
      await readBodyText(req);
      const providerOrderId = decodeURIComponent(orderRetreatMatch[1]!);
      const existingOrder = input.state.findOrder(providerOrderId);
      if (!existingOrder) {
        sendJson(res, 404, {
          code: "FAKE_CAOCAO_ORDER_NOT_FOUND",
          message: "Fake Caocao order not found",
        });
        return;
      }
      const order = input.state.retreatOrderPhase(providerOrderId);
      if (!order) {
        sendJson(res, 409, {
          code: "FAKE_CAOCAO_ORDER_PHASE_NOT_RETREATABLE",
          message: `Fake Caocao order phase cannot retreat: ${existingOrder.phase}`,
        });
        return;
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      sendJson(res, 200, { callback, ok: true, order });
      return;
    }

    const orderPhaseMatch = url.pathname.match(/^\/__fake_caocao\/orders\/([^/]+)\/phase$/);
    if (orderPhaseMatch && req.method === "POST") {
      const phaseParams = await readParams(req, url);
      const phase = parseOrderPhase(readFirstParam(phaseParams, ["phase"]));
      if (!phase) {
        sendJson(res, 400, {
          code: "FAKE_CAOCAO_UNSUPPORTED_ORDER_PHASE",
          message: "Unsupported fake Caocao order phase",
        });
        return;
      }
      const order = input.state.setOrderPhase(decodeURIComponent(orderPhaseMatch[1]!), phase);
      if (!order) {
        sendJson(res, 404, {
          code: "FAKE_CAOCAO_ORDER_NOT_FOUND",
          message: "Fake Caocao order not found",
        });
        return;
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      sendJson(res, 200, { callback, ok: true, order });
      return;
    }

    const params = await readParams(req, url);
    verifySignedParams({
      fixture: input.fixture,
      params,
      verifyRequests: input.verifyRequests,
    });

    if (url.pathname === "/common/estimatePriceWithDetail") {
      const carType = readFirstParam(params, ["car_type", "carType", "vehicle_type"]) ?? "EXPRESS";
      const estimate = input.state.findAvailableEstimate(carType);
      if (!estimate) {
        sendJson(res, 200, caocaoFailure(47001, "Fake Caocao vehicle unavailable"));
        return;
      }
      sendJson(res, 200, caocaoSuccess(estimatePayload(estimate)));
      return;
    }

    if (url.pathname === "/common/orderCarV2" && req.method === "POST") {
      if (input.state.consumeNextCreateFailure()) {
        sendJson(res, 200, caocaoFailure(50001, "Fake Caocao create failed"));
        return;
      }

      const externalOrderId = readFirstParam(params, ["ext_order_id"]);
      if (!externalOrderId) {
        sendJson(res, 200, caocaoFailure(40001, "Missing ext_order_id"));
        return;
      }
      const carType = readFirstParam(params, ["car_type", "carType", "vehicle_type"]) ?? "EXPRESS";
      const callbackUrl = readFirstParam(params, [
        "callback_url",
        "callbackUrl",
        "notify_url",
        "notifyUrl",
        "order_status_callback_url",
      ]);
      const order = input.state.createOrder({
        callbackUrl,
        carType,
        destination: readOptionalCoordinateParam(params, {
          latitude: ["tlat", "to_lat", "toLatitude"],
          longitude: ["tlng", "to_lng", "toLongitude"],
        }),
        externalOrderId,
        origin: readOptionalCoordinateParam(params, {
          latitude: ["flat", "from_lat", "fromLatitude"],
          longitude: ["flng", "from_lng", "fromLongitude"],
        }),
      });
      maybePostCreateCallback({
        callbackUrl,
        fixture: input.fixture,
        order,
        state: input.state,
      });
      sendJson(
        res,
        200,
        caocaoSuccess({
          ext_order_id: order.externalOrderId,
          orderNo: order.providerOrderId,
          order_id: order.providerOrderId,
        }),
      );
      return;
    }

    if (url.pathname === "/common/queryOrderDetailV2") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      const order = providerOrderId ? input.state.findOrder(providerOrderId) : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess(orderDetailPayload(order))
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
      return;
    }

    if (url.pathname === "/common/queryDriverLocationByOrderId") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      const order = providerOrderId ? input.state.findOrder(providerOrderId) : null;
      const plannedRoute = order
        ? await resolveMovementRoute({
            order,
            routeKind: movementRouteKind(order),
            routePlanner: input.routePlanner,
            state: input.state,
          })
        : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess(driverLocationPayload(order, plannedRoute ?? fallbackPickupRoute(order)))
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
      return;
    }

    if (url.pathname === "/common/queryDriverPolylineV2" && req.method === "POST") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      const order = providerOrderId ? input.state.findOrder(providerOrderId) : null;
      const requestedRouteType = readNavigationPolylineRequestType(params);
      const expectedRouteType = order ? expectedNavigationPolylineRequestType(order) : null;
      if (!order) {
        sendJson(res, 200, caocaoFailure(40401, "Fake Caocao order not found"));
        return;
      }
      if (requestedRouteType === null) {
        sendJson(res, 200, caocaoFailure(40001, "Missing fake Caocao navigation_polyline_type"));
        return;
      }
      if (expectedRouteType === null || requestedRouteType !== expectedRouteType) {
        sendJson(res, 200, caocaoFailure(40002, "Unexpected fake Caocao navigation_polyline_type"));
        return;
      }

      const routeKind = movementRouteKind(order);
      const plannedRoute = await resolveMovementRoute({
        order,
        routeKind,
        routePlanner: input.routePlanner,
        state: input.state,
      });
      sendJson(res, 200, caocaoSuccess(driverPolylinePayload(order, plannedRoute)));
      if (order.phase === "ACCEPTED" || order.phase === "IN_TRIP") {
        input.state.advanceOrderMovement(order.providerOrderId);
      }
      return;
    }

    if (url.pathname === "/common/queryCancelFee") {
      const providerOrderId = readFirstParam(params, ["order_no", "order_id"]);
      const order = providerOrderId ? input.state.findOrder(providerOrderId) : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess({
              cancelFee: order.cancelFeeFen,
              orderNo: order.providerOrderId,
            })
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
      return;
    }

    if (url.pathname === "/common/cancelOrderV3" && req.method === "POST") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      const order = providerOrderId ? input.state.cancelOrder(providerOrderId) : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess({
              cancelFee: order.cancelFeeFen,
              orderNo: order.providerOrderId,
            })
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
      return;
    }

    if (url.pathname === "/common/feeConfirm" && req.method === "POST") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      if (!providerOrderId) {
        sendJson(res, 200, caocaoFailure(40001, "Missing order_id"));
        return;
      }
      input.state.confirmFee({
        allowanceAmountFen: Number(params.allowance_amount ?? 0) || null,
        caocaoAllowanceAmountFen: Number(params.cao_allowance_amount ?? 0) || null,
        providerOrderId,
      });
      sendJson(res, 200, caocaoSuccess({ orderNo: providerOrderId }));
      return;
    }

    sendJson(res, 404, {
      code: "FAKE_CAOCAO_NOT_FOUND",
      message: `Unknown fake Caocao route: ${url.pathname}`,
    });
  } catch (error) {
    if (error instanceof FakeCaocaoCallbackDeliveryError) {
      sendJson(res, 502, {
        callback: error.delivery,
        code: "FAKE_CAOCAO_CALLBACK_DELIVERY_FAILED",
        message: error.message,
        order: error.order,
      });
      return;
    }
    sendJson(res, 400, {
      code: "FAKE_CAOCAO_ERROR",
      message: error instanceof Error ? error.message : "Unknown fake error",
    });
  }
}
