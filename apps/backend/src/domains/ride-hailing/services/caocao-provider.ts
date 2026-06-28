import { createHash, timingSafeEqual } from "node:crypto";
import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  CaocaoOrderStatusCallback,
  CaocaoOrderStatusCallbackEvent,
  CaocaoProviderInstanceConfig,
  CaocaoRawResponse,
  CaocaoSignedParams,
  RideHailingProviderCancelInput,
  RideHailingProviderConfirmFeeInput,
  RideHailingProviderCreateRideInput,
  RideHailingProviderEstimateInput,
  RideHailingProviderNavigationRoute,
  RideHailingProviderNavigationRouteKind,
  RideHailingProviderNavigationRouteQueryKind,
  RideHailingProviderOrderDetail,
  RideHailingProviderPort,
  RideHailingProviderVehicleLocation,
  RideHailingProviderVehicleQuote,
} from "../model";

type CaocaoParamValue = string | number | boolean | null | undefined;
type CaocaoParamInput = Record<string, CaocaoParamValue>;

const EXTERNAL_ORDER_ID_PREFIX = "rh";
const UUID_BASE36_ALPHABET = /^[0-9a-z]+$/;
const CAOCAO_CALLBACK_INFO_PREFIX = "pu.rhc.v1";
const CAOCAO_CALLBACK_INFO_PROVIDER_INSTANCE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAOCAO_ORDER_STATUS_CALLBACK_EVENTS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 9, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26, 27, 40, 41, 42, 43, 44, 45, 46,
  47, 48, 49, 50,
]);

export type CaocaoCallbackRoutingToken = "dev" | "prod" | "stg";

export type CaocaoCallbackInfoRoute = {
  providerInstanceId: string;
  routingToken: CaocaoCallbackRoutingToken;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRequiredStringField = (value: unknown, key: string): string => {
  if (isRecord(value) && typeof value[key] === "string" && value[key].length > 0) {
    return value[key];
  }
  if (isRecord(value) && typeof value[key] === "number") {
    return String(value[key]);
  }
  throw new Error(`Expected string field ${key}`);
};

const readRequiredNumberField = (value: unknown, key: string): number => {
  if (isRecord(value) && typeof value[key] === "number" && Number.isFinite(value[key])) {
    return value[key];
  }
  throw new Error(`Expected number field ${key}`);
};

const readOptionalNumberField = (value: unknown, keys: string[]): number | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
};

const readOptionalStringField = (value: unknown, keys: string[]): string | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return null;
};

const readOptionalRecordField = (
  value: unknown,
  keys: string[],
): Record<string, unknown> | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) return candidate;
  }
  return null;
};

const readOptionalArrayField = (value: unknown, keys: string[]): unknown[] | null => {
  if (!isRecord(value)) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return null;
};

const readOptionalNumberFromRecord = (
  value: Record<string, unknown> | null,
  keys: string[],
): number | null => readOptionalNumberField(value, keys);

const buildCaocaoStatusLabel = (phase: string): string => {
  if (phase === "FINISHED" || ["5", "6", "7", "8"].includes(phase)) return "待支付";
  if (phase === "IN_TRIP" || phase === "3") return "行程中";
  if (phase === "ARRIVED_AT_PICKUP" || phase === "12") return "司机已到达";
  if (phase === "ACCEPTED" || phase === "9") return "接客中";
  if (phase === "2") return "已派单";
  if (phase === "CANCELLED" || ["4", "10", "13", "14", "20", "21", "26", "27"].includes(phase)) {
    return "已取消";
  }
  return "正在呼叫";
};

