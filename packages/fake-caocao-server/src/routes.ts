import type { IncomingMessage, ServerResponse } from "node:http";
import type { FakeCaocaoFixture } from "./fixtures";
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

const interpolateCoordinate = (
  from: FakeCaocaoCoordinate,
  to: FakeCaocaoCoordinate,
  ratio: number,
): FakeCaocaoCoordinate => ({
  latitude: from.latitude + (to.latitude - from.latitude) * ratio,
  longitude: from.longitude + (to.longitude - from.longitude) * ratio,
});

const driverCoordinate = (order: FakeCaocaoOrderState | null): FakeCaocaoCoordinate => {
  if (!order) return defaultDriverLocation();
  if (order.phase === "ARRIVED_AT_PICKUP") return order.origin;
  if (order.phase === "IN_TRIP")
    return interpolateCoordinate(order.origin, order.destination, 0.45);
  if (order.phase === "FINISHED") return order.destination;
  return interpolateCoordinate(order.origin, order.destination, -0.12);
};

const driverSnapshot = (order: FakeCaocaoOrderState | null = null): FakeCaocaoDriverSnapshot => {
  const coordinate = driverCoordinate(order);
  return {
    driverName: "曹操测试司机",
    driverPhone: "13900139000",
    direction: order?.phase === "IN_TRIP" ? 88 : 15,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    speedKph: order?.phase === "ARRIVED_AT_PICKUP" ? 0 : 28,
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

const routePolyline = (order: FakeCaocaoOrderState): FakeCaocaoCoordinate[] => {
  if (order.phase === "ACCEPTED") {
    return [driverCoordinate(order), order.origin];
  }
  if (order.phase === "IN_TRIP") {
    return [
      driverCoordinate(order),
      interpolateCoordinate(order.origin, order.destination, 0.72),
      order.destination,
    ];
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

const driverLocationPayload = (order: FakeCaocaoOrderState): unknown => {
  const driver = driverSnapshot(order);
  return {
    direction: driver.direction,
    latitude: driver.latitude,
    longitude: driver.longitude,
    speed: driver.speedKph,
  };
};

const driverPolylinePayload = (order: FakeCaocaoOrderState): unknown => {
  const polyline = routePolyline(order);
  const driver = driverSnapshot(order);
  return {
    allLength: order.phase === "ACCEPTED" ? 820 : order.phase === "IN_TRIP" ? 4300 : 0,
    allTime: order.phase === "ACCEPTED" ? 240 : order.phase === "IN_TRIP" ? 900 : 0,
    driverEtaInfoVO: {
      direction: driver.direction,
      isMatchNaviPath: 1,
      lat: driver.latitude,
      lng: driver.longitude,
      remainDistance: order.phase === "ACCEPTED" ? 820 : order.phase === "IN_TRIP" ? 4300 : 0,
      remainLightCount: order.phase === "IN_TRIP" ? 3 : 0,
      remainTime: order.phase === "ACCEPTED" ? 240 : order.phase === "IN_TRIP" ? 900 : 0,
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
                  length: order.phase === "ACCEPTED" ? 820 : 4300,
                  time: order.phase === "ACCEPTED" ? 240 : 900,
                },
              ],
              time: order.phase === "ACCEPTED" ? 240 : 900,
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

const postCallback = async (input: {
  callbackUrl: string;
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
  event: number;
}): Promise<void> => {
  await fetch(input.callbackUrl, {
    body: buildCallbackForm(input).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
};

const postOrderPhaseCallback = async (input: {
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
}): Promise<void> => {
  if (!input.order.callbackUrl) return;
  await postCallback({
    callbackUrl: input.order.callbackUrl,
    event: phaseEvent(input.order.phase),
    fixture: input.fixture,
    order: input.order,
  });
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
      await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      sendJson(res, 200, { ok: true, order });
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
      await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      sendJson(res, 200, { ok: true, order });
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
      await postOrderPhaseCallback({
        fixture: input.fixture,
        order,
      });
      sendJson(res, 200, { ok: true, order });
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
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess(driverLocationPayload(order))
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
      return;
    }

    if (url.pathname === "/common/queryDriverPolylineV2" && req.method === "POST") {
      const providerOrderId = readFirstParam(params, ["order_id", "order_no"]);
      const order = providerOrderId ? input.state.findOrder(providerOrderId) : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess(driverPolylinePayload(order))
          : caocaoFailure(40401, "Fake Caocao order not found"),
      );
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
    sendJson(res, 400, {
      code: "FAKE_CAOCAO_ERROR",
      message: error instanceof Error ? error.message : "Unknown fake error",
    });
  }
}
