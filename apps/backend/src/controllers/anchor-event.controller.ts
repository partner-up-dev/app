import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listAnchorEvents,
  getAnchorEventDetail,
  getAnchorEventDemandCards,
  assignAnchorEventLandingMode,
  getAnchorEventFormModeData,
  submitAnchorEventFormModePreferenceTags,
  recommendAnchorEventFormModePRs,
  type AnchorEventFormModeRecommendationPlaceSelection,
} from "../domains/anchor-event";
import {
  listMyAnchorEventRouteApplications,
  submitAnchorEventRouteApplication,
} from "../domains/anchor-event-route-application";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { prRouteSchema } from "../entities/partner-request";
import type { UserId } from "../entities/user";
import { throwHttpProblem } from "../lib/problem-details";

const app = new Hono<AuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const formModePreferenceSubmissionSchema = z.object({
  labels: z.array(z.string().trim().min(1).max(80)).max(16),
});

const formModeRecommendationPlaceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("location"),
    locationId: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("route"),
    routePoolEntryId: z.string().trim().min(1).max(120),
  }),
]);

const formModeRecommendationBaseSchema = z.object({
  startAt: z.string().datetime(),
  preferences: z.array(z.string().trim().min(1).max(80)).max(16),
  correlationId: z.string().trim().min(1).max(128).optional(),
});

const formModeRecommendationSchema = z.union([
  formModeRecommendationBaseSchema.extend({
    place: formModeRecommendationPlaceSchema,
  }),
  formModeRecommendationBaseSchema.extend({
    locationId: z.string().trim().min(1),
  }),
]);

type FormModeRecommendationPayload = z.infer<
  typeof formModeRecommendationSchema
>;

const resolveFormModeRecommendationPlace = (
  payload: FormModeRecommendationPayload,
): AnchorEventFormModeRecommendationPlaceSelection => {
  if ("place" in payload) {
    return payload.place;
  }

  return {
    kind: "location",
    locationId: payload.locationId,
  };
};

const routeApplicationSchema = z.object({
  route: prRouteSchema,
});

const requireSessionUserId = (c: Context<AuthEnv>): UserId => {
  const auth = c.get("auth");
  if (!auth.userId) {
    return throwHttpProblem({ status: 401, detail: "Authentication required" });
  }
  return auth.userId as UserId;
};

export const anchorEventRoute = app
  .use("*", authMiddleware)
  // GET /api/events - List all active anchor events (Event Plaza)
  .get("/", async (c) => {
    const events = await listAnchorEvents();
    return c.json(events);
  })
  .get("/route-applications/mine", async (c) => {
    const userId = requireSessionUserId(c);
    const applications = await listMyAnchorEventRouteApplications(userId);
    return c.json(applications);
  })
  .post(
    "/:eventId/route-applications",
    zValidator("param", eventIdParamSchema),
    zValidator("json", routeApplicationSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const userId = requireSessionUserId(c);
      const application = await submitAnchorEventRouteApplication({
        anchorEventId: eventId,
        route: payload.route,
        submittedByUserId: userId,
      });
      return c.json(application, 201);
    },
  )
  // GET /api/events/:eventId - Get anchor event detail with time-window discovery
  .get("/:eventId", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventDetail(eventId);
    return c.json(detail);
  })
  .get("/:eventId/form-mode", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventFormModeData(eventId);
    return c.json(detail);
  })
  .get(
    "/:eventId/landing-assignment",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const assignment = await assignAnchorEventLandingMode(eventId);
      return c.json(assignment);
    },
  )
  .get(
    "/:eventId/demand-cards",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const cards = await getAnchorEventDemandCards(eventId);
      return c.json(cards);
    },
  )
  .post(
    "/:eventId/preference-tags/submissions",
    zValidator("param", eventIdParamSchema),
    zValidator("json", formModePreferenceSubmissionSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const { labels } = c.req.valid("json");
      const result = await submitAnchorEventFormModePreferenceTags(eventId, labels);
      return c.json(result);
    },
  )
  .post(
    "/:eventId/form-mode/recommendation",
    zValidator("param", eventIdParamSchema),
    zValidator("json", formModeRecommendationSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await recommendAnchorEventFormModePRs({
        eventId,
        place: resolveFormModeRecommendationPlace(payload),
        startAt: payload.startAt,
        preferences: payload.preferences,
      });
      return c.json(result);
    },
  );
