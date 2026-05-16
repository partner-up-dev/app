import { throwHttpProblem } from "../lib/problem-details";
import { Hono, type MiddlewareHandler } from "hono";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import {
  advancePRMessageReadMarker,
  authorizeCreatorMutation,
  cancelWaitlistPRByUserId,
  checkIn,
  confirmSlot,
  createPRFromNaturalLanguage,
  createPRFromStructured,
  createPRMessage,
  exitPRByUserId,
  getPRDetail,
  getPRBookingSupport,
  getPRPartnerProfile,
  getReimbursementStatus,
  getMyCreatedPRs,
  getMyJoinedPRs,
  getPRJoinGateProjection,
  joinPRByIdentity,
  listPRMessages,
  publishPR,
  resolvePRJoinGate,
  resolvePRParticipantUser,
  searchPRs,
  updateUserPRContent,
  updatePRStatus,
  waitlistPRByIdentity,
} from "../domains/pr";
import { createEventAssistedPR } from "../domains/anchor-event";
import { updatePRBookingContactPhone } from "../domains/pr-booking-support";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import {
  anchorUpdateContentSchema,
  createNaturalLanguagePRSchema,
  getSessionUserId,
  issueAuthPayload,
  prMessageCreateSchema,
  prMessageReadMarkerSchema,
  prIdParamSchema,
  prPartnerProfileParamSchema,
  requireAuthenticatedCreatorIdentity,
  requireAnchorAuthenticatedIdentity,
  requireAuthenticatedUserId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAuthenticatedOpenId,
  partnerRequestFieldsSchema,
  updateContentSchema,
  updateStatusSchema,
} from "./pr-controller.shared";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
const PR_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const requireAuthenticatedPRMutation: MiddlewareHandler<AuthEnv> = async (
  c,
  next,
) => {
  if (PR_MUTATION_METHODS.has(c.req.method)) {
    requireAuthenticatedUserId(c);
  }

  await next();
};
const isoDateSearchParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const correlationIdSchema = z.string().trim().min(1).max(128).optional();
const eventPRSearchQuerySchema = z.object({
  eventId: z.coerce.number().int().positive(),
  date: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      return [value];
    }
    return [];
  }, z.array(isoDateSearchParamSchema).min(1).max(28)),
});
const createStructuredPRCommandSchema = z.union([
  z.object({
    fields: partnerRequestFieldsSchema,
    createSource: z.literal("EVENT_ASSISTED"),
    anchorEventId: z.coerce.number().int().positive(),
    routePoolEntryId: z.string().trim().min(1).max(120).optional(),
    correlationId: correlationIdSchema,
  }),
  z.object({
    fields: partnerRequestFieldsSchema,
    createSource: z.literal("FORM").optional(),
    correlationId: correlationIdSchema,
  }),
]);
const nlWordCountCommandSchema = createNaturalLanguagePRSchema
  .extend({
    correlationId: correlationIdSchema,
  })
  .refine(
    ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
    { message: "Natural language input must be 50 words or fewer" },
  );
const canonicalUpdateContentSchema = z.union([
  updateContentSchema,
  anchorUpdateContentSchema,
]);
const anchorJoinSchema = z
  .object({
    bookingContactPhone: z.string().trim().min(1).optional(),
    correlationId: correlationIdSchema,
  })
  .default({});
const waitlistCommandSchema = z
  .object({
    alternativePrReminderOptIn: z.boolean().optional(),
    correlationId: correlationIdSchema,
  })
  .default({});
const slotCheckInSchema = z.object({
  didAttend: z.boolean().optional(),
});
const joinGateParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  gateKey: z.string().trim().min(1),
});
const resolveJoinGateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("JOIN_NOTICE"),
    version: z.string().trim().min(1),
    accepted: z.literal(true),
  }),
  z.object({
    kind: z.literal("BOOKING_CONTACT"),
    version: z.string().trim().min(1),
    phone: z.string().trim().min(1).optional(),
  }),
]);
const updateBookingContactPhoneSchema = z.object({
  phone: z.string().trim().min(1),
});

const getPROr404 = async (id: number) => {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  return request;
};

