import { fileURLToPath } from "node:url";
import { type Context, Hono } from "hono";
import type { FakeCaocaoFixture } from "./fixtures";
import {
  bearingDegrees,
  type FakeCaocaoMovementSnapshot,
  movementSnapshotFromRoute,
  polylineLengthMeters,
} from "./movement";
import {
  assertOperationMatches,
  expectJsonObject,
  OpenApiContract,
  type OpenApiIndexedOperation,
  OpenApiValidationError,
  readFormBody,
  readPathParams,
  readQueryParams,
} from "./openapi";
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
import { FakeCaocaoState as FakeCaocaoStateStore } from "./state";

const providerContract = OpenApiContract.load(
  fileURLToPath(
    new URL("../openapi/provider/caocao-provider-minimal.openapi.yaml", import.meta.url),
  ),
);
const controlContract = OpenApiContract.load(
  fileURLToPath(new URL("../openapi/control/fake-caocao-control.openapi.yaml", import.meta.url)),
);

const defaultControlCorsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const DRIVER_NO = "FAKE_DRIVER_001";
const DRIVER_NAME = "曹操测试司机";
const DRIVER_PHONE = "13900139000";
const VEHICLE_BRAND = "几何";
const VEHICLE_MODEL = "几何A";
const VEHICLE_COLOR = "白色";
const VEHICLE_PLATE = "浙A·TEST";
const CALLBACK_INFO_PATTERN =
  /^pu\.rhc\.v1\.(dev|stg|prod)\.([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const HANGZHOU_CITY_CODE = "0571";
const HANGZHOU_CITY_NAME = "杭州市";

const ACTIVE_MOVEMENT_POLL_INTERVAL_SECONDS = 2;
const ACTIVE_MOVEMENT_TIME_SCALE = 4;
const ACTIVE_MOVEMENT_MAX_PROGRESS_RATIO = 0.94;
const PICKUP_SPEED_KPH = 28;
const IN_TRIP_SPEED_KPH = 36;

export type FakeCaocaoServerAppInput = {
  readonly callbackBaseUrl?: string | null;
  readonly fixture: FakeCaocaoFixture;
  readonly routePlanner?: FakeCaocaoRoutePlanner | null;
  readonly state?: FakeCaocaoState;
  readonly verifyRequests?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

class FakeCaocaoProviderError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

class FakeCaocaoControlError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

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

type FakeCaocaoServiceTypePriceItem = {
  estimateKey: string;
  estimatePriceFen: number;
  serviceType: string;
};

class FakeCaocaoCallbackDeliveryError extends Error {
  constructor(
    readonly delivery: Extract<FakeCaocaoCallbackDelivery, { ok: false }>,
    readonly order: FakeCaocaoOrderState,
  ) {
    super(delivery.message);
  }
}

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

const jsonResponse = (
  payload: unknown,
  status: number,
  headers?: Record<string, string>,
): Response =>
  new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(headers ?? {}),
    },
    status,
  });

const readFirst = (value: Record<string, string>, key: string): string | null => {
  const raw = value[key]?.trim();
  return raw && raw.length > 0 ? raw : null;
};

const readStringField = (value: Record<string, unknown>, key: string): string | null => {
  const raw = value[key];
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
};

const readIntegerField = (value: Record<string, unknown>, key: string): number | null => {
  const raw = value[key];
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
};

const parseInteger = (value: string | null, field: string): number => {
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Expected integer field ${field}`);
  }
  return parsed;
};

const parseNumber = (value: string | null, field: string): number => {
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected numeric field ${field}`);
  }
  return parsed;
};

