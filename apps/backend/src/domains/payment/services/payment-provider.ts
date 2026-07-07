import { createHmac, type KeyObject } from "node:crypto";
import { Aes, Formatter, Rsa, Wechatpay } from "wechatpay-axios-plugin";
import type { PaymentProviderInstance } from "../../../entities/payment";
import { env } from "../../../lib/env";
import { ProblemDetailsError, throwHttpProblem } from "../../../lib/problem-details";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";
import type {
  ChargePrepayResult,
  CreateChargePrepayInput,
  CreateRefundInput,
  CreateRefundResult,
  NormalizedChargeStatus,
  NormalizedPaymentStatus,
  NormalizedRefundStatus,
  ParsedProviderPaymentReference,
  PaymentClientAction,
  PaymentProviderPort,
  ProviderPaymentReferenceInput,
  ProviderPaymentReferenceKind,
  QueryChargeInput,
  QueryRefundInput,
  RawProviderNotification,
  WeChatPayPlatformCertificate,
  WeChatPayProviderInstanceConfig,
} from "../model";
import { normalizeAndValidateWeChatPayProviderConfig } from "./wechatpay-config-validation";

const providerInstanceRepo = new PaymentProviderInstanceRepository();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonRecord = (text: string): Record<string, unknown> => {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) {
    throw new Error("Expected JSON object");
  }
  return value;
};

const readRecordField = (value: unknown, key: string): Record<string, unknown> => {
  if (isRecord(value) && isRecord(value[key])) {
    return value[key];
  }
  throw new Error(`Expected object field ${key}`);
};

const readRequiredStringField = (value: unknown, key: string): string => {
  if (isRecord(value) && typeof value[key] === "string" && value[key].length > 0) {
    return value[key];
  }

  throw new Error(`Expected string field ${key}`);
};

const readOptionalStringField = (value: unknown, key: string): string | null => {
  if (!isRecord(value)) return null;
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
};

