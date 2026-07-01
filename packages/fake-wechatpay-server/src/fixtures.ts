import { readFileSync } from "node:fs";
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

export type FakeMerchantCertificate = z.infer<typeof fakeMerchantCertificateSchema>;

export type FakeWeChatPayConfig = z.infer<typeof fakeWeChatPayConfigSchema>;

export type FakeWeChatPayFixture = FakeWeChatPayConfig & {
  readonly platformCertificate: {
    readonly serialNo: string;
    readonly publicKeyPem: string;
    readonly privateKeyPem: string;
  };
};

const fakeWeChatPayFixtureSchema = fakeWeChatPayConfigSchema.extend({
  platformCertificate: z.object({
    serialNo: z.string().min(1),
    publicKeyPem: z.string().min(1),
    privateKeyPem: z.string().min(1),
  }),
});

const stableDevFixture = fakeWeChatPayFixtureSchema.parse(
  JSON.parse(
    readFileSync(new URL("./fixtures/stable-dev-fixture.json", import.meta.url), "utf8"),
  ) as unknown,
);

export function createFakeWeChatPayFixture(): FakeWeChatPayFixture {
  return structuredClone(stableDevFixture);
}