const parseServiceTypePrice = (value: string | null): FakeCaocaoServiceTypePriceItem[] => {
  if (!value) {
    throw new FakeCaocaoProviderError(40001, "Missing service_type_price");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new FakeCaocaoProviderError(40001, "Invalid service_type_price JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new FakeCaocaoProviderError(40001, "Invalid service_type_price list");
  }

  return parsed.map((item) => {
    if (!isRecord(item)) {
      throw new FakeCaocaoProviderError(40001, "Invalid service_type_price item");
    }
    const serviceType = readStringField(item, "serviceType");
    const estimateKey = readStringField(item, "estimateKey");
    const estimatePriceFen = readIntegerField(item, "estimatePrice");
    if (!serviceType || !estimateKey || estimatePriceFen === null) {
      throw new FakeCaocaoProviderError(40001, "Incomplete service_type_price item");
    }
    return {
      estimateKey,
      estimatePriceFen,
      serviceType,
    };
  });
};

const toCaocaoDateTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const fromIsoToCaocaoDateTime = (value: string | null | undefined): string | null =>
  value ? toCaocaoDateTime(value) : null;

const verifySignedParams = (input: {
  fixture: FakeCaocaoFixture;
  params: Record<string, string>;
  verifyRequests: boolean;
}): void => {
  if (!input.verifyRequests) return;

  const { sign, ...unsigned } = input.params;
  if (!sign) {
    throw new FakeCaocaoProviderError(406, "Missing Caocao sign");
  }
  if (unsigned.client_id !== input.fixture.clientId) {
    throw new FakeCaocaoProviderError(406, "Unexpected Caocao client_id");
  }

  const expected = createFakeCaocaoSignature({
    params: unsigned,
    signKey: input.fixture.signKey,
  });
  if (!fakeCaocaoSignaturesMatch(expected, sign)) {
    throw new FakeCaocaoProviderError(406, "Fake Caocao request signature verification failed");
  }
};

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
      coordinate: {
        latitude: 30.2688,
        longitude: 120.1608,
      },
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
    direction: snapshot.headingDegrees,
    driverName: DRIVER_NAME,
    driverPhone: DRIVER_PHONE,
    latitude: snapshot.coordinate.latitude,
    longitude: snapshot.coordinate.longitude,
    speedKph:
      order?.phase === "ACCEPTED" || order?.phase === "IN_TRIP"
        ? order.phase === "IN_TRIP"
          ? IN_TRIP_SPEED_KPH
          : PICKUP_SPEED_KPH
        : 0,
    vehicleBrand: VEHICLE_BRAND,
    vehicleColor: VEHICLE_COLOR,
    vehiclePlate: VEHICLE_PLATE,
  };
};

const estimatePriceKey = (estimate: FakeCaocaoVehicleEstimate): string =>
  `fake_quote_${estimate.carType}_${estimate.estimateAmountFen}`;

const estimateDetail = (estimate: FakeCaocaoVehicleEstimate) => {
  const baseAmount = Math.round(estimate.estimateAmountFen * 0.65);
  return [
    {
      amount: baseAmount,
      chargeCode: "base_fee",
      chargeDesc: "基础费",
    },
    {
      amount: estimate.estimateAmountFen - baseAmount,
      chargeCode: "distance_fee",
      chargeDesc: "里程费",
    },
  ];
};

const estimatePayload = (estimate: FakeCaocaoVehicleEstimate): unknown => ({
  carType: Number(estimate.carType),
  detail: estimateDetail(estimate),
  distance: estimate.distanceMeters,
  duration: estimate.durationSeconds,
  lineType: 0,
  name: estimate.carTypeName,
  originPrice: estimate.estimateAmountFen,
  price: estimate.estimateAmountFen,
  priceKey: estimatePriceKey(estimate),
});

const phaseStatusCode = (phase: FakeCaocaoOrderState["phase"]): string => {
  if (phase === "CREATED") return "1";
  if (phase === "ACCEPTED") return "9";
  if (phase === "ARRIVED_AT_PICKUP") return "12";
  if (phase === "IN_TRIP") return "3";
  if (phase === "FINISHED") return "5";
  return "20";
};

const hasDriverInfo = (order: FakeCaocaoOrderState): boolean =>
  order.acceptedAt !== null ||
  order.phase === "ACCEPTED" ||
  order.phase === "ARRIVED_AT_PICKUP" ||
  order.phase === "IN_TRIP" ||
  order.phase === "FINISHED";

