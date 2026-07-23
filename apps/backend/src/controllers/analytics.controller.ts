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
import { resolveAnalyticsRange } from "../infra/analytics/analytics-range";
import { createHttpProblem } from "../lib/problem-details";

const app = new Hono<AdminAuthEnv>();

const instantDateTimeSchema = z.string().datetime({ offset: true });

const analyticsDateRangeQuerySchema = z
  .object({
    startAt: instantDateTimeSchema.optional(),
    endAt: instantDateTimeSchema.optional(),
  })
  .transform((query, context) => {
    try {
      return resolveAnalyticsRange({
        startAt: query.startAt ? new Date(query.startAt) : undefined,
        endAt: query.endAt ? new Date(query.endAt) : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid Analytics range";
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [message.startsWith("startAt") ? "startAt" : "endAt"],
        message,
      });
      return z.NEVER;
    }
  });

const optionalFilterString = (maxLength = 256) =>
  z.string().trim().min(1).max(maxLength).optional();

const prDiscoveryFunnelQuerySchema = analyticsDateRangeQuerySchema.and(
  z.object({
    prType: optionalFilterString(120),
    viewMode: z.enum(["LIST", "CARD", "FORM"]).optional(),
    origin: optionalFilterString(120),
  }),
);

const parseOptionalDate = (value: string | undefined): Date | undefined =>
  value ? new Date(value) : undefined;

const analyticsQueryValidationHook = (result: { success: boolean; error?: z.ZodError }): void => {
  if (result.success) return;
  throw createHttpProblem({
    status: 422,
    code: "VALIDATION_FAILED",
    detail: result.error?.issues.map((issue) => issue.message).join("; ") ?? "Invalid query",
    type: "https://partner-up.app/problems/validation.failed",
  });
};

export const analyticsRoute = app
  .use("*", analyticsAuthMiddleware)
  .get(
    "/overview",
    zValidator("query", analyticsDateRangeQuerySchema, analyticsQueryValidationHook),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getBIOverviewAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
      });
      return c.json(result);
    },
  )
  .get(
    "/pr-discovery-funnel",
    zValidator("query", prDiscoveryFunnelQuerySchema, analyticsQueryValidationHook),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getPRDiscoveryFunnelAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
        prType: query.prType,
        viewMode: query.viewMode,
        origin: query.origin,
      });
      return c.json(result);
    },
  )
  .get(
    "/pr-create-funnel",
    zValidator("query", analyticsDateRangeQuerySchema, analyticsQueryValidationHook),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getPRCreateFunnelAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
      });
      return c.json(result);
    },
  )
  .get(
    "/pr-join-funnel",
    zValidator("query", analyticsDateRangeQuerySchema, analyticsQueryValidationHook),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getPRJoinFunnelAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
      });
      return c.json(result);
    },
  );