const parseCaocaoVehicleLocation = (raw: unknown): RideHailingProviderVehicleLocation | null => {
  if (!isRecord(raw)) return null;
  const locationRaw = readOptionalRecordField(raw, [
    "location",
    "driverLocation",
    "driverLocationVO",
    "driverEtaInfoVO",
    "driverEtaInfoVo",
  ]);
  const source = locationRaw ?? raw;
  const latitude = readOptionalNumberField(source, ["latitude", "lat"]);
  const longitude = readOptionalNumberField(source, ["longitude", "lng"]);
  if (latitude === null || longitude === null) return null;
  return {
    capturedAt: readOptionalStringField(source, [
      "capturedAt",
      "timestamp",
      "locationTime",
      "location_time",
    ]),
    headingDegrees: readOptionalNumberField(source, ["headingDegrees", "direction", "heading"]),
    latitude,
    longitude,
    providerSnapshot: raw,
    speedKph: readOptionalNumberField(source, ["speedKph", "speed"]),
  };
};

const parseCaocaoCoordinates = (coords: string): RideHailingProviderNavigationRoute["polyline"] =>
  coords
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const [latitudeRaw, longitudeRaw] = item.split(",");
      const latitude = Number(latitudeRaw);
      const longitude = Number(longitudeRaw);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
    })
    .filter((point): point is { latitude: number; longitude: number } => point !== null);

const parseCaocaoStepPolyline = (
  stepsRaw: unknown[] | null,
): RideHailingProviderNavigationRoute["polyline"] => {
  if (!stepsRaw) return [];
  const points: RideHailingProviderNavigationRoute["polyline"] = [];
  for (const stepRaw of stepsRaw) {
    const linksRaw = readOptionalArrayField(stepRaw, ["links"]);
    if (!linksRaw) continue;
    for (const linkRaw of linksRaw) {
      const coords = readOptionalStringField(linkRaw, ["coords"]);
      if (coords) points.push(...parseCaocaoCoordinates(coords));
    }
  }
  return points;
};

const mapCaocaoNavigationRouteKind = (
  value: number | null,
): RideHailingProviderNavigationRouteKind => {
  if (value === 0) return "RELAY_PREVIOUS_DROPOFF";
  if (value === 1) return "PICKUP";
  if (value === 2) return "WAITING";
  if (value === 3) return "DROPOFF";
  return "UNKNOWN";
};

const toCaocaoNavigationPolylineType = (
  routeKind: RideHailingProviderNavigationRouteQueryKind,
): number => (routeKind === "PICKUP" ? 1 : 3);

const parseCaocaoOrderDetail = (data: Record<string, unknown>): RideHailingProviderOrderDetail => {
  const basicOrder = readOptionalRecordField(data, ["basicOrderVO", "basicOrderVo", "basic_order"]);
  const driverRaw = readOptionalRecordField(data, [
    "driver",
    "driverInfoVO",
    "driverInfoVo",
    "driver_info",
  ]);
  const vehicleRaw = readOptionalRecordField(data, [
    "vehicle",
    "driverInfoVO",
    "driverInfoVo",
    "driver_info",
  ]);
  const phase =
    readOptionalStringField(data, ["phase", "status"]) ??
    readOptionalStringField(basicOrder, ["phase", "status"]) ??
    "UNKNOWN";
  const driverName = readOptionalStringField(driverRaw, ["driverName", "driver_name", "name"]);
  const driverPhone = readOptionalStringField(driverRaw, ["driverPhone", "driver_phone", "phone"]);
  const plate = readOptionalStringField(vehicleRaw, [
    "plate",
    "vehiclePlate",
    "vehicle_plate",
    "carNo",
    "car_no",
    "card",
  ]);
  const brand = readOptionalStringField(vehicleRaw, [
    "brand",
    "vehicleBrand",
    "vehicle_brand",
    "carBrand",
  ]);
  const color = readOptionalStringField(vehicleRaw, ["color", "vehicleColor", "vehicle_color"]);
  const finalAmountFen =
    readOptionalNumberField(data, ["finalAmountFen", "actual_price"]) ??
    readOptionalNumberField(
      readOptionalRecordField(data, ["orderFeeVO", "orderFeeVo", "order_fee"]),
      ["totalFee", "actualPrice", "actual_price"],
    );

  return {
    driver:
      driverName || driverPhone
        ? {
            driverName: driverName ?? "司机",
            driverPhone: driverPhone ?? "",
          }
        : null,
    finalAmountFen,
    phase,
    providerSnapshot: data,
    statusLabel: buildCaocaoStatusLabel(phase),
    vehicle:
      plate || brand || color
        ? {
            brand: brand ?? "",
            color: color ?? "",
            plate: plate ?? "",
          }
        : null,
    vehicleLocation: driverRaw ? parseCaocaoVehicleLocation(driverRaw) : null,
  };
};