const queryOrderDetailPayload = (order: FakeCaocaoOrderState): unknown => {
  const driver = hasDriverInfo(order) ? driverSnapshot(order) : null;
  return {
    basicOrderVO: {
      acceptCPDriver: 0,
      allowModifyDest: 1,
      beginChargeTime: fromIsoToCaocaoDateTime(order.serviceStartedAt),
      callbackInfo: order.callbackInfo,
      callerPhone: order.callerPhone,
      cityCode: order.cityCode,
      departureTime: order.departureTime,
      endAddress: order.endAddress,
      endName: order.endName,
      estimatePrice: order.estimatePriceFen,
      extOrderId: order.externalOrderId,
      fromLocation: {
        lat: order.origin.latitude,
        lng: order.origin.longitude,
      },
      invoiceStatus: 0,
      invoiced: 0,
      isRelayOrder: 0,
      orderId: order.providerOrderId,
      orderLocation: {
        lat: order.origin.latitude,
        lng: order.origin.longitude,
      },
      orderTime: fromIsoToCaocaoDateTime(order.createdAt),
      passengerName: order.passengerName,
      passengerPhone: order.passengerPhone,
      preOrderEndFlag: 0,
      realEndLocation: {
        lat: order.destination.latitude,
        lng: order.destination.longitude,
      },
      realStartLocation: {
        lat: order.origin.latitude,
        lng: order.origin.longitude,
      },
      requireLevel: Number(order.carType),
      startAddress: order.startAddress,
      startName: order.startName,
      startServiceTime: fromIsoToCaocaoDateTime(order.acceptedAt),
      status: phaseStatusCode(order.phase),
      toLocation: {
        lat: order.destination.latitude,
        lng: order.destination.longitude,
      },
      type: order.orderType,
    },
    driverInfoVo: driver
      ? {
          carBrand: driver.vehicleBrand,
          carType: VEHICLE_MODEL,
          carNo: driver.vehiclePlate,
          color: driver.vehicleColor,
          driverName: driver.driverName,
          driverNo: DRIVER_NO,
          driverPhone: driver.driverPhone,
          location: {
            direction: driver.direction,
            lat: driver.latitude,
            lng: driver.longitude,
            speed: driver.speedKph,
          },
          serviceType: Number(order.carType),
        }
      : null,
    orderFeeVo: {
      totalFee: order.phase === "FINISHED" ? order.finalAmountFen : null,
    },
  };
};

const queryCalculateBillAmountFen = (order: FakeCaocaoOrderState): number | null => {
  if (order.phase === "FINISHED") return order.finalAmountFen;
  if (order.phase === "CANCELLED" && order.cancelFeeFen > 0) return order.cancelFeeFen;
  return null;
};

const queryCalculateBillPayload = (order: FakeCaocaoOrderState): unknown => {
  const companyFee = queryCalculateBillAmountFen(order);
  if (companyFee === null) {
    throw new FakeCaocaoProviderError(25011, "订单状态不正确");
  }
  return {
    companyFee,
    personalFee: 0,
    totalFee: companyFee,
  };
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
  return 0;
};

const expectedNavigationPolylineTypeForPhase = (
  phase: FakeCaocaoOrderState["phase"],
): number | null => {
  if (phase === "ACCEPTED" || phase === "ARRIVED_AT_PICKUP") return 1;
  if (phase === "IN_TRIP") return 3;
  return null;
};

const queryDriverLocationPayload = (
  order: FakeCaocaoOrderState,
  plannedRoute: readonly FakeCaocaoCoordinate[],
): unknown => {
  const driver = driverSnapshot(order, plannedRoute);
  const movement = movementSnapshot(order, plannedRoute);
  return {
    direction: driver.direction,
    latitude: driver.latitude,
    longitude: driver.longitude,
    speed: driver.speedKph,
    travelKm: Math.max(0, Math.round(movement.remainingDistanceMeters / 1000)),
    travelMinute: Math.max(0, Math.round(movement.remainingDistanceMeters / 1000 / 0.45)),
  };
};

