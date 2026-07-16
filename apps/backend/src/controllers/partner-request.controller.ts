import { zValidator } from "@hono/zod-validator";
import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { type AuthEnv, authMiddleware } from "../auth/middleware";
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
  getMyCreatedPRs,
  getMyJoinedPRs,
  getPRDetail,
  getPRJoinGateProjection,
  getPRPartnerProfile,
  joinPRByIdentity,
  listPRMessages,
  publishPR,
  resolvePRJoinGate,
  resolvePRParticipantUser,
  updatePRStatus,
  updateUserPRContent,
  waitlistPRByIdentity,
} from "../domains/pr";
import type { OfferId } from "../entities/offer";
import { recordUserTelemetryEventForRequest } from "../infra/telemetry";
import { throwHttpProblem } from "../lib/problem-details";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";
import { TradeOrderRepository } from "../repositories/TradeOrderRepository";
import {
  createNaturalLanguagePRSchema,
  getSessionUserId,
  issueResponseAuth,
  partnerRequestFieldsSchema,
  prAllowEditAfterReadySchema,
  prIdParamSchema,
  prMessageCreateSchema,
  prMessageReadMarkerSchema,
  prPartnerProfileParamSchema,
  requireAuthenticatedCreatorIdentity,
  requireAuthenticatedOpenId,
  requireAuthenticatedUserId,
  requireSessionUserId,
  resolveAvatarUrl,
  tryReadAuthenticatedOpenId,
  updateContentSchema,
  updateStatusSchema,
} from "./pr-controller.shared";

const app = new Hono<AuthEnv>();
const prRepo = new PartnerRequestRepository();
const tradeOrderRepo = new TradeOrderRepository();
const PR_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const requireAuthenticatedPRMutation: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (PR_MUTATION_METHODS.has(c.req.method)) {
    requireAuthenticatedUserId(c);
  }

  await next();
};
const createStructuredPRCommandSchema = z.union([
  z.object({
    fields: partnerRequestFieldsSchema,
    createSource: z.literal("PR_DISCOVERY"),
    allowEditAfterReady: prAllowEditAfterReadySchema.nullable().optional(),
  }),
  z.object({
    fields: partnerRequestFieldsSchema,
    createSource: z.literal("STRUCTURED_FORM").optional(),
    allowEditAfterReady: prAllowEditAfterReadySchema.nullable().optional(),
  }),
]);
const nlWordCountCommandSchema = createNaturalLanguagePRSchema.refine(
  ({ rawText }) => rawText.trim().split(/\s+/).filter(Boolean).length <= 50,
  { message: "Natural language input must be 50 words or fewer" },
);
const emptyCommandSchema = z.object({}).default({});
const waitlistCommandSchema = z
  .object({
    alternativePrReminderOptIn: z.boolean().optional(),
  })
  .default({});
