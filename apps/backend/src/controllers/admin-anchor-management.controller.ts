import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  anchorEventStatusSchema,
  anchorEventFullPrExpansionPolicySchema,
  anchorEventParticipationFrequencyLimitSchema,
  anchorEventPrCreationPolicySchema,
  anchorEventRoutePoolSchema,
  anchorEventTimePoolConfigSchema,
  meetingPointConfigMapSchema,
  meetingPointConfigSchema,
  normalizeAnchorEventRoutePool,
  normalizeLocationPool,
  prJoinGateConfigSchema,
  prRouteSchema,
  prStatusManualSchema,
  visibilityStatusSchema,
} from "../entities";
import { feedbackQuestionnaireDefinitionSchema } from "../entities/feedback-questionnaire";
import {
  adminAuthMiddleware,
  type AdminAuthEnv,
} from "../auth/admin-middleware";
import {
  createAdminAnchorEvent,
  createAdminPR,
  createAdminPRMessage,
  deleteAdminPR,
  deleteAdminPRMessage,
  getAdminAnchorLandingConfig,
  getAdminAnchorEventPreferenceTags,
  getAdminAnchorEventWorkspace,
  listAdminPRMessages,
  materializeAdminPRFeedbackQuestionnaireInstance,
  publishAdminAnchorEventPreferenceTag,
  getAdminPRWorkspace,
  rejectAdminAnchorEventPreferenceTag,
  releaseAdminPRPartner,
  replaceAdminAnchorEventPreferenceTags,
  updateAdminAnchorLandingConfig,
  updateAdminPRMessage,
  updateAdminAnchorEvent,
  updateAdminPRContent,
  updateAdminPRFeedbackQuestionnaireInstance,
  updateAdminPRStatus,
  updateAdminPRVisibility,
} from "../domains/admin-anchor-management";
import {
  createAdminFeedbackQuestionnaireTemplate,
  listAdminFeedbackQuestionnaireTemplates,
  updateAdminFeedbackQuestionnaireTemplate,
} from "../domains/feedback-questionnaire";
import {
  acceptAdminAnchorEventRouteApplication,
  rejectAdminAnchorEventRouteApplication,
} from "../domains/anchor-event-route-application";
import { prMessageCreateSchema } from "./pr-controller.shared";
import { anchorEventLandingConfigSchema } from "../domains/anchor-event/landing-config";

const app = new Hono<AdminAuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const prIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
const feedbackQuestionnaireTemplateIdParamSchema = z.object({
  templateId: z.coerce.number().int().positive(),
});
const prMessageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  messageId: z.coerce.number().int().positive(),
});
const preferenceTagIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  tagId: z.coerce.number().int().positive(),
});
const routeApplicationIdParamSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
});
const partnerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});

const timeWindowSchema = z.tuple([
  z.string().nullable(),
  z.string().nullable(),
]);

const adminAnchorEventInputSchema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1),
  description: z.string().trim().nullable(),
  locationPool: z.array(z.string().trim().min(1)),
  routePool: anchorEventRoutePoolSchema.default([]),
  timePoolConfig: anchorEventTimePoolConfigSchema,
  defaultMinPartners: z.number().int().nonnegative().nullable(),
  defaultMaxPartners: z.number().int().nonnegative().nullable(),
  defaultPrNotes: z.string().trim().nullable().optional(),
  defaultConfirmationEnabled: z.boolean().optional().default(true),
  defaultConfirmationStartOffsetMinutes: z.number().int().nonnegative(),
  defaultConfirmationEndOffsetMinutes: z.number().int().nonnegative(),
  defaultJoinLockOffsetMinutes: z.number().int().nonnegative(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
  joinGateConfig: prJoinGateConfigSchema.optional(),
  participationFrequencyLimit:
    anchorEventParticipationFrequencyLimitSchema.optional(),
  feedbackQuestionnaireTemplateId: z.number().int().positive().nullable().optional(),
  locationMeetingPoints: meetingPointConfigMapSchema.optional(),
  coverImage: z.string().trim().nullable(),
  betaGroupQrCode: z.string().trim().nullable(),
  prCreationPolicy: anchorEventPrCreationPolicySchema,
  fullPrExpansionPolicy: anchorEventFullPrExpansionPolicySchema,
  status: anchorEventStatusSchema,
});