const readHttpStatus = (error: unknown): number | null => {
  if (!isRecord(error) || !isRecord(error.response)) return null;
  const status = error.response.status;
  return typeof status === "number" ? status : null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxMerchantReferenceAttemptCount = 36 ** 3 - 1;

const encodeUuidBase64Url = (uuid: string): string => {
  if (!uuidPattern.test(uuid)) {
    throw new Error("Invalid UUID for WeChatPay merchant reference");
  }
  return Buffer.from(uuid.replaceAll("-", ""), "hex").toString("base64url");
};

const decodeUuidBase64Url = (encoded: string): string => {
  const bytes = Buffer.from(encoded, "base64url");
  if (bytes.length !== 16) {
    throw new Error("Invalid encoded UUID for WeChatPay merchant reference");
  }
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
};

const parseWeChatPayReferenceKind = (prefix: string): ProviderPaymentReferenceKind => {
  if (prefix === "PC") return "CHARGE";
  if (prefix === "PR") return "REFUND";
  throw new Error("Invalid WeChatPay merchant reference kind");
};

const isWeChatPayApiV3Config = (
  config: PaymentProviderInstance["config"],
): config is WeChatPayProviderInstanceConfig => config.adapterMode === "WECHAT_PAY_API_V3";

const resolvePaymentNotifyBaseUrl = (): string => {
  if (!env.PAYMENT_NOTIFY_BASE_URL) {
    return throwHttpProblem({
      status: 500,
      detail: "PAYMENT_NOTIFY_BASE_URL is required for WeChatPay notifications",
    });
  }
  return env.PAYMENT_NOTIFY_BASE_URL;
};

export const resolveWeChatPayChargeNotifyUrl = (
  providerInstance: PaymentProviderInstance,
): string => {
  return new URL(
    `/api/payment/wechat-pay/${providerInstance.id}/notify/charge`,
    resolvePaymentNotifyBaseUrl(),
  ).toString();
};

export const resolveWeChatPayRefundNotifyUrl = (
  providerInstance: PaymentProviderInstance,
): string => {
  return new URL(
    `/api/payment/wechat-pay/${providerInstance.id}/notify/refund`,
    resolvePaymentNotifyBaseUrl(),
  ).toString();
};

const mapWeChatPayTradeState = (state: string | undefined): NormalizedPaymentStatus => {
  if (state === "SUCCESS") return "SUCCEEDED";
  if (state === "CLOSED" || state === "REVOKED") return "CLOSED";
  if (state === "PAYERROR") return "FAILED";
  return "PENDING";
};

const mapWeChatPayRefundState = (state: string | undefined): NormalizedPaymentStatus => {
  if (state === "SUCCESS") return "SUCCEEDED";
  if (state === "CLOSED") return "CLOSED";
  if (state === "ABNORMAL") return "FAILED";
  return "PENDING";
};

export class UnknownWeChatPayPlatformCertificateSerialError extends Error {
  constructor(readonly serial: string) {
    super(`Unknown WeChatPay platform certificate serial: ${serial}`);
  }
}

const buildPlatformCertificateMap = (
  certificates: WeChatPayPlatformCertificate[] | null | undefined,
): Record<string, string> => {
  if (!certificates || certificates.length === 0) {
    return throwHttpProblem({
      status: 409,
      detail: "WeChatPay platform certificates are missing",
    });
  }

  return Object.fromEntries(
    certificates.map((certificate) => [certificate.serialNo, certificate.certificatePem]),
  );
};

const findPlatformCertificatePem = (
  certificates: WeChatPayPlatformCertificate[] | null | undefined,
  serial: string,
): string | null =>
  certificates?.find((certificate) => certificate.serialNo === serial)?.certificatePem ?? null;

const buildWeChatPayClient = (
  config: WeChatPayProviderInstanceConfig,
  platformCertificates: Record<string, string | KeyObject>,
): Wechatpay => {
  assertEndpointBaseUrlAllowed(config.endpointBaseUrl ?? null);
  return new Wechatpay({
    ...(config.endpointBaseUrl ? { baseURL: config.endpointBaseUrl } : {}),
    mchid: config.mchId,
    serial: config.merchantCertificate.serialNo,
    privateKey: config.merchantCertificate.privateKeyPem,
    certs: platformCertificates,
    secret: config.apiV3Key,
  });
};

const normalizeRuntimeWeChatPayProviderConfig = (
  config: WeChatPayProviderInstanceConfig,
): WeChatPayProviderInstanceConfig => {
  try {
    return normalizeAndValidateWeChatPayProviderConfig(config);
  } catch (error) {
    if (error instanceof ProblemDetailsError) {
      return throwHttpProblem({
        status: 500,
        detail: "WeChatPay provider credential configuration is invalid",
        code: "WECHAT_PAY_PROVIDER_CONFIG_INVALID",
      });
    }
    throw error;
  }
};

const isLocalEndpointHost = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  hostname.endsWith(".localhost") ||
  hostname.endsWith(".local") ||
  hostname.endsWith(".home.arpa");

const isOfficialWeChatPayEndpointHost = (hostname: string): boolean =>
  hostname === "api.mch.weixin.qq.com";

const assertEndpointBaseUrlAllowed = (endpointBaseUrl: string | null): void => {
  if (!endpointBaseUrl) return;
  const parsed = new URL(endpointBaseUrl);
  const isAllowedProductionHost =
    parsed.protocol === "https:" && isOfficialWeChatPayEndpointHost(parsed.hostname);
  if (process.env.NODE_ENV === "production" && !isAllowedProductionHost) {
    return throwHttpProblem({
      status: 500,
      detail: "WeChatPay endpointBaseUrl must point to the official host in production",
    });
  }
  if (
    process.env.NODE_ENV !== "production" &&
    !isLocalEndpointHost(parsed.hostname) &&
    !isAllowedProductionHost
  ) {
    return throwHttpProblem({
      status: 500,
      detail:
        "WeChatPay endpointBaseUrl must be local, portless local, or the official host outside production",
    });
  }
};

const readCertificateItems = (body: Record<string, unknown>): unknown[] => {
  const data = body.data;
  return Array.isArray(data) ? data : [];
};

const decryptPlatformCertificate = (input: {
  item: unknown;
  apiV3Key: string;
}): WeChatPayPlatformCertificate => {
  const item = input.item;
  const encryptCertificate = readRecordField(item, "encrypt_certificate");
  const ciphertext = readRequiredStringField(encryptCertificate, "ciphertext");
  const nonce = readRequiredStringField(encryptCertificate, "nonce");
  const associatedData = readOptionalStringField(encryptCertificate, "associated_data") ?? "";

  return {
    serialNo: readRequiredStringField(item, "serial_no"),
    certificatePem: Aes.AesGcm.decrypt(ciphertext, input.apiV3Key, nonce, associatedData),
    effectiveTime: readOptionalStringField(item, "effective_time"),
    expireTime: readOptionalStringField(item, "expire_time"),
  };
};

const downloadWeChatPayPlatformCertificates = async (
  rawConfig: WeChatPayProviderInstanceConfig,
): Promise<WeChatPayPlatformCertificate[]> => {
  const downloaded: WeChatPayPlatformCertificate[] = [];
  const config = normalizeRuntimeWeChatPayProviderConfig(rawConfig);
  const wxpay = buildWeChatPayClient(config, {
    bootstrap: "",
  });
  const capturePlatformCertificates = (rawBody: unknown): unknown => {
    if (typeof rawBody !== "string") return rawBody;
    const body = parseJsonRecord(rawBody);
    for (const item of readCertificateItems(body)) {
      downloaded.push(
        decryptPlatformCertificate({
          item,
          apiV3Key: config.apiV3Key,
        }),
      );
    }
    return rawBody;
  };

  try {
    await wxpay.chain("/v3/certificates").get({
      // Bootstrap path: use the SDK for request signing, then decrypt the
      // returned platform certificates before normal response verification is
      // possible.
      transformResponse: [capturePlatformCertificates],
    });
  } catch (error) {
    if (error instanceof ProblemDetailsError) {
      return throwHttpProblem({
        status: 500,
        detail: "WeChatPay provider credential configuration is invalid",
        code: "WECHAT_PAY_PROVIDER_CONFIG_INVALID",
      });
    }
    return throwHttpProblem({
      status: 502,
      detail: "WeChatPay platform certificate download failed",
      code: "WECHAT_PAY_PLATFORM_CERTIFICATE_DOWNLOAD_FAILED",
    });
  }

  if (downloaded.length === 0) {
    return throwHttpProblem({
      status: 502,
      detail: "WeChatPay platform certificate download returned no certificates",
    });
  }

  return downloaded;
};

export const refreshWeChatPayPlatformCertificates = async (
  providerInstance: PaymentProviderInstance,
): Promise<PaymentProviderInstance> => {
  if (!isWeChatPayApiV3Config(providerInstance.config)) {
    return providerInstance;
  }

  const config = normalizeRuntimeWeChatPayProviderConfig(providerInstance.config);
  const platformCertificates = await downloadWeChatPayPlatformCertificates(config);
  const updated = await providerInstanceRepo.updateConfig({
    id: providerInstance.id,
    config: {
      ...config,
      platformCertificates,
    },
  });

  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Payment provider instance not found while refreshing certificates",
    });
  }

  return updated;
};