const queryDriverPolylinePayload = (
  order: FakeCaocaoOrderState,
  plannedRoute: readonly FakeCaocaoCoordinate[],
): unknown => {
  const polyline = routePolyline(order, plannedRoute);
  const driver = driverSnapshot(order, plannedRoute);
  const remainingDistanceMeters = Math.round(polylineLengthMeters(polyline));
  const speedKph = driver.speedKph > 0 ? driver.speedKph : PICKUP_SPEED_KPH;
  const remainingDurationSeconds =
    remainingDistanceMeters > 0 ? Math.round(remainingDistanceMeters / (speedKph / 3.6)) : 0;
  return {
    allLength: remainingDistanceMeters,
    allTime: remainingDurationSeconds,
    driverEtaInfoVO: {
      curLinkIndex: polyline.length > 0 ? 0 : -1,
      curPointIndex: polyline.length > 0 ? 0 : -1,
      curStepIndex: polyline.length > 0 ? 0 : -1,
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
    driverNo: DRIVER_NO,
    navigationPolylineType: navigationPolylineType(order),
    orderNo: order.providerOrderId,
    pathId: `${order.providerOrderId}-fake-path`,
    steps:
      polyline.length > 0
        ? [
            {
              length: remainingDistanceMeters,
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

const buildCallbackFormRecord = (input: {
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  event: number;
}): FakeCaocaoSignedParams => {
  const driver = hasDriverInfo(input.order) ? driverSnapshot(input.order) : null;
  const unsigned: FakeCaocaoSignedParams = {
    event: String(input.event),
    ...(input.order.callbackInfo ? { callback_info: input.order.callbackInfo } : {}),
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
  return {
    ...unsigned,
    sign: createFakeCaocaoSignature({
      params: unsigned,
      signKey: input.fixture.signKey,
    }),
  };
};

const readResponseBodyPreview = async (response: Response): Promise<string | null> => {
  const body = await response.text().catch(() => "");
  const trimmed = body.trim();
  if (!trimmed) return null;
  return trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed;
};

const isSuccessfulCallbackAck = (bodyPreview: string | null): boolean => {
  if (!bodyPreview) return false;
  try {
    const parsed = JSON.parse(bodyPreview) as unknown;
    return isRecord(parsed) && parsed.code === 200 && parsed.success === true;
  } catch {
    return false;
  }
};

const resolveCallbackUrl = (input: {
  callbackBaseUrl?: string | null;
  callbackInfo: string | null;
}): string | null => {
  if (!input.callbackBaseUrl || !input.callbackInfo) return null;
  const match = CALLBACK_INFO_PATTERN.exec(input.callbackInfo);
  if (!match?.[2]) return null;
  return new URL(
    `/api/ride-hailing/caocao/${match[2]}/callback/order-status`,
    input.callbackBaseUrl,
  ).toString();
};

const postCallback = async (input: {
  callbackUrl: string;
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  event: number;
}): Promise<FakeCaocaoCallbackDelivery> => {
  try {
    const formRecord = buildCallbackFormRecord(input);
    providerContract.validateBody("notifyOrderStatus", formRecord);
    const response = await fetch(input.callbackUrl, {
      body: new URLSearchParams(formRecord).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });
    const bodyPreview = await readResponseBodyPreview(response);
    if (response.ok && isSuccessfulCallbackAck(bodyPreview)) {
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
      message: response.ok
        ? "Fake Caocao callback response did not acknowledge success"
        : `Fake Caocao callback POST failed with HTTP ${response.status}`,
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
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  state: FakeCaocaoState;
}): void => {
  if (!input.order.callbackUrl) return;
  const acceptedOrder = input.state.setOrderPhase(input.order.providerOrderId, "ACCEPTED");
  if (!acceptedOrder) return;
  setTimeout(() => {
    postCallback({
      callbackUrl: input.order.callbackUrl!,
      event: phaseEvent(acceptedOrder.phase),
      fixture: input.fixture,
      order: acceptedOrder,
    }).catch(() => undefined);
  }, 0);
};

const providerJson = (c: Context, operationId: string, payload: unknown): Response => {
  providerContract.validateResponse(operationId, 200, payload);
  return c.json(payload, 200);
};

const controlJson = (c: Context, operationId: string, payload: unknown): Response => {
  controlContract.validateResponse(operationId, 200, payload);
  return c.json(payload, 200);
};

const parseProviderRequest = async (
  c: Context,
  operation: OpenApiIndexedOperation,
): Promise<{
  body: Record<string, string> | Record<string, unknown>;
  path: Record<string, string>;
  query: Record<string, string>;
  signedParams: Record<string, string>;
}> => {
  const url = new URL(c.req.url);
  const path = providerContract.validatePath(operation.operationId, readPathParams(c.req.param()));
  const query = providerContract.validateQuery(operation.operationId, readQueryParams(url));
  if (!operation.requestBody) {
    return {
      body: {},
      path,
      query,
      signedParams: query,
    };
  }

  if (operation.requestBody.contentType === "application/x-www-form-urlencoded") {
    const bodyText = await c.req.text();
    const form = providerContract.validateBody(
      operation.operationId,
      readFormBody(bodyText),
    ) as Record<string, string>;
    return {
      body: form,
      path,
      query,
      signedParams: form,
    };
  }

  const json = providerContract.validateBody(
    operation.operationId,
    expectJsonObject(await c.req.json()),
  ) as Record<string, unknown>;
  return {
    body: json,
    path,
    query,
    signedParams: {},
  };
};

const parseControlRequest = async (
  c: Context,
  operation: OpenApiIndexedOperation,
): Promise<{
  body: Record<string, string> | Record<string, unknown>;
  path: Record<string, string>;
  query: Record<string, string>;
}> => {
  const url = new URL(c.req.url);
  const path = controlContract.validatePath(operation.operationId, readPathParams(c.req.param()));
  const query = controlContract.validateQuery(operation.operationId, readQueryParams(url));
  if (!operation.requestBody) {
    return {
      body: {},
      path,
      query,
    };
  }

  if (operation.requestBody.contentType === "application/json") {
    const body = controlContract.validateBody(
      operation.operationId,
      expectJsonObject(await c.req.json()),
    ) as Record<string, unknown>;
    return {
      body,
      path,
      query,
    };
  }

  const bodyText = await c.req.text();
  const body = controlContract.validateBody(
    operation.operationId,
    readFormBody(bodyText),
  ) as Record<string, string>;
  return {
    body,
    path,
    query,
  };
};

const providerRoute =
  (
    operationId: string,
    path: string,
    handler: (input: {
      body: Record<string, string> | Record<string, unknown>;
      path: Record<string, string>;
      query: Record<string, string>;
    }) => Promise<unknown>,
    input: Required<Pick<FakeCaocaoServerAppInput, "fixture" | "verifyRequests">>,
  ) =>
  async (c: Context): Promise<Response> => {
    const operation = providerContract.getOperation(operationId);
    assertOperationMatches(operation, c.req.method, path);
    try {
      const request = await parseProviderRequest(c, operation);
      verifySignedParams({
        fixture: input.fixture,
        params: request.signedParams,
        verifyRequests: input.verifyRequests,
      });
      const payload = await handler(request);
      return providerJson(c, operationId, payload);
    } catch (error) {
      if (error instanceof FakeCaocaoProviderError) {
        return c.json(caocaoFailure(error.code, error.message), 200);
      }
      if (error instanceof OpenApiValidationError) {
        return c.json(caocaoFailure(40001, error.issues.join("; ")), 200);
      }
      return c.json(
        caocaoFailure(40001, error instanceof Error ? error.message : "Unknown fake error"),
        200,
      );
    }
  };

const controlRoute =
  (
    operationId: string,
    path: string,
    handler: (input: {
      body: Record<string, string> | Record<string, unknown>;
      path: Record<string, string>;
      query: Record<string, string>;
    }) => Promise<unknown>,
  ) =>
  async (c: Context): Promise<Response> => {
    const operation = controlContract.getOperation(operationId);
    assertOperationMatches(operation, c.req.method, path);
    try {
      const request = await parseControlRequest(c, operation);
      const payload = await handler(request);
      return controlJson(c, operationId, payload);
    } catch (error) {
      if (error instanceof FakeCaocaoCallbackDeliveryError) {
        return jsonResponse(
          {
            callback: error.delivery,
            code: "FAKE_CAOCAO_CALLBACK_DELIVERY_FAILED",
            message: error.message,
            order: error.order,
          },
          502,
        );
      }
      if (error instanceof FakeCaocaoControlError) {
        return jsonResponse(
          {
            code: error.code,
            message: error.message,
          },
          error.status,
        );
      }
      if (error instanceof OpenApiValidationError) {
        return jsonResponse(
          {
            code: "FAKE_CAOCAO_CONTROL_VALIDATION_FAILED",
            message: error.issues.join("; "),
          },
          400,
        );
      }
      return jsonResponse(
        {
          code: "FAKE_CAOCAO_ERROR",
          message: error instanceof Error ? error.message : "Unknown fake error",
        },
        400,
      );
    }
  };

export function createFakeCaocaoApp(input: FakeCaocaoServerAppInput): Hono {
  const state = input.state ?? new FakeCaocaoStateStore();
  const verifyRequests = input.verifyRequests ?? true;
  const app = new Hono();

  app.use("/__fake_caocao/*", async (c, next) => {
    if (c.req.method === "OPTIONS") {
      return new Response(null, {
        headers: defaultControlCorsHeaders,
        status: 204,
      });
    }
    await next();
    for (const [key, value] of Object.entries(defaultControlCorsHeaders)) {
      c.res.headers.set(key, value);
    }
  });

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get(
    "/common/queryCity",
    providerRoute(
      "queryCity",
      "/common/queryCity",
      async () =>
        caocaoSuccess({
          city_code: HANGZHOU_CITY_CODE,
          city_name: HANGZHOU_CITY_NAME,
        }),
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.get(
    "/common/estimatePriceWithDetail",
    providerRoute(
      "estimatePriceWithDetail",
      "/common/estimatePriceWithDetail",
      async ({ query }) => {
        const carType = readFirst(query, "car_type");
        if (!carType) {
          throw new FakeCaocaoProviderError(40001, "Missing car_type");
        }
        const estimate = state.findAvailableEstimate(carType);
        if (!estimate) {
          throw new FakeCaocaoProviderError(47001, "Fake Caocao vehicle unavailable");
        }
        return caocaoSuccess(estimatePayload(estimate));
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/common/orderCarV2",
    providerRoute(
      "orderCarV2",
      "/common/orderCarV2",
      async ({ body }) => {
        const form = body as Record<string, string>;
        if (state.consumeNextCreateFailure()) {
          throw new FakeCaocaoProviderError(50001, "Fake Caocao create failed");
        }

        const externalOrderId = readFirst(form, "ext_order_id");
        if (!externalOrderId) {
          throw new FakeCaocaoProviderError(40001, "Missing create order payload");
        }
        const isSimultaneouslyCall = readFirst(form, "is_simultaneously_call") === "1";
        const serviceTypePriceItems = isSimultaneouslyCall
          ? parseServiceTypePrice(readFirst(form, "service_type_price"))
          : null;
        const carType = serviceTypePriceItems?.[0]?.serviceType ?? readFirst(form, "car_type");
        if (!carType) {
          throw new FakeCaocaoProviderError(40001, "Missing create order car type");
        }
        const estimatePriceFen =
          serviceTypePriceItems?.[0]?.estimatePriceFen ??
          parseInteger(readFirst(form, "estimate_price"), "estimate_price");
        const callbackInfo = readFirst(form, "callback_info");
        const callbackUrl = resolveCallbackUrl({
          callbackBaseUrl: input.callbackBaseUrl,
          callbackInfo,
        });
        const order = state.createOrder({
          callbackInfo,
          callbackUrl,
          callerPhone: readFirst(form, "caller_phone"),
          carType,
          cityCode: readFirst(form, "city_code"),
          departureTime: readFirst(form, "departure_time"),
          destination: {
            latitude: parseNumber(readFirst(form, "to_latitude"), "to_latitude"),
            longitude: parseNumber(readFirst(form, "to_longitude"), "to_longitude"),
          },
          endAddress: readFirst(form, "end_address"),
          endName: readFirst(form, "end_name"),
          estimatePriceFen,
          externalOrderId,
          orderType: parseInteger(readFirst(form, "order_type"), "order_type"),
          origin: {
            latitude: parseNumber(readFirst(form, "from_latitude"), "from_latitude"),
            longitude: parseNumber(readFirst(form, "from_longitude"), "from_longitude"),
          },
          passengerName: readFirst(form, "passenger_name"),
          passengerPhone: readFirst(form, "passenger_phone") ?? readFirst(form, "caller_phone"),
          startAddress: readFirst(form, "start_address"),
          startName: readFirst(form, "start_name"),
          submittedCarTypes: serviceTypePriceItems?.map((item) => item.serviceType) ?? [carType],
        });
        maybePostCreateCallback({
          fixture: input.fixture,
          order,
          state,
        });
        return caocaoSuccess({
          orderNo: order.providerOrderId,
        });
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.get(
    "/common/queryOrderDetailV2",
    providerRoute(
      "queryOrderDetailV2",
      "/common/queryOrderDetailV2",
      async ({ query }) => {
        const providerOrderId = readFirst(query, "order_id");
        const order = providerOrderId ? state.findOrder(providerOrderId) : null;
        if (!order) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        return caocaoSuccess(queryOrderDetailPayload(order));
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.get(
    "/common/queryDriverLocationByOrderId",
    providerRoute(
      "queryDriverLocationByOrderId",
      "/common/queryDriverLocationByOrderId",
      async ({ query }) => {
        const providerOrderId = readFirst(query, "order_id");
        const order = providerOrderId ? state.findOrder(providerOrderId) : null;
        if (!order) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        const plannedRoute = await resolveMovementRoute({
          order,
          routeKind: movementRouteKind(order),
          routePlanner: input.routePlanner,
          state,
        });
        return caocaoSuccess(queryDriverLocationPayload(order, plannedRoute));
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/common/queryDriverPolyline",
    providerRoute(
      "queryDriverPolyline",
      "/common/queryDriverPolyline",
      async ({ body }) => {
        const form = body as Record<string, string>;
        const providerOrderId = readFirst(form, "order_id");
        const navigationPolylineTypeRaw = readFirst(form, "navigation_polyline_type");
        const order = providerOrderId ? state.findOrder(providerOrderId) : null;
        if (!order) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        if (!navigationPolylineTypeRaw) {
          throw new FakeCaocaoProviderError(40001, "Missing navigation_polyline_type");
        }
        const navigationPolylineType = Number(navigationPolylineTypeRaw);
        if (
          !Number.isInteger(navigationPolylineType) ||
          (navigationPolylineType !== 1 && navigationPolylineType !== 3)
        ) {
          throw new FakeCaocaoProviderError(40001, "Invalid navigation_polyline_type");
        }
        const expectedNavigationPolylineType = expectedNavigationPolylineTypeForPhase(order.phase);
        if (
          expectedNavigationPolylineType === null ||
          navigationPolylineType !== expectedNavigationPolylineType
        ) {
          throw new FakeCaocaoProviderError(25011, "订单状态不正确");
        }
        const plannedRoute = await resolveMovementRoute({
          order,
          routeKind: movementRouteKind(order),
          routePlanner: input.routePlanner,
          state,
        });
        const payload = queryDriverPolylinePayload(order, plannedRoute);
        if (order.phase === "ACCEPTED" || order.phase === "IN_TRIP") {
          state.advanceOrderMovement(order.providerOrderId);
        }
        return caocaoSuccess(payload);
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/common/cancelOrderV3",
    providerRoute(
      "cancelOrderV3",
      "/common/cancelOrderV3",
      async ({ body }) => {
        const form = body as Record<string, string>;
        const providerOrderId = readFirst(form, "order_id");
        const order = providerOrderId ? state.cancelOrder(providerOrderId) : null;
        if (!order) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        return caocaoSuccess({
          cancelFee: order.cancelFeeFen,
          orderNo: order.providerOrderId,
        });
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.get(
    "/common/queryCancelFee",
    providerRoute(
      "queryCancelFee",
      "/common/queryCancelFee",
      async ({ query }) => {
        const providerOrderId = readFirst(query, "order_no");
        const order = providerOrderId ? state.findOrder(providerOrderId) : null;
        const cancelFeeFen = providerOrderId ? state.previewCancelFee(providerOrderId) : null;
        if (!order || cancelFeeFen === null) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        return caocaoSuccess({
          cancelFee: cancelFeeFen,
          orderNo: order.providerOrderId,
        });
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/common/queryCalculateBill",
    providerRoute(
      "queryCalculateBill",
      "/common/queryCalculateBill",
      async ({ body }) => {
        const form = body as Record<string, string>;
        const providerOrderId = readFirst(form, "order_id");
        if (!providerOrderId) {
          throw new FakeCaocaoProviderError(40001, "Missing order_id");
        }
        const order = state.findOrder(providerOrderId);
        if (!order) {
          throw new FakeCaocaoProviderError(40401, "Fake Caocao order not found");
        }
        return caocaoSuccess(queryCalculateBillPayload(order));
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/common/feeConfirm",
    providerRoute(
      "feeConfirm",
      "/common/feeConfirm",
      async ({ body }) => {
        const form = body as Record<string, string>;
        const providerOrderId = readFirst(form, "order_id");
        if (!providerOrderId) {
          throw new FakeCaocaoProviderError(40001, "Missing order_id");
        }
        state.confirmFee({
          allowanceAmountFen: parseInteger(readFirst(form, "allowance_amount"), "allowance_amount"),
          caocaoAllowanceAmountFen: parseInteger(
            readFirst(form, "cao_allowance_amount"),
            "cao_allowance_amount",
          ),
          providerOrderId,
        });
        return caocaoSuccess(null);
      },
      {
        fixture: input.fixture,
        verifyRequests,
      },
    ),
  );

  app.post(
    "/__fake_caocao/reset",
    controlRoute("controlReset", "/__fake_caocao/reset", async () => {
      state.reset();
      return {
        ok: true,
      };
    }),
  );

  app.post(
    "/__fake_caocao/create-failure/next",
    controlRoute("controlNextCreateFailure", "/__fake_caocao/create-failure/next", async () => {
      state.configureNextCreateFailure();
      return {
        ok: true,
      };
    }),
  );

  app.post(
    "/__fake_caocao/estimates",
    controlRoute("controlUpdateEstimate", "/__fake_caocao/estimates", async ({ body }) => {
      const json = body as Record<string, unknown>;
      const estimate = state.updateEstimate({
        carType: String(json.carType),
        carTypeName: typeof json.carTypeName === "string" ? json.carTypeName : undefined,
        distanceMeters: typeof json.distanceMeters === "number" ? json.distanceMeters : undefined,
        durationSeconds:
          typeof json.durationSeconds === "number" ? json.durationSeconds : undefined,
        estimateAmountFen: Number(json.estimateAmountFen),
      });
      return {
        estimate,
        ok: true,
      };
    }),
  );

  app.post(
    "/__fake_caocao/estimates/availability",
    controlRoute(
      "controlEstimateAvailability",
      "/__fake_caocao/estimates/availability",
      async ({ body }) => {
        const json = body as Record<string, unknown>;
        const estimate = state.setEstimateAvailability({
          available: Boolean(json.available),
          carType: String(json.carType),
        });
        return {
          estimate,
          ok: true,
        };
      },
    ),
  );

  app.get(
    "/__fake_caocao/state",
    controlRoute("controlState", "/__fake_caocao/state", async () => state.snapshot()),
  );

  app.post(
    "/__fake_caocao/orders/latest/advance",
    controlRoute("controlAdvanceLatestOrder", "/__fake_caocao/orders/latest/advance", async () => {
      const order = state.advanceLatestNonTerminalOrder();
      if (!order) {
        throw new FakeCaocaoControlError(
          "FAKE_CAOCAO_ORDER_NOT_FOUND",
          404,
          "No non-terminal fake Caocao order found",
        );
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      return {
        callback,
        ok: true,
        order,
      };
    }),
  );

  app.post(
    "/__fake_caocao/orders/latest/retreat",
    controlRoute("controlRetreatLatestOrder", "/__fake_caocao/orders/latest/retreat", async () => {
      const order = state.retreatLatestOrder();
      if (!order) {
        throw new FakeCaocaoControlError(
          "FAKE_CAOCAO_ORDER_NOT_FOUND",
          404,
          "No retreatable fake Caocao order found",
        );
      }
      const callback = await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      assertCallbackDelivered(callback, order);
      return {
        callback,
        ok: true,
        order,
      };
    }),
  );

  app.post(
    "/__fake_caocao/orders/:providerOrderId/advance",
    controlRoute(
      "controlAdvanceOrder",
      "/__fake_caocao/orders/:providerOrderId/advance",
      async ({ path }) => {
        const order = state.advanceOrderPhase(path.providerOrderId);
        if (!order) {
          throw new FakeCaocaoControlError(
            "FAKE_CAOCAO_ORDER_NOT_FOUND",
            404,
            "Fake Caocao order not found",
          );
        }
        const callback = await postOrderPhaseCallback({
          fixture: input.fixture,
          order,
        });
        assertCallbackDelivered(callback, order);
        return {
          callback,
          ok: true,
          order,
        };
      },
    ),
  );

  app.post(
    "/__fake_caocao/orders/:providerOrderId/retreat",
    controlRoute(
      "controlRetreatOrder",
      "/__fake_caocao/orders/:providerOrderId/retreat",
      async ({ path }) => {
        const existingOrder = state.findOrder(path.providerOrderId);
        if (!existingOrder) {
          throw new FakeCaocaoControlError(
            "FAKE_CAOCAO_ORDER_NOT_FOUND",
            404,
            "Fake Caocao order not found",
          );
        }
        const order = state.retreatOrderPhase(path.providerOrderId);
        if (!order) {
          throw new FakeCaocaoControlError(
            "FAKE_CAOCAO_ORDER_PHASE_NOT_RETREATABLE",
            409,
            `Fake Caocao order phase cannot retreat: ${existingOrder.phase}`,
          );
        }
        const callback = await postOrderPhaseCallback({
          fixture: input.fixture,
          order,
        });
        assertCallbackDelivered(callback, order);
        return {
          callback,
          ok: true,
          order,
        };
      },
    ),
  );

  app.post(
    "/__fake_caocao/orders/:providerOrderId/phase",
    controlRoute(
      "controlSetOrderPhase",
      "/__fake_caocao/orders/:providerOrderId/phase",
      async ({ path, query }) => {
        const phase = parseOrderPhase(readFirst(query, "phase"));
        if (!phase) {
          throw new FakeCaocaoControlError(
            "FAKE_CAOCAO_UNSUPPORTED_ORDER_PHASE",
            400,
            "Unsupported fake Caocao order phase",
          );
        }
        const order = state.setOrderPhase(path.providerOrderId, phase);
        if (!order) {
          throw new FakeCaocaoControlError(
            "FAKE_CAOCAO_ORDER_NOT_FOUND",
            404,
            "Fake Caocao order not found",
          );
        }
        const callback = await postOrderPhaseCallback({
          fixture: input.fixture,
          order,
        });
        assertCallbackDelivered(callback, order);
        return {
          callback,
          ok: true,
          order,
        };
      },
    ),
  );

  app.notFound((c) =>
    jsonResponse(
      {
        code: "FAKE_CAOCAO_NOT_FOUND",
        message: `Unknown fake Caocao route: ${new URL(c.req.url).pathname}`,
      },
      404,
    ),
  );

  return app;
}