const adminCreatePRInputSchema = z.object({
  timeWindow: timeWindowSchema,
  title: z.string().trim().nullable(),
  type: z.string().trim().min(1),
  location: z.string().trim().nullable(),
  route: prRouteSchema.nullable().default(null),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  preferences: z.array(z.string().trim()),
  notes: z.string().trim().nullable(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
  joinGateConfig: prJoinGateConfigSchema.optional(),
  confirmationEnabled: z.boolean().optional().default(true),
  confirmationStartOffsetMinutes: z.number().int().nonnegative(),
  confirmationEndOffsetMinutes: z.number().int().nonnegative(),
  joinLockOffsetMinutes: z.number().int().nonnegative(),
});

const adminUpdatePRContentSchema = z.object({
  title: z.string().trim().nullable(),
  type: z.string().trim().min(1),
  timeWindow: timeWindowSchema,
  location: z.string().trim().nullable(),
  route: prRouteSchema.nullable().default(null),
  minPartners: z.number().int().nonnegative().nullable(),
  maxPartners: z.number().int().nonnegative().nullable(),
  preferences: z.array(z.string().trim()),
  notes: z.string().trim().nullable(),
  meetingPoint: meetingPointConfigSchema.nullable().optional(),
  joinGateConfig: prJoinGateConfigSchema.optional(),
  confirmationEnabled: z.boolean().optional().default(true),
  confirmationStartOffsetMinutes: z.number().int().nonnegative(),
  confirmationEndOffsetMinutes: z.number().int().nonnegative(),
  joinLockOffsetMinutes: z.number().int().nonnegative(),
});

const adminUpdatePRStatusSchema = z.object({
  status: prStatusManualSchema,
});

const adminUpdatePRVisibilitySchema = z.object({
  visibilityStatus: visibilityStatusSchema,
});
const adminUpdatePRFeedbackQuestionnaireInstanceSchema = z.object({
  feedbackQuestionnaireInstanceId: z.number().int().positive().nullable(),
});
const adminMaterializePRFeedbackQuestionnaireInstanceSchema = z.object({
  feedbackQuestionnaireTemplateId: z.number().int().positive(),
});
const adminFeedbackQuestionnaireTemplateInputSchema = z.object({
  key: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(200),
  definition: feedbackQuestionnaireDefinitionSchema,
});
const adminPreferenceTagsReplaceSchema = z.object({
  tags: z.array(
    z.object({
      label: z.string().trim().min(1).max(80),
      description: z.string().trim().max(280).nullable(),
    }),
  ),
});
const adminManualReleaseSchema = z.object({
  reason: z.string().trim().min(1),
});
const adminRouteApplicationRejectSchema = z.object({
  rejectReason: z.string().trim().nullable().optional(),
});

export const adminAnchorManagementRoute = app
  .use("*", adminAuthMiddleware)
  .get("/anchor-events/workspace", async (c) => {
    const result = await getAdminAnchorEventWorkspace();
    return c.json(result);
  })
  .post(
    "/route-applications/:applicationId/accept",
    zValidator("param", routeApplicationIdParamSchema),
    async (c) => {
      const { applicationId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await acceptAdminAnchorEventRouteApplication({
        applicationId,
        reviewedByUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  )
  .post(
    "/route-applications/:applicationId/reject",
    zValidator("param", routeApplicationIdParamSchema),
    zValidator("json", adminRouteApplicationRejectSchema),
    async (c) => {
      const { applicationId } = c.req.valid("param");
      const { rejectReason } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await rejectAdminAnchorEventRouteApplication({
        applicationId,
        reviewedByUserId: auth.userId ?? null,
        rejectReason: rejectReason ?? null,
      });
      return c.json(result);
    },
  )
  .get(
    "/events/:eventId/landing-config",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const result = await getAdminAnchorLandingConfig(eventId);
      return c.json(result);
    },
  )
  .get(
    "/events/:eventId/preference-tags",
    zValidator("param", eventIdParamSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const result = await getAdminAnchorEventPreferenceTags(eventId);
      return c.json(result);
    },
  )
  .get("/pr/workspace", async (c) => {
    const result = await getAdminPRWorkspace();
    return c.json(result);
  })
  .get("/feedback-questionnaires/templates", async (c) => {
    const result = await listAdminFeedbackQuestionnaireTemplates();
    return c.json(result);
  })
  .post(
    "/feedback-questionnaires/templates",
    zValidator("json", adminFeedbackQuestionnaireTemplateInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminFeedbackQuestionnaireTemplate(payload);
      return c.json(result);
    },
  )
  .patch(
    "/feedback-questionnaires/templates/:templateId",
    zValidator("param", feedbackQuestionnaireTemplateIdParamSchema),
    zValidator("json", adminFeedbackQuestionnaireTemplateInputSchema),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminFeedbackQuestionnaireTemplate(
        templateId,
        payload,
      );
      return c.json(result);
    },
  )
  .put(
    "/events/:eventId/landing-config",
    zValidator("param", eventIdParamSchema),
    zValidator("json", anchorEventLandingConfigSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminAnchorLandingConfig(eventId, payload);
      return c.json(result);
    },
  )
  .put(
    "/events/:eventId/preference-tags/published",
    zValidator("param", eventIdParamSchema),
    zValidator("json", adminPreferenceTagsReplaceSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const { tags } = c.req.valid("json");
      const result = await replaceAdminAnchorEventPreferenceTags(eventId, tags);
      return c.json(result);
    },
  )
  .post(
    "/events/:eventId/preference-tags/:tagId/publish",
    zValidator("param", preferenceTagIdParamSchema),
    async (c) => {
      const { eventId, tagId } = c.req.valid("param");
      const result = await publishAdminAnchorEventPreferenceTag({
        eventId,
        tagId,
      });
      return c.json(result);
    },
  )
  .post(
    "/events/:eventId/preference-tags/:tagId/reject",
    zValidator("param", preferenceTagIdParamSchema),
    async (c) => {
      const { eventId, tagId } = c.req.valid("param");
      const result = await rejectAdminAnchorEventPreferenceTag({
        eventId,
        tagId,
      });
      return c.json(result);
    },
  )
  .post(
    "/anchor-events",
    zValidator("json", adminAnchorEventInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminAnchorEvent({
        ...payload,
        description: payload.description || null,
        locationPool: normalizeLocationPool(payload.locationPool),
        routePool: normalizeAnchorEventRoutePool(payload.routePool),
        defaultPrNotes: payload.defaultPrNotes || null,
        coverImage: payload.coverImage || null,
        betaGroupQrCode: payload.betaGroupQrCode || null,
      });
      return c.json(result);
    },
  )
  .patch(
    "/anchor-events/:eventId",
    zValidator("param", eventIdParamSchema),
    zValidator("json", adminAnchorEventInputSchema),
    async (c) => {
      const { eventId } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminAnchorEvent(eventId, {
        ...payload,
        description: payload.description || null,
        locationPool: normalizeLocationPool(payload.locationPool),
        routePool: normalizeAnchorEventRoutePool(payload.routePool),
        defaultPrNotes: payload.defaultPrNotes || null,
        coverImage: payload.coverImage || null,
        betaGroupQrCode: payload.betaGroupQrCode || null,
      });
      return c.json(result);
    },
  )
  .post(
    "/prs",
    zValidator("json", adminCreatePRInputSchema),
    async (c) => {
      const payload = c.req.valid("json");
      const result = await createAdminPR(payload.timeWindow, {
        ...payload,
        title: payload.title || null,
        location: payload.location || null,
        notes: payload.notes || null,
      });
      return c.json(result);
    },
  )
  .delete(
    "/prs/:id",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await deleteAdminPR({
        prId: id,
        actorUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  )
  .get(
    "/prs/:id/messages",
    zValidator("param", prIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await listAdminPRMessages(id);
      return c.json(result);
    },
  )
  .post(
    "/prs/:id/messages",
    zValidator("param", prIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { body } = c.req.valid("json");
      const auth = c.get("auth");
      if (!auth.userId) {
        throw new Error("Admin user id missing after admin auth");
      }
      const result = await createAdminPRMessage({
        prId: id,
        body,
        actorUserId: auth.userId,
      });
      return c.json(result);
    },
  )
  .patch(
    "/prs/:id/messages/:messageId",
    zValidator("param", prMessageIdParamSchema),
    zValidator("json", prMessageCreateSchema),
    async (c) => {
      const { id, messageId } = c.req.valid("param");
      const { body } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await updateAdminPRMessage({
        prId: id,
        messageId,
        body,
        actorUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  )
  .delete(
    "/prs/:id/messages/:messageId",
    zValidator("param", prMessageIdParamSchema),
    async (c) => {
      const { id, messageId } = c.req.valid("param");
      const auth = c.get("auth");
      const result = await deleteAdminPRMessage({
        prId: id,
        messageId,
        actorUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  )
  .patch(
    "/prs/:id/content",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdatePRContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");
      const result = await updateAdminPRContent(id, {
        ...payload,
        title: payload.title || null,
        location: payload.location || null,
        notes: payload.notes || null,
      });
      return c.json(result);
    },
  )
  .patch(
    "/prs/:id/status",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdatePRStatusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");
      const result = await updateAdminPRStatus(id, status);
      return c.json(result);
    },
  )
  .patch(
    "/prs/:id/visibility",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdatePRVisibilitySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { visibilityStatus } = c.req.valid("json");
      await updateAdminPRVisibility(id, visibilityStatus);
      return c.json({ ok: true });
    },
  )
  .patch(
    "/prs/:id/feedback-questionnaire-instance",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminUpdatePRFeedbackQuestionnaireInstanceSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { feedbackQuestionnaireInstanceId } = c.req.valid("json");
      const result = await updateAdminPRFeedbackQuestionnaireInstance(
        id,
        feedbackQuestionnaireInstanceId,
      );
      return c.json(result);
    },
  )
  .post(
    "/prs/:id/feedback-questionnaire-instance/from-template",
    zValidator("param", prIdParamSchema),
    zValidator("json", adminMaterializePRFeedbackQuestionnaireInstanceSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { feedbackQuestionnaireTemplateId } = c.req.valid("json");
      const result = await materializeAdminPRFeedbackQuestionnaireInstance({
        prId: id,
        feedbackQuestionnaireTemplateId,
      });
      return c.json(result);
    },
  )
  .post(
    "/prs/:id/partners/:partnerId/release",
    zValidator("param", partnerIdParamSchema),
    zValidator("json", adminManualReleaseSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      const { reason } = c.req.valid("json");
      const auth = c.get("auth");
      const result = await releaseAdminPRPartner({
        prId: id,
        partnerId,
        reason,
        actorUserId: auth.userId ?? null,
      });
      return c.json(result);
    },
  );