export const ensureWeChatPayPlatformCertificates = async (
  providerInstance: PaymentProviderInstance,
): Promise<PaymentProviderInstance> => {
  if (!isWeChatPayApiV3Config(providerInstance.config)) {
    return providerInstance;
  }
  if (
    providerInstance.config.platformCertificates &&
    providerInstance.config.platformCertificates.length > 0
  ) {
    return providerInstance;
  }

  return refreshWeChatPayPlatformCertificates(providerInstance);
};

export class WeChatPayProviderAdapter implements PaymentProviderPort {
  private readonly wxpay: Wechatpay;
  private readonly config: WeChatPayProviderInstanceConfig;
  private readonly providerInstanceId: string;

  constructor(input: {
    providerInstance: PaymentProviderInstance;
  }) {
    if (!isWeChatPayApiV3Config(input.providerInstance.config)) {
      throw new Error("WeChatPay adapter requires APIv3 provider config");
    }

    this.providerInstanceId = input.providerInstance.id;
    this.config = normalizeRuntimeWeChatPayProviderConfig(input.providerInstance.config);
    this.wxpay = buildWeChatPayClient(
      this.config,
      buildPlatformCertificateMap(this.config.platformCertificates),
    );
  }

  deriveChargeMerchantOrderNo(input: ProviderPaymentReferenceInput): string {
    if (input.kind !== "CHARGE") {
      throw new Error("WeChatPay charge merchant reference requires charge kind");
    }
    return this.deriveMerchantPaymentReference(input);
  }

