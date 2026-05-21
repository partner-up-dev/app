import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  acceptedTelemetryEventTypes,
  ingestTelemetryEvents,
  ingestUserTelemetryEvents,
} from "../infra/telemetry";

const app = new Hono<AuthEnv>();

const telemetryEventTypeSchema = z.enum(acceptedTelemetryEventTypes);

const telemetryEventSchema = z.object({
  type: telemetryEventTypeSchema,
  source: z.string().max(64).optional(),
  payload: z.record(z.unknown()),
  occurredAt: z.string().datetime(),
  sessionId: z.string().max(128).optional(),
  userIdHash: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
});

const batchSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(100),
});

const optionalNullableString = (maxLength = 256) =>
  z.string().trim().max(maxLength).optional().nullable();

const userTelemetryEventNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(160)
  .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/);

const userTelemetryAttributeValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const userTelemetryEventSchema = z.object({
  event_id: z.string().uuid(),
  event_name: userTelemetryEventNameSchema,
  event_version: z.number().int().positive(),
  journey_id: z.string().uuid(),
  occurred_at: z.string().datetime(),
  trace_id: optionalNullableString(128),
  event_family: optionalNullableString(160),
  attributes: z.record(userTelemetryAttributeValueSchema).default({}),
  payload: z.record(z.unknown()).default({}),
});

const userTelemetryBatchSchema = z.object({
  events: z.array(userTelemetryEventSchema).min(1).max(100),
});

export const telemetryRoute = app
  .post("/events", zValidator("json", batchSchema), async (c) => {
    const { events } = c.req.valid("json");
    const result = await ingestTelemetryEvents(
      events.map((event) => ({
        ...event,
        payload: event.payload as Record<string, unknown>,
      })),
    );
    return c.json(result);
  })
  .post(
    "/user/events",
    authMiddleware,
    zValidator("json", userTelemetryBatchSchema),
    async (c) => {
      const { events } = c.req.valid("json");
      const result = await ingestUserTelemetryEvents(events);
      return c.json(result);
    },
  );
