import type { PaymentProviderInstance } from "../../../entities/payment";
import { env } from "../../../lib/env";
import type {
  WeChatPayPlatformCertificate,
  WeChatPayProviderInstanceConfig,
} from "../../payment/contracts";

export type AdminWeChatPayPlatformCertificateView = Omit<
  WeChatPayPlatformCertificate,
  "certificatePem"
> & {
  certificatePemConfigured: boolean;
};

export type AdminWeChatPayProviderInstanceConfigView = Omit<
  WeChatPayProviderInstanceConfig,
  "apiV3Key" | "merchantCertificate" | "platformCertificates"
> & {
  apiV3KeyConfigured: boolean;
  merchantCertificate: {
    serialNo: string;
    privateKeyPemConfigured: boolean;
    certificatePemConfigured: boolean;
  };
  platformCertificates: {
    count: number;
    items: AdminWeChatPayPlatformCertificateView[];
  };
};

export type AdminPaymentProviderInstanceView = Omit<PaymentProviderInstance, "config"> & {
  chargeNotifyUrl: string | null;
  refundNotifyUrl: string | null;
  config: AdminWeChatPayProviderInstanceConfigView;
};

const resolveNotifyUrl = (
  providerInstance: PaymentProviderInstance,
  type: "charge" | "refund",
): string | null => {
  if (!env.PAYMENT_NOTIFY_BASE_URL) {
    return null;
  }

  return new URL(
    `/api/payment/wechat-pay/${providerInstance.id}/notify/${type}`,
    env.PAYMENT_NOTIFY_BASE_URL,
  ).toString();
};

const toPlatformCertificateView = (
  certificate: WeChatPayPlatformCertificate,
): AdminWeChatPayPlatformCertificateView => {
  const { certificatePem: _certificatePem, ...publicCertificate } = certificate;

  return {
    ...publicCertificate,
    certificatePemConfigured: certificate.certificatePem.length > 0,
  };
};

export function toAdminPaymentProviderInstanceView(
  providerInstance: PaymentProviderInstance,
): AdminPaymentProviderInstanceView {
  const { config } = providerInstance;
  const {
    apiV3Key: _apiV3Key,
    merchantCertificate,
    platformCertificates,
    ...publicConfig
  } = config;

  const platformCertificateItems = (platformCertificates ?? []).map(toPlatformCertificateView);

  return {
    ...providerInstance,
    chargeNotifyUrl: resolveNotifyUrl(providerInstance, "charge"),
    refundNotifyUrl: resolveNotifyUrl(providerInstance, "refund"),
    config: {
      ...publicConfig,
      apiV3KeyConfigured: config.apiV3Key.length > 0,
      merchantCertificate: {
        serialNo: merchantCertificate.serialNo,
        privateKeyPemConfigured: merchantCertificate.privateKeyPem.length > 0,
        certificatePemConfigured: (merchantCertificate.certificatePem ?? "").length > 0,
      },
      platformCertificates: {
        count: platformCertificateItems.length,
        items: platformCertificateItems,
      },
    },
  };
}
