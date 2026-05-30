export type PaymentProviderType = "WECHAT_PAY";

export type PaymentTxType = "CHARGE" | "REFUND";

export type PaymentTxStatus =
  | "INITIATED"
  | "ACTION_REQUIRED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED";

export type PaymentProviderInstanceStatus = "ACTIVE" | "DISABLED";

export type PaymentProviderCredentialSetStatus =
  | "ACTIVE"
  | "DISABLED"
  | "ROTATED_OUT";

export type PaymentClientProviderBindingStatus = "ACTIVE" | "DISABLED";

export type WeChatPayVerifierConfig =
  | {
      mode: "WECHAT_PAY_PUBLIC_KEY";
      publicKeyId: string;
      publicKeyPem: string;
    }
  | {
      mode: "PLATFORM_CERTIFICATE";
      certificateSerialNo: string;
      certificatePem: string;
    };

export type WeChatPayChargeMode = "JSAPI" | "H5";

export type WeChatPayProviderInstanceConfig = {
  adapterMode: "WECHAT_PAY_API_V3";
  appId: string;
  mchId: string;
  chargeMode: WeChatPayChargeMode;
  notifyBaseUrl: string;
  paymentNotifyPath: string;
  refundNotifyPath: string;
};

export type FakeWeChatPayProviderInstanceConfig = {
  adapterMode: "FAKE_WECHAT_PAY";
  appId: string;
  mchId: string;
};

export type PaymentProviderInstanceConfig =
  | WeChatPayProviderInstanceConfig
  | FakeWeChatPayProviderInstanceConfig;

export type PaymentClientAction =
  | {
      type: "WECHAT_BRIDGE";
      appId: string;
      timeStamp: string;
      nonceStr: string;
      package: string;
      signType: "RSA";
      paySign: string;
    }
  | {
      type: "PAYMENT_REDIRECT";
      url: string;
    }
  | {
      type: "FAKE_PROVIDER_ACTION";
      message: string;
    };

export type NormalizedPaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CLOSED";

export type NormalizedChargeStatus = {
  status: NormalizedPaymentStatus;
  providerStatus: string;
  providerTransactionId?: string | null;
  providerSnapshot?: unknown;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type NormalizedRefundStatus = {
  status: NormalizedPaymentStatus;
  providerStatus: string;
  providerRefundId?: string | null;
  providerSnapshot?: unknown;
  failureCode?: string | null;
  failureMessage?: string | null;
};

export type ChargePrepayResult = {
  providerPrepayId: string;
  providerStatus: string;
  clientAction: PaymentClientAction;
  providerSnapshot: unknown;
};

export type CreateRefundResult = NormalizedRefundStatus;

export type CreateChargePrepayInput = {
  providerInstanceId: string;
  merchantOrderNo: string;
  amountFen: number;
  currency: "CNY";
  description: string;
  payerOpenId?: string | null;
  notifyUrl: string;
  expiresAt: Date;
};

export type QueryChargeInput = {
  providerInstanceId: string;
  merchantOrderNo: string;
  providerTransactionId?: string | null;
};

export type CreateRefundInput = {
  providerInstanceId: string;
  merchantRefundNo: string;
  originalMerchantOrderNo: string;
  originalProviderTransactionId?: string | null;
  originalAmountFen: number;
  refundAmountFen: number;
  currency: "CNY";
  reason: string;
  notifyUrl: string;
};

export type QueryRefundInput = {
  providerInstanceId: string;
  merchantRefundNo: string;
};

export type RawProviderNotification = {
  headers: {
    timestamp: string;
    nonce: string;
    signature: string;
    serial: string;
  };
  bodyText: string;
};

export type PaymentProviderPort = {
  createChargePrepay(input: CreateChargePrepayInput): Promise<ChargePrepayResult>;
  queryCharge(input: QueryChargeInput): Promise<NormalizedChargeStatus>;
  createRefund(input: CreateRefundInput): Promise<CreateRefundResult>;
  queryRefund(input: QueryRefundInput): Promise<NormalizedRefundStatus>;
  parsePaymentNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedChargeStatus & { merchantOrderNo: string }>;
  parseRefundNotification(
    input: RawProviderNotification,
  ): Promise<NormalizedRefundStatus & { merchantRefundNo: string }>;
};
