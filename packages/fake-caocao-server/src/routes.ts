import type { IncomingMessage, ServerResponse } from "node:http";
import type { FakeCaocaoFixture } from "./fixtures";
import {
  createFakeCaocaoSignature,
  fakeCaocaoSignaturesMatch,
  type FakeCaocaoSignedParams,
} from "./signature";
import type {
  FakeCaocaoDriverSnapshot,
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

const sendJson = (
  res: ServerResponse,
  status: number,
  value: unknown,
): void => {
  res.writeHead(status, defaultHeaders);
  res.end(JSON.stringify(value));
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

const readParams = async (
  req: IncomingMessage,
  url: URL,
): Promise<Record<string, string>> => {
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
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, String(value)]),
    );
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

const readFirstParam = (
  params: Record<string, string>,
  keys: string[],
): string | null => {
  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) return value;
  }
  return null;
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

const driverSnapshot = (): FakeCaocaoDriverSnapshot => ({
  driverName: "曹操测试司机",
  driverPhone: "13900139000",
  latitude: 30.2688,
  longitude: 120.1608,
  vehicleBrand: "几何",
  vehicleColor: "白色",
  vehiclePlate: "浙A·TEST",
});

const phaseEvent = (phase: FakeCaocaoOrderState["phase"]): number => {
  if (phase === "ACCEPTED") return 20;
  if (phase === "IN_TRIP") return 40;
  if (phase === "FINISHED") return 45;
  if (phase === "CANCELLED") return 13;
  return 1;
};

const orderDetailPayload = (order: FakeCaocaoOrderState): unknown => {
  const driver =
    order.phase === "ACCEPTED" ||
    order.phase === "IN_TRIP" ||
    order.phase === "FINISHED"
      ? driverSnapshot()
      : null;
  return {
    actual_price: order.phase === "FINISHED" ? order.finalAmountFen : null,
    driver,
    event: phaseEvent(order.phase),
    ext_order_id: order.externalOrderId,
    finalAmountFen: order.phase === "FINISHED" ? order.finalAmountFen : null,
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
  const unsigned: FakeCaocaoSignedParams = {
    event: String(input.event),
    ext_order_id: input.order.externalOrderId,
    order_id: input.order.providerOrderId,
    timestamp: String(Date.now()),
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

const maybePostCreateCallback = (input: {
  callbackUrl: string | null;
  fixture: FakeCaocaoFixture;
  order: FakeCaocaoOrderState;
}): void => {
  if (!input.callbackUrl) return;
  setTimeout(() => {
    postCallback({
      callbackUrl: input.callbackUrl!,
      event: 20,
      fixture: input.fixture,
      order: input.order,
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
    if (url.pathname === "/__fake_caocao/reset" && req.method === "POST") {
      await readBodyText(req);
      input.state.reset();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      url.pathname === "/__fake_caocao/create-failure/next" &&
      req.method === "POST"
    ) {
      await readBodyText(req);
      input.state.configureNextCreateFailure();
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/__fake_caocao/state" && req.method === "GET") {
      sendJson(res, 200, input.state.snapshot());
      return;
    }

    const params = await readParams(req, url);
    verifySignedParams({
      fixture: input.fixture,
      params,
      verifyRequests: input.verifyRequests,
    });

    if (url.pathname === "/common/estimatePriceWithDetail") {
      const carType =
        readFirstParam(params, ["car_type", "carType", "vehicle_type"]) ??
        "EXPRESS";
      const estimate = input.state.findEstimate(carType);
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
      const carType =
        readFirstParam(params, ["car_type", "carType", "vehicle_type"]) ??
        "EXPRESS";
      const order = input.state.createOrder({ carType, externalOrderId });
      maybePostCreateCallback({
        callbackUrl: readFirstParam(params, [
          "callback_url",
          "callbackUrl",
          "notify_url",
          "notifyUrl",
          "order_status_callback_url",
        ]),
        fixture: input.fixture,
        order,
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
      const order = providerOrderId
        ? input.state.advanceOrderDetail(providerOrderId)
        : null;
      sendJson(
        res,
        200,
        order
          ? caocaoSuccess(orderDetailPayload(order))
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
        caocaoAllowanceAmountFen:
          Number(params.cao_allowance_amount ?? 0) || null,
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