  deriveRefundMerchantRefundNo(input: ProviderPaymentReferenceInput): string {
    if (input.kind !== "REFUND") {
      throw new Error("WeChatPay refund merchant reference requires refund kind");
    }
    return this.deriveMerchantPaymentReference(input);
  }

  parseMerchantPaymentReference(input: string): ParsedProviderPaymentReference {
    const prefix = input.slice(0, 2);
    const kind = parseWeChatPayReferenceKind(prefix);
    const encodedBillLineId = input.slice(2, 24);
    const encodedAttemptCount = input.slice(24, 27);
    const signature = input.slice(27);
    if (
      input.length !== 32 ||
      encodedBillLineId.length !== 22 ||
      encodedAttemptCount.length !== 3 ||
      signature.length !== 5
    ) {
      throw new Error("Invalid WeChatPay merchant reference shape");
    }

    const billLineId = decodeUuidBase64Url(encodedBillLineId);
    const attemptCount = Number.parseInt(encodedAttemptCount, 36);
    if (!Number.isInteger(attemptCount) || attemptCount <= 0) {
      throw new Error("Invalid WeChatPay merchant reference attempt count");
    }

    const expected = this.signMerchantReference({
      prefix,
      billLineId,
      attemptCount,
    });
    if (signature !== expected) {
      throw new Error("Invalid WeChatPay merchant reference signature");
    }

    return {
      providerInstanceId: this.providerInstanceId,
      billLineId,
      kind,
      attemptCount,
    };
  }

  private deriveMerchantPaymentReference(input: ProviderPaymentReferenceInput): string {
    if (input.providerInstanceId !== this.providerInstanceId) {
      throw new Error("WeChatPay merchant reference provider instance mismatch");
    }
    if (input.kind !== "CHARGE" && input.kind !== "REFUND") {
      throw new Error("Unsupported WeChatPay merchant reference kind");
    }
    if (
      !Number.isInteger(input.attemptCount) ||
      input.attemptCount <= 0 ||
      input.attemptCount > maxMerchantReferenceAttemptCount
    ) {
      throw new Error("Invalid WeChatPay merchant reference attempt count");
    }

    const prefix = input.kind === "CHARGE" ? "PC" : "PR";
    const encodedBillLineId = encodeUuidBase64Url(input.billLineId);
    const encodedAttemptCount = input.attemptCount.toString(36).toUpperCase().padStart(3, "0");
    const signature = this.signMerchantReference({
      prefix,
      billLineId: input.billLineId,
      attemptCount: input.attemptCount,
    });

    return `${prefix}${encodedBillLineId}${encodedAttemptCount}${signature}`;
  }

  private signMerchantReference(input: {
    prefix: string;
    billLineId: string;
    attemptCount: number;
  }): string {
    return createHmac("sha256", this.config.apiV3Key)
      .update(
        [input.prefix, this.providerInstanceId, input.billLineId, String(input.attemptCount)].join(
          ":",
        ),
      )
      .digest("base64url")
      .slice(0, 5);
  }

