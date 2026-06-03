import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ProblemDetailsError } from "../../../lib/problem-details";
import type { WeChatPayProviderInstanceConfig } from "../model";
import { normalizeAndValidateWeChatPayProviderConfig } from "./wechatpay-config-validation";

const generateRsaPemPair = (): {
  privateKeyPem: string;
  publicKeyPem: string;
} => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });

  return {
    privateKeyPem: privateKey,
    publicKeyPem: publicKey,
  };
};

const buildConfig = (
  override: Partial<WeChatPayProviderInstanceConfig> = {},
): WeChatPayProviderInstanceConfig => {
  const merchant = generateRsaPemPair();
  const platform = generateRsaPemPair();

  return {
    adapterMode: "WECHAT_PAY_API_V3",
    appId: " wx-test ",
    mchId: " 1900000001 ",
    chargeMode: "JSAPI",
    endpointBaseUrl: null,
    apiV3Key: "0123456789abcdef0123456789abcdef",
    merchantCertificate: {
      serialNo: " test-merchant-serial ",
      privateKeyPem: merchant.privateKeyPem,
      certificatePem: merchant.publicKeyPem,
    },
    platformCertificates: [
      {
        serialNo: " test-platform-serial ",
        certificatePem: platform.publicKeyPem,
      },
    ],
    ...override,
  };
};

const captureProblem = (fn: () => void): ProblemDetailsError => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ProblemDetailsError);
    return error;
  }
  throw new Error("Expected ProblemDetailsError");
};

describe("normalizeAndValidateWeChatPayProviderConfig", () => {
  it("accepts RSA PEM material and trims non-secret identifiers", () => {
    const normalized = normalizeAndValidateWeChatPayProviderConfig(buildConfig());

    expect(normalized.appId).toBe("wx-test");
    expect(normalized.mchId).toBe("1900000001");
    expect(normalized.merchantCertificate.serialNo).toBe(
      "test-merchant-serial",
    );
    expect(normalized.platformCertificates?.[0]?.serialNo).toBe(
      "test-platform-serial",
    );
  });

  it("normalizes literal backslash-n PEM input before validation", () => {
    const merchant = generateRsaPemPair();
    const normalized = normalizeAndValidateWeChatPayProviderConfig(
      buildConfig({
        merchantCertificate: {
          serialNo: "test-merchant-serial",
          privateKeyPem: merchant.privateKeyPem.replace(/\n/g, "\\n"),
          certificatePem: merchant.publicKeyPem.replace(/\n/g, "\\n"),
        },
        platformCertificates: null,
      }),
    );

    expect(normalized.merchantCertificate.privateKeyPem).toContain("\n");
    expect(normalized.merchantCertificate.privateKeyPem).not.toContain("\\n");
  });

  it("rejects invalid private key material at the config boundary", () => {
    const problem = captureProblem(() =>
      normalizeAndValidateWeChatPayProviderConfig(
        buildConfig({
          merchantCertificate: {
            serialNo: "test-merchant-serial",
            privateKeyPem: "not-a-private-key",
            certificatePem: null,
          },
          platformCertificates: null,
        }),
      ),
    );

    expect(problem.status).toBe(422);
    expect(problem.code).toBe("WECHAT_PAY_MERCHANT_PRIVATE_KEY_INVALID");
  });

  it("rejects APIv3 keys that are not exactly 32 bytes", () => {
    const problem = captureProblem(() =>
      normalizeAndValidateWeChatPayProviderConfig(
        buildConfig({
          apiV3Key: "too-short",
        }),
      ),
    );

    expect(problem.status).toBe(422);
    expect(problem.code).toBe("WECHAT_PAY_API_V3_KEY_INVALID");
  });
});
