import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AdminAuthEnv, adminAuthMiddleware } from "../auth/admin-middleware";
import {
  adminPRTypeConfigAuthoringSchema,
  adminPRTypeConfigBodySchema,
  adminPRTypeConfigCompletionSchema,
  adminPRTypeConfigCoordinationSchema,
  adminPRTypeConfigDiscoverySchema,
  adminPRTypeConfigParticipationSchema,
  adminPRTypeConfigTypeParamSchema,
  adminPRTypePreferenceTagListQuerySchema,
  adminPRTypePreferenceTagModerationSchema,
  adminPRTypePreferenceTagParamSchema,
  createAdminPRTypeConfig,
  getAdminPRTypeConfigDetail,
  listAdminPRTypeConfigCatalog,
  listAdminPRTypePreferenceTags,
  moderateAdminPRTypePreferenceTag,
  updateAdminPRTypeConfigAuthoring,
  updateAdminPRTypeConfigCompletion,
  updateAdminPRTypeConfigCoordination,
  updateAdminPRTypeConfigDiscovery,
  updateAdminPRTypeConfigParticipation,
} from "../domains/admin-pr-type-config";
import {
  listAdminPRTypeRouteApplications,
  reviewAdminPRTypeRouteApplication,
} from "../domains/pr-authoring";
import { prRouteSchema } from "../entities/partner-request";

const app = new Hono<AdminAuthEnv>();

export const adminPRTypeConfigRoute = app
  .use("*", adminAuthMiddleware)
  .get("/pr-type-configs/catalog", async (c) => {
    return c.json(await listAdminPRTypeConfigCatalog());
  })
  .get("/pr-type-configs/route-applications", async (c) =>
    c.json(await listAdminPRTypeRouteApplications()),
  )
  .post(
    "/pr-type-configs/route-applications/:applicationId/review",
    zValidator("param", z.object({ applicationId: z.coerce.number().int().positive() })),
    zValidator(
      "json",
      z.object({
        status: z.enum(["ACCEPTED", "REJECTED"]),
        rejectReason: z.string().trim().max(1000).nullable().optional(),
        route: prRouteSchema.optional(),
      }),
    ),
    async (c) => {
      const { applicationId } = c.req.valid("param");
      const payload = c.req.valid("json");
      return c.json(
        await reviewAdminPRTypeRouteApplication({
          applicationId,
          status: payload.status,
          rejectReason: payload.rejectReason,
          route: payload.route,
          reviewedByUserId: c.get("auth").userId ?? null,
        }),
      );
    },
  )
  .get(
    "/pr-type-configs/:type",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await getAdminPRTypeConfigDetail(type));
    },
  )
  .put(
    "/pr-type-configs/:type",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigBodySchema),
    async (c) => {
      const { type } = c.req.valid("param");
      const payload = c.req.valid("json");
      return c.json(await createAdminPRTypeConfig({ type, ...payload }), 201);
    },
  )
  .put(
    "/pr-type-configs/:type/authoring",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigAuthoringSchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await updateAdminPRTypeConfigAuthoring(type, c.req.valid("json")));
    },
  )
  .put(
    "/pr-type-configs/:type/discovery",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigDiscoverySchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await updateAdminPRTypeConfigDiscovery(type, c.req.valid("json")));
    },
  )
  .put(
    "/pr-type-configs/:type/participation",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigParticipationSchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await updateAdminPRTypeConfigParticipation(type, c.req.valid("json")));
    },
  )
  .put(
    "/pr-type-configs/:type/coordination",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigCoordinationSchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await updateAdminPRTypeConfigCoordination(type, c.req.valid("json")));
    },
  )
  .put(
    "/pr-type-configs/:type/completion",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("json", adminPRTypeConfigCompletionSchema),
    async (c) => {
      const { type } = c.req.valid("param");
      return c.json(await updateAdminPRTypeConfigCompletion(type, c.req.valid("json")));
    },
  )
  .get(
    "/pr-type-configs/:type/preference-tags",
    zValidator("param", adminPRTypeConfigTypeParamSchema),
    zValidator("query", adminPRTypePreferenceTagListQuerySchema),
    async (c) => {
      const { type } = c.req.valid("param");
      const { moderationStatus } = c.req.valid("query");
      return c.json(await listAdminPRTypePreferenceTags({ type, moderationStatus }));
    },
  )
  .post(
    "/pr-type-configs/:type/preference-tags/:tagId/moderate",
    zValidator("param", adminPRTypePreferenceTagParamSchema),
    zValidator("json", adminPRTypePreferenceTagModerationSchema),
    async (c) => {
      const { type, tagId } = c.req.valid("param");
      const { moderationStatus } = c.req.valid("json");
      return c.json(await moderateAdminPRTypePreferenceTag({ type, tagId, moderationStatus }));
    },
  );

export type AdminPRTypeConfigRoute = typeof adminPRTypeConfigRoute;