export const partnerRequestRoute = app
  .use("*", authMiddleware)
  .use("*", requireAuthenticatedPRMutation)
  .get("/search", zValidator("query", eventPRSearchQuerySchema), async (c) => {
    const { eventId, date } = c.req.valid("query");
    const result = await searchPRs({
      eventId,
      dates: date,
    });
    return c.json(result);
  })
  .post(
    "/new/form",
    zValidator("json", createStructuredPRCommandSchema),
    async (c) => {
      const command = c.req.valid("json");
      const { fields, createSource } = command;

      const creatorIdentity =
        createSource === "EVENT_ASSISTED"
          ? await (async () => {
              const identity = await requireAnchorAuthenticatedIdentity(c);
              return {
                authenticatedUserId: identity.userId,
                anonymousUserId: null,
                oauthOpenId: identity.openId,
              };
            })()
          : await requireAuthenticatedCreatorIdentity(c);

      const result =
        createSource === "EVENT_ASSISTED"
          ? await createEventAssistedPR({
              anchorEventId: command.anchorEventId,
              fields,
              creatorIdentity,
              routePoolEntryId: command.routePoolEntryId ?? null,
            })
          : await createPRFromStructured(fields, creatorIdentity, {
              createSource,
            });

      return c.json(result, 201);
    },
  )
  .post("/new/nl", zValidator("json", nlWordCountCommandSchema), async (c) => {
    const { rawText, nowIso, nowWeekday } = c.req.valid("json");
    const creatorIdentity = await requireAuthenticatedCreatorIdentity(c);
    const result = await createPRFromNaturalLanguage(
      rawText,
      nowIso,
      nowWeekday ?? null,
      creatorIdentity,
    );

    return c.json(result, 201);
  })
  .post("/:id/publish", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const creatorIdentity = await requireAuthenticatedCreatorIdentity(c);
    const result = await publishPR(id, creatorIdentity);
    const auth = await issueAuthPayload(c, result.createdBy);

    return c.json({
      id: result.pr.id,
      pr: result.pr,
      auth,
    });
  })
  .get("/mine/created", async (c) => {
    const userId = requireSessionUserId(c);
    const items = await getMyCreatedPRs(userId);
    return c.json(items);
  })
  .get("/mine/joined", async (c) => {
    const userId = requireSessionUserId(c);
    const items = await getMyJoinedPRs(userId);
    return c.json(items);
  })
  .get("/:id/messages", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireSessionUserId(c);
    const result = await listPRMessages(id, userId);

    return c.json({
      ...result,
      items: result.items.map((item) => ({
        ...item,
        author: {
          ...item.author,
          avatarUrl: resolveAvatarUrl(c.req.url, item.author.avatarUrl),
        },
      })),
    });
  })
  .post(
    "/:id/messages",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { body } = c.req.valid("json");
      await getPROr404(id);
      const userId = requireAuthenticatedUserId(c);
      const result = await createPRMessage({
        prId: id,
        authorUserId: userId,
        body,
      });

      return c.json({
        ...result,
        message: {
          ...result.message,
          author: {
            ...result.message.author,
            avatarUrl: resolveAvatarUrl(
              c.req.url,
              result.message.author.avatarUrl,
            ),
          },
        },
      });
    },
  )
  .post(
    "/:id/messages/read-marker",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageReadMarkerSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { lastReadMessageId } = c.req.valid("json");
      await getPROr404(id);
      const userId = requireAuthenticatedUserId(c);
      const result = await advancePRMessageReadMarker({
        prId: id,
        userId,
        lastReadMessageId,
      });
      return c.json(result);
    },
  )
  .get(
    "/:id/booking-support",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const result = await getPRBookingSupport(id, getSessionUserId(c));
      return c.json(result);
    },
  )
  .put(
    "/:id/booking-contact/phone",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateBookingContactPhoneSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { phone } = c.req.valid("json");
      await getPROr404(id);
      const userId = requireAuthenticatedUserId(c);
      const result = await updatePRBookingContactPhone({
        prId: id,
        userId,
        phone,
      });
      return c.json(result);
    },
  )
  .get(
    "/:id/reimbursement/status",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const userId = requireSessionUserId(c);
      const result = await getReimbursementStatus(id, userId);
      return c.json(result);
    },
  )
  .get("/:id/join-gates", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = getSessionUserId(c);
    const result = await getPRJoinGateProjection({
      prId: id,
      viewerUserId: userId,
    });
    return c.json(result);
  })
  .post(
    "/:id/join-gates/:gateKey/resolve",
    zValidator("param", joinGateParamSchema),
    zValidator("json", resolveJoinGateSchema),
    async (c) => {
      const { id, gateKey } = c.req.valid("param");
      await getPROr404(id);
      const payload = c.req.valid("json");
      const identity = await requireAuthenticatedCreatorIdentity(c);
      const participant = await resolvePRParticipantUser(identity);
      const result = await resolvePRJoinGate({
        prId: id,
        gateKey,
        viewerUserId: participant.user.id,
        payload,
      });
      const auth = await issueAuthPayload(c, participant.user.id);
      return c.json({
        ...result,
        auth,
      });
    },
  )
  .patch(
    "/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const { status } = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(
        id,
        auth,
        "status",
      );

      if (creatorAuth.request.status === "DRAFT") {
        return throwHttpProblem({ status: 400, detail: "Use publish endpoint to publish DRAFT partner request" });
      }

      const result = await updatePRStatus(id, status, creatorAuth.actorUserId);
      return c.json({
        ...result,
        auth: null,
      });
    },
  )
  .patch(
    "/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", canonicalUpdateContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const payload = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(
        id,
        auth,
        "content",
      );

      const fields =
        "time" in payload.fields
          ? payload.fields
          : {
              ...payload.fields,
              time: creatorAuth.request.time,
              budget: creatorAuth.request.budget,
            };

      const result = await updateUserPRContent(
        id,
        fields,
        creatorAuth.actorUserId,
      );
      return c.json({
        ...result,
        auth: null,
      });
    },
  )
  .post(
    "/:id/join",
    zValidator("param", prIdParamSchema),
    zValidator("json", anchorJoinSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const { bookingContactPhone } = c.req.valid("json");
      const participantIdentity = await requireAuthenticatedCreatorIdentity(c);
      const result = await joinPRByIdentity(id, participantIdentity, {
        bookingContactPhone: bookingContactPhone ?? null,
      });
      const auth = await issueAuthPayload(c, result.userId);
      return c.json({
        ...result.pr,
        auth,
      });
    },
  )
  .post(
    "/:id/waitlist",
    zValidator("param", prIdParamSchema),
    zValidator("json", waitlistCommandSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const payload = c.req.valid("json");
      const participantIdentity = await requireAuthenticatedCreatorIdentity(c);
      const result = await waitlistPRByIdentity(id, participantIdentity, {
        alternativePrReminderOptIn: payload.alternativePrReminderOptIn === true,
      });
      const auth = await issueAuthPayload(c, result.userId);
      return c.json({
        ...result.pr,
        auth,
      });
    },
  )
  .post(
    "/:id/waitlist/cancel",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const userId = requireAuthenticatedUserId(c);
      const result = await cancelWaitlistPRByUserId(id, userId);
      return c.json(result);
    },
  )
  .post("/:id/exit", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireAuthenticatedUserId(c);
    const result = await exitPRByUserId(id, userId);
    return c.json(result);
  })
  .post("/:id/confirm", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const { openId } = await requireAnchorAuthenticatedIdentity(c);
    const result = await confirmSlot(id, openId);
    return c.json(result);
  })
  .post(
    "/:id/check-in",
    zValidator("param", prIdParamSchema),
    zValidator("json", slotCheckInSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const { openId } = await requireAnchorAuthenticatedIdentity(c);
      const { didAttend } = c.req.valid("json");
      if (didAttend === false) {
        return throwHttpProblem({ status: 400, detail: "didAttend=false is no longer supported" });
      }
      const result = await checkIn(id, openId);
      return c.json(result);
    },
  )
  .get(
    "/:id/partners/:partnerId/profile",
    zValidator("param", prPartnerProfileParamSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      const viewerUserId = getSessionUserId(c);
      const profile = await getPRPartnerProfile({
        prId: id,
        partnerId,
        viewerUserId,
      });

      return c.json({
        ...profile,
        avatarUrl: resolveAvatarUrl(c.req.url, profile.avatarUrl),
      });
    },
  )
  .get("/:id", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const openId = await tryReadAuthenticatedOpenId(c);
    const userId = getSessionUserId(c);
    const result = await getPRDetail(id, { userId, openId });
    return c.json(result);
  });