  async createChargePrepay(input: CreateChargePrepayInput): Promise<ChargePrepayResult> {
    if (this.config.chargeMode === "JSAPI") {
      if (!input.payerOpenId) {
        return throwHttpProblem({
          status: 409,
          detail: "WeChatPay JSAPI checkout requires a bound WeChat openid",
        });
      }

      const response = await this.wxpay
        .chain("/v3/pay/transactions/jsapi")
        .post<Record<string, unknown>>({
          appid: this.config.appId,
          mchid: this.config.mchId,
          description: input.description,
          out_trade_no: input.merchantOrderNo,
          notify_url: input.notifyUrl,
          amount: {
            total: input.amountFen,
            currency: input.currency,
          },
          payer: {
            openid: input.payerOpenId,
          },
          time_expire: input.expiresAt.toISOString(),
        });

      const prepayId = readRequiredStringField(response.data, "prepay_id");
      return {
        providerPrepayId: prepayId,
        providerStatus: "PREPAY_CREATED",
        clientAction: this.buildJsapiClientAction(prepayId),
        providerSnapshot: response.data,
      };
    }

    if (this.config.chargeMode === "H5") {
      const response = await this.wxpay
        .chain("/v3/pay/transactions/h5")
        .post<Record<string, unknown>>({
          appid: this.config.appId,
          mchid: this.config.mchId,
          description: input.description,
          out_trade_no: input.merchantOrderNo,
          notify_url: input.notifyUrl,
          amount: {
            total: input.amountFen,
            currency: input.currency,
          },
          time_expire: input.expiresAt.toISOString(),
        });

      return {
        providerPrepayId: input.merchantOrderNo,
        providerStatus: "H5_URL_CREATED",
        clientAction: {
          type: "PAYMENT_REDIRECT",
          url: readRequiredStringField(response.data, "h5_url"),
        },
        providerSnapshot: response.data,
      };
    }

    return throwHttpProblem({
      status: 409,
      detail: `Unsupported WeChatPay charge mode: ${this.config.chargeMode}`,
    });
  }

  async queryCharge(input: QueryChargeInput): Promise<NormalizedChargeStatus> {
    let response: { data: Record<string, unknown> };
    try {
      response = await this.wxpay
        .chain(`/v3/pay/transactions/out-trade-no/${input.merchantOrderNo}`)
        .get<Record<string, unknown>>({
          params: {
            mchid: this.config.mchId,
          },
        });
    } catch (error) {
      if (readHttpStatus(error) === 404) {
        return {
          status: "CLOSED",
          providerStatus: "NOT_FOUND",
        };
      }
      throw error;
    }
    const providerStatus = readOptionalStringField(response.data, "trade_state") ?? "UNKNOWN";

    return {
      status: mapWeChatPayTradeState(providerStatus),
      providerStatus,
      providerTransactionId: readOptionalStringField(response.data, "transaction_id"),
      providerSnapshot: response.data,
      failureMessage: readOptionalStringField(response.data, "trade_state_desc"),
    };
  }

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    const response = await this.wxpay
      .chain("/v3/refund/domestic/refunds")
      .post<Record<string, unknown>>({
        transaction_id: input.originalProviderTransactionId ?? undefined,
        out_trade_no: input.originalProviderTransactionId
          ? undefined
          : input.originalMerchantOrderNo,
        out_refund_no: input.merchantRefundNo,
        reason: input.reason,
        notify_url: input.notifyUrl,
        amount: {
          refund: input.refundAmountFen,
          total: input.originalAmountFen,
          currency: input.currency,
        },
      });