const parseCaocaoDriverRoute = (
  data: Record<string, unknown>,
): RideHailingProviderNavigationRoute => {
  const routeType = readOptionalNumberField(data, ["navigationPolylineType"]);
  const stepsRaw = readOptionalArrayField(data, ["steps"]);
  const nextStepsRaw = readOptionalArrayField(data, ["nextSteps"]);
  const etaRaw =
    readOptionalRecordField(data, ["driverEtaInfoVO", "driverEtaInfoVo"]) ??
    readOptionalRecordField(data, ["nextDriverEtaInfoVO", "nextDriverEtaInfoVo"]);
  const polyline = parseCaocaoStepPolyline(stepsRaw);
  const fallbackPolyline = polyline.length > 0 ? polyline : parseCaocaoStepPolyline(nextStepsRaw);

  return {
    polyline: fallbackPolyline,
    providerSnapshot: data,
    remainingDistanceMeters: readOptionalNumberFromRecord(etaRaw, ["remainDistance"]),
    remainingDurationSeconds: readOptionalNumberFromRecord(etaRaw, ["remainTime"]),
    routeKind: mapCaocaoNavigationRouteKind(routeType),
    trafficLightCount: readOptionalNumberFromRecord(etaRaw, ["remainLightCount"]),
    vehicleLocation: etaRaw ? parseCaocaoVehicleLocation(etaRaw) : null,
  };
};

const normalizeCaocaoParams = (params: CaocaoParamInput): CaocaoSignedParams => {
  const normalized: CaocaoSignedParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    normalized[key] = String(value);
  }
  return normalized;
};

export function createCaocaoSignature(input: {
  params: CaocaoSignedParams;
  signKey: string;
}): string {
  const signingParams: CaocaoSignedParams = {
    ...input.params,
    sign_key: input.signKey,
  };
  const source = Object.keys(signingParams)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((key) => `${key}${signingParams[key]}`)
    .join("");

  return createHash("sha1").update(source, "utf8").digest("hex");
}

const signaturesMatch = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export function buildCaocaoSignedParams(input: {
  params: CaocaoParamInput;
  clientId: string;
  signKey: string;
  timestampMs?: number;
}): CaocaoSignedParams {
  const params = normalizeCaocaoParams({
    ...input.params,
    client_id: input.clientId,
    timestamp: input.timestampMs ?? Date.now(),
  });
  return {
    ...params,
    sign: createCaocaoSignature({
      params,
      signKey: input.signKey,
    }),
  };
}

export function resolveCurrentCaocaoCallbackRoutingToken(): CaocaoCallbackRoutingToken {
  if (process.env.PARTNERUP_ENVIRONMENT === "production") return "prod";
  if (process.env.PARTNERUP_ENVIRONMENT === "staging") return "stg";
  return "dev";
}

export function buildCaocaoCallbackInfo(input: {
  providerInstance: RideHailingProviderInstance;
  routingToken?: CaocaoCallbackRoutingToken;
}): string {
  if (input.providerInstance.providerType !== "CAOCAO") {
    throw new Error("Caocao callback_info requires a CAOCAO provider instance");
  }

  return [
    CAOCAO_CALLBACK_INFO_PREFIX,
    input.routingToken ?? resolveCurrentCaocaoCallbackRoutingToken(),
    input.providerInstance.id,
  ].join(".");
}

