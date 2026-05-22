import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  analyticsAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import {
  ANCHOR_EVENT_ANALYTICS_RENDERED_MODES,
  getAnchorEventFunnelAnalytics,
  getBIOverviewAnalytics,
  getPRCreateFunnelAnalytics,
  getPRJoinFunnelAnalytics,
} from "../infra/analytics";

const app = new Hono<AdminAuthEnv>();

const analyticsDateRangeQuerySchema = z.object({
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

const optionalFilterString = (maxLength = 256) =>
  z.string().trim().min(1).max(maxLength).optional();

const anchorEventFunnelQuerySchema = z
  .object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    eventId: z.coerce.number().int().positive().optional(),
    spm: optionalFilterString(),
    sourceQr: optionalFilterString(),
    assignmentRevision: optionalFilterString(120),
    renderedMode: z.enum(ANCHOR_EVENT_ANALYTICS_RENDERED_MODES).optional(),
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
  .get(
    "/overview",
    zValidator("query", analyticsDateRangeQuerySchema),
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
    "/anchor-event-funnel",
    zValidator("query", anchorEventFunnelQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getAnchorEventFunnelAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
        eventId: query.eventId,
        spm: query.spm,
        sourceQr: query.sourceQr,
        assignmentRevision: query.assignmentRevision,
        renderedMode: query.renderedMode,
      });
      return c.json(result);
    },
  )
  .get(
    "/pr-create-funnel",
    zValidator("query", analyticsDateRangeQuerySchema),
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
    zValidator("query", analyticsDateRangeQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const result = await getPRJoinFunnelAnalytics({
        startAt: parseOptionalDate(query.startAt),
        endAt: parseOptionalDate(query.endAt),
      });
      return c.json(result);
    },
  );
