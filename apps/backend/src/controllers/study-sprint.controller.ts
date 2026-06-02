import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { requireAuthenticatedUserId } from "./pr-controller.shared";
import {
  getStudySprintRoomSnapshot,
  recordStudySprintSessionEvent,
  startStudySprintSession,
  studySprintSessionEventPayloadSchema,
  studySprintSessionEventTypeSchema,
} from "../domains/study-sprint";
import type { StudySprintSessionId } from "../entities/study-sprint";

const app = new Hono<AuthEnv>();

const prIdParamSchema = z.object({
  prId: z.coerce.number().int().positive(),
});

const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid(),
});

const clientSeqSchema = z.number().int().nonnegative();

const startSessionSchema = z
  .object({
    clientSeq: clientSeqSchema,
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();

const recordEventSchema = z
  .object({
    eventType: studySprintSessionEventTypeSchema.exclude(["STARTED"]),
    occurredAt: z.string().datetime({ offset: true }),
    clientSeq: clientSeqSchema,
    payload: studySprintSessionEventPayloadSchema.default({}),
  })
  .strict();

export const studySprintRoute = app
  .use("*", authMiddleware)
  .get("/pr/:prId/room", zValidator("param", prIdParamSchema), async (c) => {
    const userId = requireAuthenticatedUserId(c);
    const { prId } = c.req.valid("param");
    const snapshot = await getStudySprintRoomSnapshot({ prId, userId });
    return c.json(snapshot);
  })
  .post(
    "/pr/:prId/sessions/start",
    zValidator("param", prIdParamSchema),
    zValidator("json", startSessionSchema),
    async (c) => {
      const userId = requireAuthenticatedUserId(c);
      const { prId } = c.req.valid("param");
      const command = c.req.valid("json");
      const snapshot = await startStudySprintSession({
        prId,
        userId,
        clientSeq: command.clientSeq,
        occurredAt: new Date(command.occurredAt),
      });
      return c.json(snapshot, 201);
    },
  )
  .post(
    "/sessions/:sessionId/events",
    zValidator("param", sessionIdParamSchema),
    zValidator("json", recordEventSchema),
    async (c) => {
      const userId = requireAuthenticatedUserId(c);
      const { sessionId } = c.req.valid("param");
      const command = c.req.valid("json");
      const snapshot = await recordStudySprintSessionEvent({
        sessionId: sessionId as StudySprintSessionId,
        userId,
        eventType: command.eventType,
        occurredAt: new Date(command.occurredAt),
        clientSeq: command.clientSeq,
        payload: command.payload,
      });
      return c.json(snapshot);
    },
  );
