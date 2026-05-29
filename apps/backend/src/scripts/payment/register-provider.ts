import { readFile } from "node:fs/promises";
import { z } from "zod";
import { registerPaymentProviderInstance } from "../../domains/payment";

const paymentChannelSchema = z.enum(["WECHAT_PAY", "WECHAT_REFUND"]);

const verifierSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("WECHAT_PAY_PUBLIC_KEY"),
    publicKeyId: z.string().min(1),
    publicKeyPem: z.string().min(1),
  }),
  z.object({
    mode: z.literal("PLATFORM_CERTIFICATE"),
    certificateSerialNo: z.string().min(1),
    certificatePem: z.string().min(1),
  }),
]);

const providerConfigSchema = z.discriminatedUnion("adapterMode", [
  z.object({
    adapterMode: z.literal("WECHAT_PAY_API_V3"),
    appId: z.string().min(1),
    mchId: z.string().min(1),
    chargeMode: z.enum(["JSAPI", "H5"]),
    notifyBaseUrl: z.string().url(),
    paymentNotifyPath: z.string().min(1),
    refundNotifyPath: z.string().min(1),
  }),
  z.object({
    adapterMode: z.literal("FAKE_WECHAT_PAY"),
    appId: z.string().min(1),
    mchId: z.string().min(1),
  }),
]);

const registrationConfigSchema = z.object({
  providerType: z.literal("WECHAT_PAY"),
  instanceKey: z.string().min(1),
  displayName: z.string().min(1),
  config: providerConfigSchema,
  supportedChannels: z.array(paymentChannelSchema).min(1),
  credentialSet: z.object({
    merchantSerialNo: z.string().min(1),
    merchantPrivateKeyPem: z.string().min(1),
    apiV3Key: z.string().min(1),
    verifier: verifierSchema,
  }),
  clientBindings: z
    .array(
      z.object({
        clientId: z.string().min(1),
        channel: paymentChannelSchema,
        priority: z.number().int().positive().default(100),
      }),
    )
    .min(1),
});

const configPath = process.argv[2];
if (!configPath) {
  console.error(
    "Usage: pnpm --filter @partner-up-dev/backend payment:register-provider <config.json>",
  );
  process.exit(1);
}

const rawConfig = await readFile(configPath, "utf8");
const config = registrationConfigSchema.parse(JSON.parse(rawConfig) as unknown);
const result = await registerPaymentProviderInstance(config);

console.info(
  JSON.stringify(
    {
      providerInstanceId: result.providerInstanceId,
      credentialSetId: result.credentialSetId,
      clientBindingIds: result.clientBindingIds,
    },
    null,
    2,
  ),
);
