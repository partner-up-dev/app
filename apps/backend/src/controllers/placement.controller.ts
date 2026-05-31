import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  matchPlacementInstance,
  resolvePlacementInstanceBindings,
} from "../domains/merchandising";

const app = new Hono<AuthEnv>();

const placementMatchQuerySchema = z.object({
  type: z.literal("BUTTON"),
});

const placementIdParamSchema = z.object({
  instanceId: z.coerce.number().int().positive(),
});

const matchingContextSchema = z.object({
  matchingContext: z.unknown(),
});

export const placementRoute = app
  .use("*", authMiddleware)
  .post(
    "/",
    zValidator("query", placementMatchQuerySchema),
    zValidator("json", matchingContextSchema),
    async (c) => {
      const query = c.req.valid("query");
      const payload = c.req.valid("json");
      const result = await matchPlacementInstance({
        type: query.type,
        matchingContext: payload.matchingContext,
      });
      return c.json(result);
    },
  )
  .post(
    "/:instanceId/bindings",
    zValidator("param", placementIdParamSchema),
    zValidator("json", matchingContextSchema),
    async (c) => {
      const { instanceId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await resolvePlacementInstanceBindings({
        placementInstanceId: instanceId,
        matchingContext: payload.matchingContext,
      });
      return c.json(result);
    },
  );
