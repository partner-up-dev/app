import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  matchPlacementInstance,
  type MatchPlacementInstanceResult,
  type OrderingEntryPayload,
  resolvePlacementOrderingEntry,
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

type PlacementRouteSchema = {
  "/": {
    $post: JsonEndpoint<
      { query: { type: "BUTTON" }; json: z.infer<typeof matchingContextSchema> },
      MatchPlacementInstanceResult
    >;
  };
  "/:instanceId/ordering-entry": {
    $post: JsonEndpoint<
      { param: { instanceId: string }; json: z.infer<typeof matchingContextSchema> },
      OrderingEntryPayload
    >;
  };
  "/:instanceId/bindings": {
    $post: JsonEndpoint<
      { param: { instanceId: string }; json: z.infer<typeof matchingContextSchema> },
      { bindings: Record<string, unknown> }
    >;
  };
};

export const placementRoute: Hono<AuthEnv, PlacementRouteSchema> = app
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
    "/:instanceId/ordering-entry",
    zValidator("param", placementIdParamSchema),
    zValidator("json", matchingContextSchema),
    async (c) => {
      const { instanceId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await resolvePlacementOrderingEntry({
        placementInstanceId: instanceId,
        matchingContext: payload.matchingContext,
        viewerUserId: c.get("auth").userId,
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