    const providerStatus = readOptionalStringField(response.data, "status") ?? "UNKNOWN";
    return {
      status: mapWeChatPayRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(response.data, "refund_id"),
      providerSnapshot: response.data,
      failureMessage: readOptionalStringField(response.data, "abnormal_reason"),
    };
  }

  async queryRefund(input: QueryRefundInput): Promise<NormalizedRefundStatus> {
    let response: { data: Record<string, unknown> };
    try {
      response = await this.wxpay
        .chain(`/v3/refund/domestic/refunds/${input.merchantRefundNo}`)
        .get<Record<string, unknown>>();
    } catch (error) {
      if (readHttpStatus(error) === 404) {
        return {
          status: "CLOSED",
          providerStatus: "NOT_FOUND",
        };
      }
      throw error;
    }
    const providerStatus = readOptionalStringField(response.data, "status") ?? "UNKNOWN";

    return {
      status: mapWeChatPayRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(response.data, "refund_id"),
      providerSnapshot: response.data,
      failureMessage: readOptionalStringField(response.data, "abnormal_reason"),
    };
  }

  async parseChargeNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedChargeStatus & { merchantOrderNo: string }> {
    const resource = this.decryptVerifiedResource(input);
    const merchantOrderNo = readRequiredStringField(resource, "out_trade_no");
    const providerStatus =
      readOptionalStringField(resource, "trade_state") ??
      readOptionalStringField(resource, "event_type") ??
      "SUCCESS";

    return {
      merchantOrderNo,
      status: mapWeChatPayTradeState(providerStatus),
      providerStatus,
      providerTransactionId: readOptionalStringField(resource, "transaction_id"),
      providerSnapshot: resource,
      failureMessage: readOptionalStringField(resource, "trade_state_desc"),
    };
  }

  async parseRefundNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedRefundStatus & { merchantRefundNo: string }> {
    const resource = this.decryptVerifiedResource(input);
    const merchantRefundNo = readRequiredStringField(resource, "out_refund_no");
    const providerStatus =
      readOptionalStringField(resource, "refund_status") ??
      readOptionalStringField(resource, "status") ??
      "UNKNOWN";

    return {
      merchantRefundNo,
      status: mapWeChatPayRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(resource, "refund_id"),
      providerSnapshot: resource,
      failureMessage: readOptionalStringField(resource, "abnormal_reason"),
    };
  }

  private decryptVerifiedResource(input: RawProviderNotification): Record<string, unknown> {
    const platformCertificatePem = findPlatformCertificatePem(
      this.config.platformCertificates,
      input.headers.serial,
    );
    if (!platformCertificatePem) {
      throw new UnknownWeChatPayPlatformCertificateSerialError(input.headers.serial);
    }

    const verified = Rsa.verify(
      Formatter.response(input.headers.timestamp, input.headers.nonce, input.bodyText),
      input.headers.signature,
      platformCertificatePem,
    );
    if (!verified) {
      throw new Error("WeChatPay notification signature verification failed");
    }

    const body = parseJsonRecord(input.bodyText);
    const resource = readRecordField(body, "resource");
    const ciphertext = readRequiredStringField(resource, "ciphertext");
    const nonce = readRequiredStringField(resource, "nonce");
    const associatedData = readOptionalStringField(resource, "associated_data") ?? "";
    const plaintext = Aes.AesGcm.decrypt(ciphertext, this.config.apiV3Key, nonce, associatedData);

    return parseJsonRecord(plaintext);
  }

  private buildJsapiClientAction(prepayId: string): PaymentClientAction {
    const timeStamp = String(Formatter.timestamp());
    const nonceStr = Formatter.nonce();
    const packageValue = `prepay_id=${prepayId}`;
    const paySign = Rsa.sign(
      Formatter.joinedByLineFeed(this.config.appId, timeStamp, nonceStr, packageValue),
      this.config.merchantCertificate.privateKeyPem,
    );

    return {
      type: "WECHAT_BRIDGE",
      appId: this.config.appId,
      timeStamp,
      nonceStr,
      package: packageValue,
      signType: "RSA",
      paySign,
    };
  }
}

export function createPaymentProviderPort(input: {
  providerInstance: PaymentProviderInstance;
}): PaymentProviderPort {
  if (input.providerInstance.providerType === "WECHAT_PAY") {
    return new WeChatPayProviderAdapter(input);
  }

  return throwHttpProblem({
    status: 409,
    detail: "Unsupported payment provider instance",
  });
}
