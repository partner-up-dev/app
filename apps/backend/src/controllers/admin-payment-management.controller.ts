import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createAdminPaymentProviderInstance,
  getAdminPaymentProviderWorkspace,
  updateAdminPaymentProviderInstance,
} from "../domains/admin-payment-management";
import type { PaymentProviderInstanceId } from "../entities/payment";
import { adminAuthMiddleware, type AdminAuthEnv } from "../auth/admin-middleware";

const app = new Hono<AdminAuthEnv>();

const nullableTrimmedUrlSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) return null;
  return value;
}, z.string().trim().url().nullable().optional());

const nullableTrimmedSecretSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length === 0) return null;
  return value;
}, z.string().trim().min(1).nullable().optional());

const providerInstanceIdParamSchema = z.object({
  providerInstanceId: z.string().uuid(),
});

const adminPaymentProviderInstanceInputSchema = z.object({
  providerType: z.literal("WECHAT_PAY"),
  displayName: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]),
  clientId: z.string().trim().min(1),
  config: z.object({
    adapterMode: z.literal("WECHAT_PAY_API_V3"),
    appId: z.string().trim().min(1),
    mchId: z.string().trim().min(1),
    chargeMode: z.enum(["JSAPI", "H5"]),
    endpointBaseUrl: nullableTrimmedUrlSchema,
    apiV3Key: nullableTrimmedSecretSchema,
    merchantCertificate: z.object({
      serialNo: z.string().trim().min(1),
      privateKeyPem: nullableTrimmedSecretSchema,
      certificatePem: nullableTrimmedSecretSchema,
    }),
  }),
});

type JsonEndpoint<Input, Output, Status extends number = 200> = {
  input: Input;
  output: Output;
  outputFormat: "json";
  status: Status;
};

type EmptyInput = {};
type UuidParam<Key extends string> = {
  param: Record<Key, string>;
};

type AdminPaymentManagementSchema = {
  "/payment/provider-instances/workspace": {
    $get: JsonEndpoint<EmptyInput, Awaited<ReturnType<typeof getAdminPaymentProviderWorkspace>>>;
  };
  "/payment/provider-instances": {
    $post: JsonEndpoint<
      { json: z.infer<typeof adminPaymentProviderInstanceInputSchema> },
      Awaited<ReturnType<typeof createAdminPaymentProviderInstance>>
    >;
  };
  "/payment/provider-instances/:providerInstanceId": {
    $patch: JsonEndpoint<
      UuidParam<"providerInstanceId"> & {
        json: z.infer<typeof adminPaymentProviderInstanceInputSchema>;
      },
      Awaited<ReturnType<typeof updateAdminPaymentProviderInstance>>
    >;
  };
};

export const adminPaymentManagementRoute: Hono<AdminAuthEnv, AdminPaymentManagementSchema> = app
  .use("*", adminAuthMiddleware)
  .get("/payment/provider-instances/workspace", async (c) => {
    const result = await getAdminPaymentProviderWorkspace();
    return c.json(result);
  })
  .post(
    "/payment/provider-instances",
    zValidator("json", adminPaymentProviderInstanceInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminPaymentProviderInstance(payload);
      return c.json(result);
    },
  )
  .patch(
    "/payment/provider-instances/:providerInstanceId",
    zValidator("param", providerInstanceIdParamSchema),
    zValidator("json", adminPaymentProviderInstanceInputSchema),
    async (c) => {
      const { providerInstanceId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminPaymentProviderInstance({
        providerInstanceId: providerInstanceId as PaymentProviderInstanceId,
        payload,
      });
      return c.json(result);
    },
  );
