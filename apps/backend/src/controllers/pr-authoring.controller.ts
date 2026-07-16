import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, authMiddleware } from "../auth/middleware";
import {
  getPRAuthoringOptions,
  listMyPRTypeRouteApplications,
  submitPRAuthoringPreferenceTags,
  submitPRTypeRouteApplication,
} from "../domains/pr-authoring";
import { throwAuthenticatedRequired } from "../domains/pr-core/services/creator-identity.service";
import { prRouteSchema } from "../entities/partner-request";
import type { UserId } from "../entities/user";

const app = new Hono<AuthEnv>();
const typeQuerySchema = z.object({ type: z.string().trim().min(1) });
const preferenceTagSubmissionSchema = z.object({
  type: z.string().trim().min(1),
  labels: z.array(z.string().trim().min(1).max(80)).max(16),
});
const routeApplicationSchema = z.object({ type: z.string().trim().min(1), route: prRouteSchema });

const requireAuthenticatedUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.roles.includes("authenticated") || !auth.userId) return throwAuthenticatedRequired();
  return auth.userId as UserId;
};

export const prAuthoringRoute = app
  .use("*", authMiddleware)
  .get("/options", zValidator("query", typeQuerySchema), async (c) => {
    const { type } = c.req.valid("query");
    return c.json(await getPRAuthoringOptions(type));
  })
  .post("/preference-tags", zValidator("json", preferenceTagSubmissionSchema), async (c) => {
    const payload = c.req.valid("json");
    return c.json(await submitPRAuthoringPreferenceTags(payload), 201);
  })
  .get("/route-applications/mine", async (c) =>
    c.json(await listMyPRTypeRouteApplications(requireAuthenticatedUserId(c))),
  )
  .post("/route-applications", zValidator("json", routeApplicationSchema), async (c) => {
    const payload = c.req.valid("json");
    return c.json(
      await submitPRTypeRouteApplication({
        type: payload.type,
        route: payload.route,
        submittedByUserId: requireAuthenticatedUserId(c),
      }),
      201,
    );
  });

export type PRAuthoringRoute = typeof prAuthoringRoute;
