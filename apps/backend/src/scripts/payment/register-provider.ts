import { readFile } from "node:fs/promises";
import { z } from "zod";
import { registerPaymentProviderInstance } from "../../domains/payment";

const platformCertificateSchema = z.object({
  serialNo: z.string().min(1),
  certificatePem: z.string().min(1),
  effectiveTime: z.string().min(1).nullable().optional(),
  expireTime: z.string().min(1).nullable().optional(),
});

const providerConfigSchema = z.object({
  adapterMode: z.literal("WECHAT_PAY_API_V3"),
  appId: z.string().min(1),
  mchId: z.string().min(1),
  chargeMode: z.enum(["JSAPI", "H5"]),
  endpointBaseUrl: z.string().url().nullable().optional(),
  apiV3Key: z.string().min(1),
  merchantCertificate: z.object({
    serialNo: z.string().min(1),
    privateKeyPem: z.string().min(1),
    certificatePem: z.string().min(1).nullable().optional(),
  }),
  platformCertificates: z
    .array(platformCertificateSchema)
    .min(1)
    .nullable()
    .optional(),
});

const registrationConfigSchema = z.object({
  providerType: z.literal("WECHAT_PAY"),
  instanceKey: z.string().min(1),
  displayName: z.string().min(1),
  clientId: z.string().min(1),
  config: providerConfigSchema,
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
    },
    null,
    2,
  ),
);