const slotCheckInSchema = z.object({
  didAttend: z.boolean().optional(),
});
const joinGateParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  gateKey: z.string().trim().min(1),
});
const prOrdersQuerySchema = z.object({
  offerId: z.coerce.number().int().positive(),
  statusIn: z.preprocess(
    (value) => (Array.isArray(value) ? value : value ? [value] : []),
    z.array(z.enum(["INITIATING", "OPEN", "CANCELLED", "FAILED", "EXPIRED", "COMPLETED"])).min(1),
  ),
});
const resolveJoinGateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("JOIN_NOTICE"),
    version: z.string().trim().min(1),
    accepted: z.literal(true),
  }),
]);

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
  .post("/new/form", zValidator("json", createStructuredPRCommandSchema), async (c) => {
    const command = c.req.valid("json");
    const { fields, createSource } = command;

    const creatorIdentity = await requireAuthenticatedCreatorIdentity(c);
    const result = await createPRFromStructured(fields, creatorIdentity, {
      createSource: createSource ?? "STRUCTURED_FORM",
      allowEditAfterReady: command.allowEditAfterReady ?? null,
    });

    await recordUserTelemetryEventForRequest(c, {
      eventName: "pr.created",
      payload: {
        pr_id: result.id,
        creation_path: createSource === "PR_DISCOVERY" ? "pr_discovery" : "structured_form",
        status: result.status,
      },
    });

    return c.json(result, 201);
  })
  .post("/new/nl", zValidator("json", nlWordCountCommandSchema), async (c) => {
    const { rawText, nowIso, nowWeekday } = c.req.valid("json");
    const creatorIdentity = await requireAuthenticatedCreatorIdentity(c);
    const result = await createPRFromNaturalLanguage(
      rawText,
      nowIso,
      nowWeekday ?? null,
      creatorIdentity,
    );

    await recordUserTelemetryEventForRequest(c, {
      eventName: "pr.created",
      payload: {
        pr_id: result.id,
        creation_path: "natural_language",
        status: result.status,
      },
    });

    return c.json(result, 201);
  })
  .post("/:id/publish", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const creatorIdentity = await requireAuthenticatedCreatorIdentity(c);
    const result = await publishPR(id, creatorIdentity);
    await issueResponseAuth(c, result.createdBy);

    return c.json({
      id: result.pr.id,
      pr: result.pr,
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
  .get(
    "/:id/orders",
    zValidator("param", prIdParamSchema),
    zValidator("query", prOrdersQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      const pr = await getPROr404(id);
      const orders = await tradeOrderRepo.listByIdsOfferAndStatuses({
        ids: pr.orders,
        offerId: query.offerId as OfferId,
        statuses: query.statusIn,
      });
      return c.json({
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          offerId: order.offerId,
        })),
      });
    },
  )
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
            avatarUrl: resolveAvatarUrl(c.req.url, result.message.author.avatarUrl),
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
      await issueResponseAuth(c, participant.user.id);
      return c.json(result);
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

      const creatorAuth = await authorizeCreatorMutation(id, auth, "status");

      if (creatorAuth.request.status === "DRAFT") {
        return throwHttpProblem({
          status: 400,
          detail: "Use publish endpoint to publish DRAFT partner request",
        });
      }

      const fromStatus = creatorAuth.request.status;
      const result = await updatePRStatus(id, status, creatorAuth.actorUserId);
      if (status === "CLOSED") {
        await recordUserTelemetryEventForRequest(c, {
          eventName: "pr.closed",
          payload: {
            pr_id: id,
            from_status: fromStatus,
            to_status: status,
          },
        });
      }
      return c.json(result);
    },
  )
  .patch(
    "/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", updateContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const payload = c.req.valid("json");
      const auth = c.get("auth");

      const creatorAuth = await authorizeCreatorMutation(id, auth, "content");

      const result = await updateUserPRContent(id, payload.fields, creatorAuth.actorUserId, {
        allowRelease: payload.allowRelease === true,
      });
      return c.json(result);
    },
  )
  .post(
    "/:id/join",
    zValidator("param", prIdParamSchema),
    zValidator("json", emptyCommandSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await getPROr404(id);
      const participantIdentity = await requireAuthenticatedCreatorIdentity(c);
      const result = await joinPRByIdentity(id, participantIdentity);
      await issueResponseAuth(c, result.userId);
      await recordUserTelemetryEventForRequest(c, {
        eventName: "pr.joined",
        payload: {
          pr_id: id,
          result_status: "success",
        },
      });
      return c.json(result.pr);
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
      await issueResponseAuth(c, result.userId);
      await recordUserTelemetryEventForRequest(c, {
        eventName: "pr.waitlisted",
        payload: {
          pr_id: id,
          result_status: "success",
          alternative_pr_reminder_opt_in: payload.alternativePrReminderOptIn === true,
        },
      });
      return c.json(result.pr);
    },
  )
  .post("/:id/waitlist/cancel", zValidator("param", prIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await getPROr404(id);
    const userId = requireAuthenticatedUserId(c);
    const result = await cancelWaitlistPRByUserId(id, userId);
    return c.json(result);
  })
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
    const openId = await requireAuthenticatedOpenId(c);
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
      const openId = await requireAuthenticatedOpenId(c);
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
