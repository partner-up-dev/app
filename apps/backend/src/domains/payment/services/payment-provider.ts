import { Aes, Formatter, Rsa, Wechatpay } from "wechatpay-axios-plugin";
import { throwHttpProblem } from "../../../lib/problem-details";
import type {
  PaymentProviderCredentialSet,
  PaymentProviderInstance,
} from "../../../entities/payment";
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
  WeChatPayProviderInstanceConfig,
  WeChatPayVerifierConfig,
} from "../model";

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

const isWechatApiV3Config = (
  config: PaymentProviderInstance["config"],
): config is WeChatPayProviderInstanceConfig =>
  config.adapterMode === "WECHAT_PAY_API_V3";

export const isFakeWechatPayConfig = (
  config: PaymentProviderInstance["config"],
): boolean => config.adapterMode === "FAKE_WECHAT_PAY";

export const resolvePaymentNotifyUrl = (
  providerInstance: PaymentProviderInstance,
): string => {
  const config = providerInstance.config;
  if (config.adapterMode === "WECHAT_PAY_API_V3") {
    return new URL(config.paymentNotifyPath, config.notifyBaseUrl).toString();
  }
  return "https://example.invalid/fake-wechat/payment-notify";
};

export const resolveRefundNotifyUrl = (
  providerInstance: PaymentProviderInstance,
): string => {
  const config = providerInstance.config;
  if (config.adapterMode === "WECHAT_PAY_API_V3") {
    return new URL(config.refundNotifyPath, config.notifyBaseUrl).toString();
  }
  return "https://example.invalid/fake-wechat/refund-notify";
};

const mapWechatTradeState = (
  state: string | undefined,
): NormalizedPaymentStatus => {
  if (state === "SUCCESS") return "SUCCEEDED";
  if (state === "CLOSED" || state === "REVOKED") return "CLOSED";
  if (state === "PAYERROR") return "FAILED";
  return "PENDING";
};

const mapWechatRefundState = (
  state: string | undefined,
): NormalizedPaymentStatus => {
  if (state === "SUCCESS") return "SUCCEEDED";
  if (state === "CLOSED") return "CLOSED";
  if (state === "ABNORMAL") return "FAILED";
  return "PENDING";
};

export class FakeWeChatPayProviderAdapter implements PaymentProviderPort {
  async createChargePrepay(
    input: CreateChargePrepayInput,
  ): Promise<ChargePrepayResult> {
    return {
      providerPrepayId: `fake-prepay-${input.merchantOrderNo}`,
      providerStatus: "FAKE_AWAITING_CONFIRMATION",
      clientAction: {
        type: "FAKE_PROVIDER_ACTION",
        message: "Scenario fake WeChat Pay action",
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

  async parsePaymentNotification(
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

const buildCerts = (
  verifier: WeChatPayVerifierConfig,
): Record<string, string> => {
  if (verifier.mode === "WECHAT_PAY_PUBLIC_KEY") {
    return {
      [verifier.publicKeyId]: verifier.publicKeyPem,
    };
  }

  return {
    [verifier.certificateSerialNo]: verifier.certificatePem,
  };
};

const resolveVerifierPublicKey = (
  verifier: WeChatPayVerifierConfig,
  serial: string,
): string | null => {
  if (verifier.mode === "WECHAT_PAY_PUBLIC_KEY") {
    return verifier.publicKeyId === serial ? verifier.publicKeyPem : null;
  }
  return verifier.certificateSerialNo === serial ? verifier.certificatePem : null;
};

export class WeChatPayProviderAdapter implements PaymentProviderPort {
  private readonly wxpay: Wechatpay;
  private readonly config: WeChatPayProviderInstanceConfig;
  private readonly credential: PaymentProviderCredentialSet;

  constructor(input: {
    providerInstance: PaymentProviderInstance;
    credentialSet: PaymentProviderCredentialSet;
  }) {
    if (!isWechatApiV3Config(input.providerInstance.config)) {
      throw new Error("WeChat Pay adapter requires APIv3 provider config");
    }

    this.config = input.providerInstance.config;
    this.credential = input.credentialSet;
    this.wxpay = new Wechatpay({
      mchid: this.config.mchId,
      serial: input.credentialSet.merchantSerialNo,
      privateKey: input.credentialSet.merchantPrivateKeyPem,
      certs: buildCerts(input.credentialSet.verifier),
      secret: input.credentialSet.apiV3Key,
    });
  }

  async createChargePrepay(
    input: CreateChargePrepayInput,
  ): Promise<ChargePrepayResult> {
    if (input.channel !== "WECHAT_PAY") {
      return throwHttpProblem({
        status: 409,
        detail: `Unsupported charge channel: ${input.channel}`,
      });
    }

    if (this.config.chargeMode === "JSAPI") {
      if (!input.payerOpenId) {
        return throwHttpProblem({
          status: 409,
          detail: "WeChat JSAPI checkout requires a bound WeChat openid",
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
      detail: `Unsupported WeChat Pay charge mode: ${this.config.chargeMode}`,
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
      status: mapWechatTradeState(providerStatus),
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
      status: mapWechatRefundState(providerStatus),
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
      status: mapWechatRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(response.data, "refund_id"),
      providerSnapshot: response.data,
      failureMessage: readOptionalStringField(response.data, "abnormal_reason"),
    };
  }

  async parsePaymentNotification(
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
      status: mapWechatTradeState(providerStatus),
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
      status: mapWechatRefundState(providerStatus),
      providerStatus,
      providerRefundId: readOptionalStringField(resource, "refund_id"),
      providerSnapshot: resource,
      failureMessage: readOptionalStringField(resource, "abnormal_reason"),
    };
  }

  private decryptVerifiedResource(
    input: RawProviderNotification,
  ): Record<string, unknown> {
    const verifierPublicKey = resolveVerifierPublicKey(
      this.credential.verifier,
      input.headers.serial,
    );
    if (!verifierPublicKey) {
      throw new Error("WeChat Pay notification verifier serial is not trusted");
    }

    const verified = Rsa.verify(
      Formatter.response(
        input.headers.timestamp,
        input.headers.nonce,
        input.bodyText,
      ),
      input.headers.signature,
      verifierPublicKey,
    );
    if (!verified) {
      throw new Error("WeChat Pay notification signature verification failed");
    }

    const body = parseJsonRecord(input.bodyText);
    const resource = readRecordField(body, "resource");
    const ciphertext = readRequiredStringField(resource, "ciphertext");
    const nonce = readRequiredStringField(resource, "nonce");
    const associatedData = readOptionalStringField(resource, "associated_data") ?? "";
    const plaintext = Aes.AesGcm.decrypt(
      ciphertext,
      this.credential.apiV3Key,
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
      this.credential.merchantPrivateKeyPem,
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
  credentialSet: PaymentProviderCredentialSet;
}): PaymentProviderPort {
  if (isFakeWechatPayConfig(input.providerInstance.config)) {
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