export function parseCaocaoCallbackInfo(
  value: string | null | undefined,
): CaocaoCallbackInfoRoute | null {
  const normalized = value?.trim() ?? "";
  if (normalized.length === 0) return null;

  const parts = normalized.split(".");
  if (parts.length !== 5) return null;
  const [prefixNamespace, prefixDomain, prefixVersion, routingToken, providerInstanceId] = parts;
  if (
    `${prefixNamespace}.${prefixDomain}.${prefixVersion}` !== CAOCAO_CALLBACK_INFO_PREFIX ||
    (routingToken !== "dev" && routingToken !== "prod" && routingToken !== "stg") ||
    !providerInstanceId ||
    !CAOCAO_CALLBACK_INFO_PROVIDER_INSTANCE_ID.test(providerInstanceId)
  ) {
    return null;
  }

  return {
    providerInstanceId,
    routingToken,
  };
}

export function caocaoCallbackRoutingTokenMatchesCurrent(
  routingToken: CaocaoCallbackRoutingToken,
): boolean {
  return routingToken === resolveCurrentCaocaoCallbackRoutingToken();
}

export const serializeCaocaoFormBody = (params: CaocaoSignedParams): URLSearchParams => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    body.set(key, value);
  }
  return body;
};

export function encodeCaocaoExternalOrderId(orderId: string): string {
  const hex = orderId.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error("Caocao external order id requires a UUID order id");
  }
  return `${EXTERNAL_ORDER_ID_PREFIX}${BigInt(`0x${hex}`).toString(36)}`;
}

export function decodeCaocaoExternalOrderId(externalOrderId: string): string | null {
  if (!externalOrderId.startsWith(EXTERNAL_ORDER_ID_PREFIX)) return null;
  const encoded = externalOrderId.slice(EXTERNAL_ORDER_ID_PREFIX.length);
  if (!UUID_BASE36_ALPHABET.test(encoded)) return null;

  let value = 0n;
  for (const char of encoded) {
    const digit = BigInt(parseInt(char, 36));
    if (digit < 0n || digit >= 36n) return null;
    value = value * 36n + digit;
  }

  const hex = value.toString(16).padStart(32, "0");
  if (hex.length !== 32) return null;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

const buildEndpointUrl = (baseUrl: string, path: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const parseCaocaoResponseBody = <TData>(body: unknown): CaocaoRawResponse<TData> => {
  if (!isRecord(body)) {
    throw new Error("Caocao response must be a JSON object");
  }
  const code = readRequiredNumberField(body, "code");
  const success = typeof body.success === "boolean" ? body.success : null;
  const msg = typeof body.msg === "string" ? body.msg : null;

  return {
    code,
    success,
    msg,
    data: body.data as TData | null | undefined,
  };
};

const assertCaocaoSuccess = <TData>(response: CaocaoRawResponse<TData>): TData => {
  if (response.code === 200 && response.success) {
    return response.data as TData;
  }
  if (response.code === 406) {
    return throwHttpProblem({
      status: 502,
      detail: "Caocao signature verification failed",
    });
  }
  if (response.code === 461 || response.code === 23005) {
    return throwHttpProblem({
      status: 409,
      detail: "Caocao price information has expired",
    });
  }
  return throwHttpProblem({
    status: 502,
    detail: `Caocao API failed: ${response.code} ${response.msg ?? ""}`.trim(),
  });
};

const parseCaocaoCallbackEvent = (value: string): CaocaoOrderStatusCallbackEvent => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !CAOCAO_ORDER_STATUS_CALLBACK_EVENTS.has(parsed)) {
    throw new Error("Caocao callback event is unsupported");
  }
  return parsed as CaocaoOrderStatusCallbackEvent;
};

export function resolveCaocaoOrderStatusCallbackUrl(
  providerInstance: RideHailingProviderInstance,
): string {
  if (providerInstance.providerType !== "CAOCAO") {
    throw new Error("Caocao callback URL requires a CAOCAO provider instance");
  }
  if (providerInstance.config.adapterMode !== "CAOCAO_OPEN_API") {
    throw new Error("Caocao callback URL requires CAOCAO_OPEN_API config");
  }
  if (!providerInstance.config.callbackBaseUrl) {
    return throwHttpProblem({
      status: 409,
      detail: "Caocao callback base URL is missing from provider config",
    });
  }

  return new URL(
    `/api/ride-hailing/caocao/${providerInstance.id}/callback/order-status`,
    providerInstance.config.callbackBaseUrl,
  ).toString();
}

