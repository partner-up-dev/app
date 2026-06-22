import { createHash, timingSafeEqual } from "node:crypto";
import { throwHttpProblem } from "../../../lib/problem-details";
import type { RideHailingProviderInstance } from "../../../entities/ride-hailing-provider";
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
  RideHailingProviderVehicleQuote,
  RideHailingProviderPort,
} from "../model";

type CaocaoParamValue = string | number | boolean | null | undefined;
type CaocaoParamInput = Record<string, CaocaoParamValue>;

const EXTERNAL_ORDER_ID_PREFIX = "rh";
const UUID_BASE36_ALPHABET = /^[0-9a-z]+$/;
const CAOCAO_ORDER_STATUS_CALLBACK_EVENTS: ReadonlySet<number> = new Set([
  1, 2, 3, 4, 5, 6, 9, 11, 12, 13, 20, 21, 22, 23, 24, 25, 26, 27, 40, 41, 42, 43, 44, 45, 46, 47,
  48,
]);

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

  async queryOrderDetail(input: { providerOrderId: string }): Promise<unknown> {
    return this.request("GET", "/common/queryOrderDetailV2", {
      order_id: input.providerOrderId,
    });
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
