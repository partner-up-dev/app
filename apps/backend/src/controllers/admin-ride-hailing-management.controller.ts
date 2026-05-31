import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  createAdminRideHailingProviderInstance,
  getAdminRideHailingProviderWorkspace,
  updateAdminRideHailingProviderInstance,
} from "../domains/admin-ride-hailing-management";
import type { RideHailingProviderInstanceId } from "../entities/ride-hailing-provider";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";

const app = new Hono<AdminAuthEnv>();

const nullableTrimmedUrlSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim().length === 0) return null;
    return value;
  },
  z.string().trim().url().nullable().optional(),
);

const nullableTrimmedSecretSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim().length === 0) return null;
    return value;
  },
  z.string().trim().min(1).nullable().optional(),
);

const nullablePositiveIntSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) return null;
    return value;
  },
  z.number().int().positive().nullable().optional(),
);

const providerInstanceIdParamSchema = z.object({
  providerInstanceId: z.string().uuid(),
});

const adminRideHailingProviderInstanceInputSchema = z.object({
  providerType: z.literal("CAOCAO"),
  instanceKey: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]),
  config: z.object({
    adapterMode: z.literal("CAOCAO_OPEN_API"),
    caocaoClientId: z.string().trim().min(1),
    signKey: nullableTrimmedSecretSchema,
    endpointBaseUrl: z.string().trim().url(),
    callbackBaseUrl: nullableTrimmedUrlSchema,
    requestTimeoutMs: nullablePositiveIntSchema,
  }),
});

type JsonEndpoint<
  Input,
  Output,
  Status extends number = 200,
> = {
  input: Input;
  output: Output;
  outputFormat: "json";
  status: Status;
};

type EmptyInput = {};
type UuidParam<Key extends string> = {
  param: Record<Key, string>;
};

type AdminRideHailingManagementSchema = {
  "/ride-hailing/provider-instances/workspace": {
    $get: JsonEndpoint<
      EmptyInput,
      Awaited<ReturnType<typeof getAdminRideHailingProviderWorkspace>>
    >;
  };
  "/ride-hailing/provider-instances": {
    $post: JsonEndpoint<
      { json: z.infer<typeof adminRideHailingProviderInstanceInputSchema> },
      Awaited<ReturnType<typeof createAdminRideHailingProviderInstance>>
    >;
  };
  "/ride-hailing/provider-instances/:providerInstanceId": {
    $patch: JsonEndpoint<
      UuidParam<"providerInstanceId"> & {
        json: z.infer<typeof adminRideHailingProviderInstanceInputSchema>;
      },
      Awaited<ReturnType<typeof updateAdminRideHailingProviderInstance>>
    >;
  };
};

export const adminRideHailingManagementRoute: Hono<
  AdminAuthEnv,
  AdminRideHailingManagementSchema
> = app
  .use("*", adminAuthMiddleware)
  .get("/ride-hailing/provider-instances/workspace", async (c) => {
    const result = await getAdminRideHailingProviderWorkspace();
    return c.json(result);
  })
  .post(
    "/ride-hailing/provider-instances",
    zValidator("json", adminRideHailingProviderInstanceInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminRideHailingProviderInstance(payload);
      return c.json(result);
    },
  )
  .patch(
    "/ride-hailing/provider-instances/:providerInstanceId",
    zValidator("param", providerInstanceIdParamSchema),
    zValidator("json", adminRideHailingProviderInstanceInputSchema),
    async (c) => {
      const { providerInstanceId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminRideHailingProviderInstance({
        providerInstanceId:
          providerInstanceId as RideHailingProviderInstanceId,
        payload,
      });
      return c.json(result);
    },
  );
