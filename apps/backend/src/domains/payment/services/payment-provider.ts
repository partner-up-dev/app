import { createPublicKey, type KeyObject } from "node:crypto";
import { Aes, Formatter, Rsa, Wechatpay } from "wechatpay-axios-plugin";
import { throwHttpProblem } from "../../../lib/problem-details";
import { env } from "../../../lib/env";
import type { PaymentProviderInstance } from "../../../entities/payment";
import type {
  ChargePrepayResult,
  CreateChargePrepayInput,
  CreateRefundInput,
  CreateRefundResult,
  NormalizedChargeStatus,
  NormalizedPaymentStatus,
  NormalizedRefundStatus,
  PaymentClientAction,
  PaymentProviderPort,
  QueryChargeInput,
  QueryRefundInput,
  RawProviderNotification,
  WeChatPayPlatformCertificate,
  WeChatPayProviderInstanceConfig,
} from "../model";
import { PaymentProviderInstanceRepository } from "../../../repositories/PaymentProviderInstanceRepository";

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

const readRecordField = (
  value: unknown,
  key: string,
): Record<string, unknown> => {
  if (isRecord(value) && isRecord(value[key])) {
    return value[key];
  }
  throw new Error(`Expected object field ${key}`);
};

const readRequiredStringField = (
  value: unknown,
  key: string,
): string => {
  if (
    isRecord(value) &&
    typeof value[key] === "string" &&
    value[key].length > 0
  ) {
    return value[key];
  }

  throw new Error(`Expected string field ${key}`);
};

const readOptionalStringField = (
  value: unknown,
  key: string,
): string | null => {
  if (!isRecord(value)) return null;
  const field = value[key];
  return typeof field === "string" && field.length > 0 ? field : null;
};

const isWeChatPayApiV3Config = (
  config: PaymentProviderInstance["config"],
): config is WeChatPayProviderInstanceConfig =>
  config.adapterMode === "WECHAT_PAY_API_V3";

export const isFakeWeChatPayConfig = (
  config: PaymentProviderInstance["config"],
): boolean => config.adapterMode === "FAKE_WECHAT_PAY";

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
  if (!isWeChatPayApiV3Config(providerInstance.config)) {
    return "https://example.invalid/fake-wechat-pay/charge-notify";
  }

  return new URL(
    `/api/payment/wechat-pay/${providerInstance.id}/notify/charge`,
    resolvePaymentNotifyBaseUrl(),
  ).toString();
};

export const resolveWeChatPayRefundNotifyUrl = (
  providerInstance: PaymentProviderInstance,
): string => {
  if (!isWeChatPayApiV3Config(providerInstance.config)) {
    return "https://example.invalid/fake-wechat-pay/refund-notify";
  }

  return new URL(
    `/api/payment/wechat-pay/${providerInstance.id}/notify/refund`,
    resolvePaymentNotifyBaseUrl(),
  ).toString();
};

const mapWeChatPayTradeState = (
  state: string | undefined,
): NormalizedPaymentStatus => {
  if (state === "SUCCESS") return "SUCCEEDED";
  if (state === "CLOSED" || state === "REVOKED") return "CLOSED";
  if (state === "PAYERROR") return "FAILED";
  return "PENDING";
};

const mapWeChatPayRefundState = (
  state: string | undefined,
): NormalizedPaymentStatus => {
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

export class FakeWeChatPayProviderAdapter implements PaymentProviderPort {
  async createChargePrepay(
    input: CreateChargePrepayInput,
  ): Promise<ChargePrepayResult> {
    return {
      providerPrepayId: `fake-prepay-${input.merchantOrderNo}`,
      providerStatus: "FAKE_AWAITING_CONFIRMATION",
      clientAction: {
        type: "FAKE_PROVIDER_ACTION",
        message: "Scenario fake WeChatPay action",
      },
      providerSnapshot: {
        adapter: "FAKE_WECHAT_PAY",
        merchantOrderNo: input.merchantOrderNo,
        amountFen: input.amountFen,
      },
    };
  }

  async queryCharge(input: QueryChargeInput): Promise<NormalizedChargeStatus> {
    return {
      status: "SUCCEEDED",
      providerStatus: "FAKE_SUCCESS",
      providerTransactionId: `fake-transaction-${input.merchantOrderNo}`,
      providerSnapshot: {
        adapter: "FAKE_WECHAT_PAY",
        merchantOrderNo: input.merchantOrderNo,
      },
    };
  }

  async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
    return {
      status: "SUCCEEDED",
      providerStatus: "FAKE_REFUND_SUCCESS",
      providerRefundId: `fake-refund-${input.merchantRefundNo}`,
      providerSnapshot: {
        adapter: "FAKE_WECHAT_PAY",
        merchantRefundNo: input.merchantRefundNo,
        refundAmountFen: input.refundAmountFen,
      },
    };
  }

  async queryRefund(input: QueryRefundInput): Promise<NormalizedRefundStatus> {
    return {
      status: "SUCCEEDED",
      providerStatus: "FAKE_REFUND_SUCCESS",
      providerRefundId: `fake-refund-${input.merchantRefundNo}`,
      providerSnapshot: {
        adapter: "FAKE_WECHAT_PAY",
        merchantRefundNo: input.merchantRefundNo,
      },
    };
  }

  async parseChargeNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedChargeStatus & { merchantOrderNo: string }> {
    const body = parseJsonRecord(input.bodyText);
    const merchantOrderNo = readRequiredStringField(body, "merchantOrderNo");
    return {
      merchantOrderNo,
      status: "SUCCEEDED",
      providerStatus: "FAKE_SUCCESS",
      providerTransactionId: readOptionalStringField(body, "providerTransactionId"),
      providerSnapshot: body,
    };
  }

  async parseRefundNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedRefundStatus & { merchantRefundNo: string }> {
    const body = parseJsonRecord(input.bodyText);
    const merchantRefundNo = readRequiredStringField(body, "merchantRefundNo");
    return {
      merchantRefundNo,
      status: "SUCCEEDED",
      providerStatus: "FAKE_REFUND_SUCCESS",
      providerRefundId: readOptionalStringField(body, "providerRefundId"),
      providerSnapshot: body,
    };
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
    certificates.map((certificate) => [
      certificate.serialNo,
      certificate.certificatePem,
    ]),
  );
};

