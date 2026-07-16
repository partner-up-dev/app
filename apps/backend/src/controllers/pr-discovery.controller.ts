import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, authMiddleware } from "../auth/middleware";
import {
  getPRDiscoveryTypeDetail,
  getPRDiscoveryView,
  listPRDiscoveryCatalog,
  listPRDiscoveryDirectory,
  recommendPRDiscoveryCandidates,
} from "../domains/pr-discovery";
import { prRouteSchema } from "../entities/partner-request";
import type { UserId } from "../entities/user";

const app = new Hono<AuthEnv>();

const typeQuerySchema = z.object({
  type: z.string().trim().min(1),
});

const typeParamSchema = z.object({
  type: z.string().trim().min(1),
});

const directoryQuerySchema = typeQuerySchema.extend({
  date: z.preprocess(
    (value) => (Array.isArray(value) ? value : typeof value === "string" ? [value] : []),
    z.array(z.string()).max(28).default([]),
  ),
});

const instantDateTimeSchema = z.string().datetime({ offset: true });
const timeWindowSchema = z
  .object({
    startAt: instantDateTimeSchema,
    endAt: instantDateTimeSchema,
  })
  .superRefine((window, ctx) => {
    if (new Date(window.endAt).getTime() < new Date(window.startAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endAt must not be before startAt",
        path: ["endAt"],
      });
    }
  });

const placeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("location"), location: z.string().trim().min(1) }),
  z.object({ kind: z.literal("route"), route: prRouteSchema }),
]);

const recommendSchema = z.object({
  type: z.string().trim().min(1),
  place: placeSchema,
  timeWindows: z.array(timeWindowSchema).min(1).max(14),
  preferences: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
});

const readSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  return auth.userId ? (auth.userId as UserId) : null;
};

export const prDiscoveryRoute = app
  .use("*", authMiddleware)
  .get("/catalog", async (c) => c.json(await listPRDiscoveryCatalog()))
  .get("/types/:type", zValidator("param", typeParamSchema), async (c) =>
    c.json(await getPRDiscoveryTypeDetail(c.req.valid("param").type)),
  )
  .get("/view", zValidator("query", typeQuerySchema), async (c) => {
    const { type } = c.req.valid("query");
    return c.json(await getPRDiscoveryView(type));
  })
  .post("/recommend", zValidator("json", recommendSchema), async (c) => {
    const payload = c.req.valid("json");
    return c.json(
      await recommendPRDiscoveryCandidates({ ...payload, viewerUserId: readSessionUserId(c) }),
    );
  })
  .get("/", zValidator("query", directoryQuerySchema), async (c) => {
    const { type, date } = c.req.valid("query");
    return c.json(
      await listPRDiscoveryDirectory({
        type,
        dates: date,
        viewerUserId: readSessionUserId(c),
      }),
    );
  });

export type PRDiscoveryRoute = typeof prDiscoveryRoute;