export class CaocaoProviderAdapter implements RideHailingProviderPort {
  private readonly config: CaocaoProviderInstanceConfig;

  constructor(
    private readonly input: {
      providerInstance: RideHailingProviderInstance;
      fetchImpl?: typeof fetch;
    },
  ) {
    if (input.providerInstance.providerType !== "CAOCAO") {
      throw new Error("Caocao adapter requires a CAOCAO provider instance");
    }
    if (input.providerInstance.config.adapterMode !== "CAOCAO_OPEN_API") {
      throw new Error("Caocao adapter requires CAOCAO_OPEN_API config");
    }
    this.config = input.providerInstance.config;
  }

  buildExternalOrderId(orderId: string): string {
    return encodeCaocaoExternalOrderId(orderId);
  }

  parseExternalOrderId(externalOrderId: string): string | null {
    return decodeCaocaoExternalOrderId(externalOrderId);
  }

  async estimate(
    input: RideHailingProviderEstimateInput,
  ): Promise<RideHailingProviderVehicleQuote> {
    const data = await this.request<Record<string, unknown>>(
      "GET",
      "/common/estimatePriceWithDetail",
      input.params,
    );
    const providerVehicleTypeCode =
      readOptionalStringField(data, ["carType", "car_type", "vehicle_type"]) ??
      (typeof input.params.car_type === "string" ? input.params.car_type : null) ??
      (typeof input.params.carType === "string" ? input.params.carType : null) ??
      "UNKNOWN";
    return {
      providerVehicleTypeCode,
      providerVehicleTypeName:
        readOptionalStringField(data, ["carTypeName", "car_type_name"]) ?? providerVehicleTypeCode,
      estimateAmountFen:
        readOptionalNumberField(data, [
          "estimateAmountFen",
          "estimatePriceFen",
          "estimate_price",
          "price",
        ]) ?? 0,
      distanceMeters: readOptionalNumberField(data, ["distanceMeters", "distance"]),
      durationSeconds: readOptionalNumberField(data, ["durationSeconds", "duration"]),
      providerQuoteId: readOptionalStringField(data, ["price_token", "quoteId", "quote_id"]),
      providerQuoteExpiresAt: readOptionalStringField(data, ["quoteExpiresAt", "quote_expires_at"]),
      providerSnapshot: data,
    };
  }

  async createRide(input: RideHailingProviderCreateRideInput): Promise<{
    providerOrderId: string;
    externalOrderId: string;
    providerSnapshot: unknown;
  }> {
    const externalOrderId = this.buildExternalOrderId(input.orderId);
    const data = await this.request<Record<string, unknown>>("POST", "/common/orderCarV2", {
      ...input.params,
      ext_order_id: externalOrderId,
    });
    return {
      providerOrderId: readRequiredStringField(data, "orderNo"),
      externalOrderId,
      providerSnapshot: data,
    };
  }

  async queryOrderDetail(input: {
    providerOrderId: string;
  }): Promise<RideHailingProviderOrderDetail> {
    const data = await this.request<Record<string, unknown>>("GET", "/common/queryOrderDetailV2", {
      order_id: input.providerOrderId,
    });
    return parseCaocaoOrderDetail(data);
  }

  async queryDriverLocation(input: {
    providerOrderId: string;
  }): Promise<RideHailingProviderVehicleLocation | null> {
    const data = await this.request<Record<string, unknown>>(
      "GET",
      "/common/queryDriverLocationByOrderId",
      {
        order_id: input.providerOrderId,
      },
    );
    return parseCaocaoVehicleLocation(data);
  }

  async queryDriverRoute(input: {
    providerOrderId: string;
    routeKind: RideHailingProviderNavigationRouteQueryKind;
  }): Promise<RideHailingProviderNavigationRoute | null> {
    const data = await this.request<Record<string, unknown>>(
      "POST",
      "/common/queryDriverPolylineV2",
      {
        navigation_polyline_type: toCaocaoNavigationPolylineType(input.routeKind),
        order_id: input.providerOrderId,
      },
    );
    return parseCaocaoDriverRoute(data);
  }