const findPlatformCertificatePem = (
  certificates: WeChatPayPlatformCertificate[] | null | undefined,
  serial: string,
): string | null =>
  certificates?.find((certificate) => certificate.serialNo === serial)
    ?.certificatePem ?? null;

const buildWeChatPayClient = (
  config: WeChatPayProviderInstanceConfig,
  platformCertificates: Record<string, string | KeyObject>,
): Wechatpay =>
  new Wechatpay({
    mchid: config.mchId,
    serial: config.merchantCertificate.serialNo,
    privateKey: config.merchantCertificate.privateKeyPem,
    certs: platformCertificates,
    secret: config.apiV3Key,
  });

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
  const associatedData =
    readOptionalStringField(encryptCertificate, "associated_data") ?? "";

  return {
    serialNo: readRequiredStringField(item, "serial_no"),
    certificatePem: Aes.AesGcm.decrypt(
      ciphertext,
      input.apiV3Key,
      nonce,
      associatedData,
    ),
    effectiveTime: readOptionalStringField(item, "effective_time"),
    expireTime: readOptionalStringField(item, "expire_time"),
  };
};

const downloadWeChatPayPlatformCertificates = async (
  config: WeChatPayProviderInstanceConfig,
): Promise<WeChatPayPlatformCertificate[]> => {
  const downloaded: WeChatPayPlatformCertificate[] = [];
  const wxpay = buildWeChatPayClient(config, {
    bootstrap: createPublicKey(config.merchantCertificate.privateKeyPem),
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

  await wxpay.chain("/v3/certificates").get({
    // Bootstrap path: use the SDK for request signing, then decrypt the returned
    // platform certificates before normal response verification is possible.
    transformResponse: [capturePlatformCertificates],
  });

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

  const platformCertificates = await downloadWeChatPayPlatformCertificates(
    providerInstance.config,
  );
  const updated = await providerInstanceRepo.updateConfig({
    id: providerInstance.id,
    config: {
      ...providerInstance.config,
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

  constructor(input: {
    providerInstance: PaymentProviderInstance;
  }) {
    if (!isWeChatPayApiV3Config(input.providerInstance.config)) {
      throw new Error("WeChatPay adapter requires APIv3 provider config");
    }

    this.config = input.providerInstance.config;
    this.wxpay = buildWeChatPayClient(
      this.config,
      buildPlatformCertificateMap(this.config.platformCertificates),
    );
  }

  async createChargePrepay(
    input: CreateChargePrepayInput,
  ): Promise<ChargePrepayResult> {
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
    const response = await this.wxpay
      .chain(`/v3/pay/transactions/out-trade-no/${input.merchantOrderNo}`)
      .get<Record<string, unknown>>({
        params: {
          mchid: this.config.mchId,
        },
      });
    const providerStatus =
      readOptionalStringField(response.data, "trade_state") ?? "UNKNOWN";

    return {
      status: mapWeChatPayTradeState(providerStatus),
      providerStatus,
      providerTransactionId: readOptionalStringField(
        response.data,
        "transaction_id",
      ),
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

    const providerStatus =
      readOptionalStringField(response.data, "status") ?? "UNKNOWN";
    return {
      status: mapWeChatPayRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(response.data, "refund_id"),
      providerSnapshot: response.data,
      failureMessage: readOptionalStringField(response.data, "abnormal_reason"),
    };
  }

  async queryRefund(input: QueryRefundInput): Promise<NormalizedRefundStatus> {
    const response = await this.wxpay
      .chain(`/v3/refund/domestic/refunds/${input.merchantRefundNo}`)
      .get<Record<string, unknown>>();
    const providerStatus =
      readOptionalStringField(response.data, "status") ?? "UNKNOWN";

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

  private decryptVerifiedResource(
    input: RawProviderNotification,
  ): Record<string, unknown> {
    const platformCertificatePem = findPlatformCertificatePem(
      this.config.platformCertificates,
      input.headers.serial,
    );
    if (!platformCertificatePem) {
      throw new UnknownWeChatPayPlatformCertificateSerialError(
        input.headers.serial,
      );
    }

    const verified = Rsa.verify(
      Formatter.response(
        input.headers.timestamp,
        input.headers.nonce,
        input.bodyText,
      ),
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
    const plaintext = Aes.AesGcm.decrypt(
      ciphertext,
      this.config.apiV3Key,
      nonce,
      associatedData,
    );

    return parseJsonRecord(plaintext);
  }

  private buildJsapiClientAction(prepayId: string): PaymentClientAction {
    const timeStamp = String(Formatter.timestamp());
    const nonceStr = Formatter.nonce();
    const packageValue = `prepay_id=${prepayId}`;
    const paySign = Rsa.sign(
      Formatter.joinedByLineFeed(
        this.config.appId,
        timeStamp,
        nonceStr,
        packageValue,
      ),
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
  if (isFakeWeChatPayConfig(input.providerInstance.config)) {
    return new FakeWeChatPayProviderAdapter();
  }

  if (input.providerInstance.providerType === "WECHAT_PAY") {
    return new WeChatPayProviderAdapter(input);
  }

  return throwHttpProblem({
    status: 409,
    detail: "Unsupported payment provider instance",
  });
}
