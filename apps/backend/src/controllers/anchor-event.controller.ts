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
  createAnchorEventFormModeAutoPR,
  materializeAnchorEventDummyPR,
  type AnchorEventFormModeRecommendationPlaceSelection,
} from "../domains/anchor-event";
import {
  listMyAnchorEventRouteApplications,
  submitAnchorEventRouteApplication,
} from "../domains/anchor-event-route-application";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { prAllowEditAfterReadySchema, prRouteSchema } from "../entities/partner-request";
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
    route: prRouteSchema,
  }),
]);

const formModeRecommendationBaseSchema = z.object({
  preferences: z.array(z.string().trim().min(1).max(80)).max(16),
});

const instantDateTimeSchema = z.string().datetime({ offset: true });

const formModeRecommendationTimeWindowSchema = z
  .object({
    startAt: instantDateTimeSchema,
    endAt: instantDateTimeSchema,
  })
  .superRefine((timeWindow, ctx) => {
    if (new Date(timeWindow.startAt).getTime() > new Date(timeWindow.endAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeWindows endAt must be greater than or equal to startAt",
        path: ["endAt"],
      });
    }
  });

const dummyPRMaterializationTimeWindowSchema = z
  .tuple([instantDateTimeSchema, instantDateTimeSchema])
  .superRefine((timeWindow, ctx) => {
    if (new Date(timeWindow[0]).getTime() > new Date(timeWindow[1]).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "timeWindow endAt must be greater than or equal to startAt",
        path: [1],
      });
    }
  });

const dummyPRMaterializationPlaceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("location"),
    locationId: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("route"),
    route: prRouteSchema,
  }),
]);

const dummyPRMaterializationSchema = z.object({
  timeWindow: dummyPRMaterializationTimeWindowSchema,
  place: dummyPRMaterializationPlaceSchema,
  preferences: z.array(z.string().trim().min(1).max(80)).max(1).default([]),
});

const formModeAutoCreateSchema = z.object({
  timeWindow: dummyPRMaterializationTimeWindowSchema,
  place: formModeRecommendationPlaceSchema,
  preferences: z.array(z.string().trim().min(1).max(80)).max(16).default([]),
  allowEditAfterReady: prAllowEditAfterReadySchema.nullable().optional(),
});

const formModeRecommendationSchema = z.union([
  formModeRecommendationBaseSchema.extend({
    place: formModeRecommendationPlaceSchema,
    timeWindows: z.array(formModeRecommendationTimeWindowSchema).min(1).max(14),
  }),
  formModeRecommendationBaseSchema.extend({
    locationId: z.string().trim().min(1),
    startAt: instantDateTimeSchema,
  }),
]);

type FormModeRecommendationPayload = z.infer<typeof formModeRecommendationSchema>;

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

const readSessionUserId = (c: Context<AuthEnv>): UserId | null => {
  const auth = c.get("auth");
  return auth.userId ? (auth.userId as UserId) : null;
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
  .get("/:eventId/landing-assignment", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const assignment = await assignAnchorEventLandingMode(eventId);
    return c.json(assignment);
  })
  .get("/:eventId/demand-cards", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const cards = await getAnchorEventDemandCards(eventId, readSessionUserId(c));
    return c.json(cards);
  })
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
    "/:eventId/form-mode/auto-create",
    zValidator("param", eventIdParamSchema),
    zValidator("json", formModeAutoCreateSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await createAnchorEventFormModeAutoPR({
        eventId,
        timeWindow: payload.timeWindow,
        place: payload.place,
        preferences: payload.preferences,
        allowEditAfterReady: payload.allowEditAfterReady ?? null,
      });
      return c.json(result, 201);
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
        viewerUserId: readSessionUserId(c),
        place: resolveFormModeRecommendationPlace(payload),
        timeWindows:
          "timeWindows" in payload
            ? payload.timeWindows
            : [{ startAt: payload.startAt, endAt: payload.startAt }],
        preferences: payload.preferences,
      });
      return c.json(result);
    },
  )
  .post(
    "/:eventId/dummy-prs/materialize",
    zValidator("param", eventIdParamSchema),
    zValidator("json", dummyPRMaterializationSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await materializeAnchorEventDummyPR({
        eventId,
        timeWindow: payload.timeWindow,
        place: payload.place,
        preferences: payload.preferences,
      });
      return c.json(result);
    },
  );