  async cancelRide(input: RideHailingProviderCancelInput): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }> {
    const data = await this.request<Record<string, unknown>>("POST", "/common/cancelOrderV3", {
      order_id: input.providerOrderId,
      cancel_code: input.cancelCode,
      cancel_reason: input.cancelReason,
      who_cancel: input.whoCancel,
    });
    return {
      providerOrderId: readRequiredStringField(data, "orderNo"),
      cancelFeeFen: readRequiredNumberField(data, "cancelFee"),
      providerSnapshot: data,
    };
  }

  async queryCancelFee(input: { providerOrderId: string }): Promise<{
    providerOrderId: string;
    cancelFeeFen: number;
    providerSnapshot: unknown;
  }> {
    const data = await this.request<Record<string, unknown>>("GET", "/common/queryCancelFee", {
      order_no: input.providerOrderId,
    });
    return {
      providerOrderId: readRequiredStringField(data, "orderNo"),
      cancelFeeFen: readRequiredNumberField(data, "cancelFee"),
      providerSnapshot: data,
    };
  }

  async confirmFee(input: RideHailingProviderConfirmFeeInput): Promise<void> {
    await this.request("POST", "/common/feeConfirm", {
      order_id: input.providerOrderId,
      allowance_amount: input.allowanceAmountFen,
      cao_allowance_amount: input.caocaoAllowanceAmountFen,
    });
  }

  parseOrderStatusCallback(form: Record<string, string>): CaocaoOrderStatusCallback {
    const callbackSign = form.sign;
    if (!callbackSign) {
      throw new Error("Caocao callback signature is missing");
    }
    const { sign: _sign, ...unsignedForm } = form;
    const expected = createCaocaoSignature({
      params: unsignedForm,
      signKey: this.config.signKey,
    });
    if (!signaturesMatch(expected, callbackSign)) {
      throw new Error("Caocao callback signature verification failed");
    }

    const providerOrderId = form.order_id;
    const externalOrderId = form.ext_order_id;
    const timestamp = Number(form.timestamp);
    if (!providerOrderId || !externalOrderId || !Number.isInteger(timestamp)) {
      throw new Error("Caocao callback payload is incomplete");
    }

    return {
      providerType: "CAOCAO",
      providerOrderId,
      externalOrderId,
      localOrderId: this.parseExternalOrderId(externalOrderId),
      event: parseCaocaoCallbackEvent(form.event),
      timestampMs: timestamp,
      raw: form,
    };
  }

  buildSignedParamsForTest(input: {
    params: CaocaoParamInput;
    timestampMs?: number;
  }): CaocaoSignedParams {
    return buildCaocaoSignedParams({
      params: input.params,
      clientId: this.config.caocaoClientId,
      signKey: this.config.signKey,
      timestampMs: input.timestampMs,
    });
  }

  private async request<TData = unknown>(
    method: "GET" | "POST",
    endpointPath: string,
    params: CaocaoParamInput = {},
  ): Promise<TData> {
    const signedParams = buildCaocaoSignedParams({
      params,
      clientId: this.config.caocaoClientId,
      signKey: this.config.signKey,
    });
    const fetchImpl = this.input.fetchImpl ?? fetch;
    const endpointUrl = buildEndpointUrl(this.config.endpointBaseUrl, endpointPath);
    const response =
      method === "GET"
        ? await fetchImpl(`${endpointUrl}?${serializeCaocaoFormBody(signedParams)}`)
        : await fetchImpl(endpointUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: serializeCaocaoFormBody(signedParams),
          });
    if (!response.ok) {
      return throwHttpProblem({
        status: 502,
        detail: `Caocao API HTTP request failed: ${response.status}`,
      });
    }

    return assertCaocaoSuccess(parseCaocaoResponseBody<TData>(await response.json()));
  }
}
