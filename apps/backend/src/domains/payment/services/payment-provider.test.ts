import { generateKeyPairSync } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { PaymentProviderInstance, PaymentProviderInstanceId } from "../../../entities/payment";
import type { PaymentProviderPort } from "../model";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";
process.env.PAYMENT_NOTIFY_BASE_URL ??= "http://localhost:3000";

const providerInstanceId = "00000000-0000-4000-8000-000000000010" as PaymentProviderInstanceId;
const otherProviderInstanceId = "00000000-0000-4000-8000-000000000011" as PaymentProviderInstanceId;
const billLineId = "00000000-0000-4000-8000-000000000201";
let createPaymentProviderPort:
  | typeof import("./payment-provider").createPaymentProviderPort
  | null = null;

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

const buildProviderInstance = (
  id: PaymentProviderInstanceId = providerInstanceId,
): PaymentProviderInstance => {
  const merchant = generateRsaPemPair();
  const platform = generateRsaPemPair();
  const now = new Date("2031-01-01T00:00:00.000Z");

  return {
    id,
    providerType: "WECHAT_PAY",
    instanceKey: `wechat-${id}`,
    status: "ACTIVE",
    displayName: "Unit WeChatPay",
    clientId: "unit-wechatpay",
    config: {
      adapterMode: "WECHAT_PAY_API_V3",
      appId: "wx-unit",
      mchId: "1900000001",
      chargeMode: "H5",
      endpointBaseUrl: null,
      apiV3Key: "0123456789abcdef0123456789abcdef",
      merchantCertificate: {
        serialNo: "merchant-serial",
        privateKeyPem: merchant.privateKeyPem,
        certificatePem: merchant.publicKeyPem,
      },
      platformCertificates: [
        {
          serialNo: "platform-serial",
          certificatePem: platform.publicKeyPem,
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  };
};

beforeAll(async () => {
  const paymentProviderModule = await import("./payment-provider");
  createPaymentProviderPort = paymentProviderModule.createPaymentProviderPort;
}, 30_000);

const createUnitPaymentProviderPort = (
  providerInstance: PaymentProviderInstance = buildProviderInstance(),
): PaymentProviderPort => {
  if (!createPaymentProviderPort) {
    throw new Error("Payment provider module was not loaded");
  }
  return createPaymentProviderPort({ providerInstance });
};

describe("WeChatPay merchant payment references", () => {
  it("allows portless local endpoint hosts outside production", () => {
    const providerInstance = buildProviderInstance();
    providerInstance.config.endpointBaseUrl = "https://wechatpay.partner-up.local";

    expect(() => createUnitPaymentProviderPort(providerInstance)).not.toThrow();
  });

  it("round-trips charge reference material without persisted merchant order state", () => {
    const port = createUnitPaymentProviderPort();

    const merchantOrderNo = port.deriveChargeMerchantOrderNo({
      providerInstanceId,
      billLineId,
      kind: "CHARGE",
      attemptCount: 1,
    });
    const parsed = port.parseMerchantPaymentReference(merchantOrderNo);

    expect(merchantOrderNo).toHaveLength(32);
    expect(parsed).toEqual({
      providerInstanceId,
      billLineId,
      kind: "CHARGE",
      attemptCount: 1,
    });
  });

  it("round-trips refund reference material separately from charge references", () => {
    const port = createUnitPaymentProviderPort();

    const merchantRefundNo = port.deriveRefundMerchantRefundNo({
      providerInstanceId,
      billLineId,
      kind: "REFUND",
      attemptCount: 42,
    });
    const parsed = port.parseMerchantPaymentReference(merchantRefundNo);

    expect(merchantRefundNo).toHaveLength(32);
    expect(parsed).toEqual({
      providerInstanceId,
      billLineId,
      kind: "REFUND",
      attemptCount: 42,
    });
  });

  it("rejects tampered references", () => {
    const port = createUnitPaymentProviderPort();
    const merchantOrderNo = port.deriveChargeMerchantOrderNo({
      providerInstanceId,
      billLineId,
      kind: "CHARGE",
      attemptCount: 1,
    });
    const tampered = `${merchantOrderNo.slice(0, -1)}${merchantOrderNo.endsWith("A") ? "B" : "A"}`;

    expect(() => port.parseMerchantPaymentReference(tampered)).toThrow(
      "Invalid WeChatPay merchant reference signature",
    );
  });

  it("rejects references derived for another provider instance", () => {
    const port = createUnitPaymentProviderPort();

    expect(() =>
      port.deriveChargeMerchantOrderNo({
        providerInstanceId: otherProviderInstanceId,
        billLineId,
        kind: "CHARGE",
        attemptCount: 1,
      }),
    ).toThrow("provider instance mismatch");
  });

  it("rejects mismatched charge and refund reference kinds", () => {
    const port = createUnitPaymentProviderPort();

    expect(() =>
      port.deriveChargeMerchantOrderNo({
        providerInstanceId,
        billLineId,
        kind: "REFUND",
        attemptCount: 1,
      }),
    ).toThrow("requires charge kind");
    expect(() =>
      port.deriveRefundMerchantRefundNo({
        providerInstanceId,
        billLineId,
        kind: "CHARGE",
        attemptCount: 1,
      }),
    ).toThrow("requires refund kind");
  });

  it("rejects attempt counts outside the reference encoding range", () => {
    const port = createUnitPaymentProviderPort();

    expect(() =>
      port.deriveChargeMerchantOrderNo({
        providerInstanceId,
        billLineId,
        kind: "CHARGE",
        attemptCount: 0,
      }),
    ).toThrow("attempt count");
    expect(() =>
      port.deriveChargeMerchantOrderNo({
        providerInstanceId,
        billLineId,
        kind: "CHARGE",
        attemptCount: 36 ** 3,
      }),
    ).toThrow("attempt count");
  });
});
