import { generateKeyPairSync } from "node:crypto";
import { z } from "zod";

export const fakeMerchantCertificateSchema = z.object({
  serialNo: z.string().min(1),
  privateKeyPem: z.string().min(1),
  certificatePem: z.string().min(1),
});

export const fakeWeChatPayConfigSchema = z.object({
  appId: z.string().min(1),
  mchId: z.string().min(1),
  apiV3Key: z.string().length(32),
  merchantCertificate: fakeMerchantCertificateSchema,
});

export type FakeMerchantCertificate = z.infer<
  typeof fakeMerchantCertificateSchema
>;

export type FakeWeChatPayConfig = z.infer<typeof fakeWeChatPayConfigSchema>;

export type FakeWeChatPayFixture = FakeWeChatPayConfig & {
  readonly platformCertificate: {
    readonly serialNo: string;
    readonly publicKeyPem: string;
    readonly privateKeyPem: string;
  };
};

const generateRsaKeyPairPem = (): {
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

export function createFakeWeChatPayFixture(): FakeWeChatPayFixture {
  const merchant = generateRsaKeyPairPem();
  const platform = generateRsaKeyPairPem();

  return {
    appId: "wx_fake_partnerup_web",
    mchId: "1900000001",
    apiV3Key: "0123456789abcdef0123456789abcdef",
    merchantCertificate: {
      serialNo: "FAKE_MERCHANT_SERIAL_000000000001",
      privateKeyPem: merchant.privateKeyPem,
      certificatePem: merchant.publicKeyPem,
    },
    platformCertificate: {
      serialNo: "FAKE_PLATFORM_SERIAL_000000000001",
      publicKeyPem: platform.publicKeyPem,
      privateKeyPem: platform.privateKeyPem,
    },
  };
}
