import { createPrivateKey, createPublicKey } from "node:crypto";
import {
  ProblemDetailsError,
  throwHttpProblem,
} from "../../../lib/problem-details";
import type {
  WeChatPayPlatformCertificate,
  WeChatPayProviderInstanceConfig,
} from "../model";

const normalizePemText = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes("\n") && trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return trimmed.replace(/\r\n/g, "\n");
};

const assertApiV3Key = (apiV3Key: string): void => {
  if (Buffer.byteLength(apiV3Key, "utf8") !== 32) {
    return throwHttpProblem({
      status: 422,
      detail: "WeChatPay apiV3Key must be exactly 32 bytes",
      code: "WECHAT_PAY_API_V3_KEY_INVALID",
    });
  }
};

const assertMerchantPrivateKeyPem = (privateKeyPem: string): void => {
  try {
    const key = createPrivateKey(privateKeyPem);
    if (key.asymmetricKeyType !== "rsa") {
      return throwHttpProblem({
        status: 422,
        detail: "WeChatPay merchant private key must be an RSA private key PEM",
        code: "WECHAT_PAY_MERCHANT_PRIVATE_KEY_INVALID",
      });
    }
  } catch (error) {
    if (error instanceof ProblemDetailsError) {
      throw error;
    }
    return throwHttpProblem({
      status: 422,
      detail:
        "WeChatPay merchant private key PEM is invalid; use the raw apiclient_key.pem content",
      code: "WECHAT_PAY_MERCHANT_PRIVATE_KEY_INVALID",
    });
  }
};

const assertPublicKeyLikePem = (input: {
  pem: string;
  detail: string;
  code: string;
}): void => {
  try {
    const key = createPublicKey(input.pem);
    if (key.asymmetricKeyType !== "rsa") {
      return throwHttpProblem({
        status: 422,
        detail: input.detail,
        code: input.code,
      });
    }
  } catch (error) {
    if (error instanceof ProblemDetailsError) {
      throw error;
    }
    return throwHttpProblem({
      status: 422,
      detail: input.detail,
      code: input.code,
    });
  }
};

const normalizePlatformCertificates = (
  certificates: WeChatPayPlatformCertificate[] | null | undefined,
): WeChatPayPlatformCertificate[] | null | undefined => {
  if (!certificates) {
    return certificates;
  }

  return certificates.map((certificate) => {
    const certificatePem = normalizePemText(certificate.certificatePem);
    assertPublicKeyLikePem({
      pem: certificatePem,
      detail: "WeChatPay platform certificate PEM is invalid",
      code: "WECHAT_PAY_PLATFORM_CERTIFICATE_INVALID",
    });

    return {
      ...certificate,
      serialNo: certificate.serialNo.trim(),
      certificatePem,
    };
  });
};

export const normalizeAndValidateWeChatPayProviderConfig = (
  config: WeChatPayProviderInstanceConfig,
): WeChatPayProviderInstanceConfig => {
  const apiV3Key = config.apiV3Key.trim();
  assertApiV3Key(apiV3Key);

  const privateKeyPem = normalizePemText(
    config.merchantCertificate.privateKeyPem,
  );
  assertMerchantPrivateKeyPem(privateKeyPem);

  const certificatePem = config.merchantCertificate.certificatePem
    ? normalizePemText(config.merchantCertificate.certificatePem)
    : null;
  if (certificatePem) {
    assertPublicKeyLikePem({
      pem: certificatePem,
      detail: "WeChatPay merchant certificate PEM is invalid",
      code: "WECHAT_PAY_MERCHANT_CERTIFICATE_INVALID",
    });
  }

  return {
    ...config,
    appId: config.appId.trim(),
    mchId: config.mchId.trim(),
    endpointBaseUrl: config.endpointBaseUrl?.trim() ?? null,
    apiV3Key,
    merchantCertificate: {
      serialNo: config.merchantCertificate.serialNo.trim(),
      privateKeyPem,
      certificatePem,
    },
    platformCertificates: normalizePlatformCertificates(
      config.platformCertificates,
    ),
  };
};
