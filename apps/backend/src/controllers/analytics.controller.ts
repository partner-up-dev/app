import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AdminAuthEnv, analyticsAuthMiddleware } from "../auth/admin-middleware";
import {
  getBIOverviewAnalytics,
  getPRCreateFunnelAnalytics,
  getPRDiscoveryFunnelAnalytics,
  getPRJoinFunnelAnalytics,
} from "../infra/analytics";

const app = new Hono<AdminAuthEnv>();

const instantDateTimeSchema = z.string().datetime({ offset: true });

const analyticsDateRangeQuerySchema = z.object({
  startAt: instantDateTimeSchema.optional(),
  endAt: instantDateTimeSchema.optional(),
});

const optionalFilterString = (maxLength = 256) =>
  z.string().trim().min(1).max(maxLength).optional();

const prDiscoveryFunnelQuerySchema = z
  .object({
    startAt: instantDateTimeSchema.optional(),
    endAt: instantDateTimeSchema.optional(),
    prType: optionalFilterString(120),
    viewMode: z.enum(["LIST", "CARD", "FORM"]).optional(),
    origin: optionalFilterString(120),
  })
  .superRefine((query, context) => {
    if (!query.startAt) return;
    const endAt = query.endAt ? new Date(query.endAt) : new Date();
    if (new Date(query.startAt).getTime() < endAt.getTime()) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startAt"],
      message: "startAt must be before endAt",
    });
  });

const parseOptionalDate = (value: string | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

export const analyticsRoute = app
  .use("*", analyticsAuthMiddleware)
  .get("/overview", zValidator("query", analyticsDateRangeQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await getBIOverviewAnalytics({
      startAt: parseOptionalDate(query.startAt),
      endAt: parseOptionalDate(query.endAt),
    });
    return c.json(result);
  })
  .get("/pr-discovery-funnel", zValidator("query", prDiscoveryFunnelQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await getPRDiscoveryFunnelAnalytics({
      startAt: parseOptionalDate(query.startAt),
      endAt: parseOptionalDate(query.endAt),
      prType: query.prType,
      viewMode: query.viewMode,
      origin: query.origin,
    });
    return c.json(result);
  })
  .get("/pr-create-funnel", zValidator("query", analyticsDateRangeQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await getPRCreateFunnelAnalytics({
      startAt: parseOptionalDate(query.startAt),
      endAt: parseOptionalDate(query.endAt),
    });
    return c.json(result);
  })
  .get("/pr-join-funnel", zValidator("query", analyticsDateRangeQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await getPRJoinFunnelAnalytics({
      startAt: parseOptionalDate(query.startAt),
      endAt: parseOptionalDate(query.endAt),
    });
    return c.json(result);
  });
