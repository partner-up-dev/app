import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { type AdminAuthEnv, adminAuthMiddleware } from "../auth/admin-middleware";
import {
  createAdminPR,
  createAdminPRMessage,
  deleteAdminPR,
  deleteAdminPRMessage,
  getAdminPRDetail,
  getAdminPRWorkspace,
  listAdminPRMessages,
  listAdminPRs,
  materializeAdminPRFeedbackQuestionnaireInstance,
  releaseAdminPRParticipant,
  updateAdminPRContent,
  updateAdminPRFeedbackQuestionnaireInstance,
  updateAdminPRMessage,
  updateAdminPRStatus,
  updateAdminPRVisibility,
} from "../domains/admin-pr-management";
import {
  createAdminFeedbackQuestionnaireTemplate,
  listAdminFeedbackQuestionnaireTemplates,
  updateAdminFeedbackQuestionnaireTemplate,
} from "../domains/feedback-questionnaire";
import { feedbackQuestionnaireDefinitionSchema } from "../entities/feedback-questionnaire";
import { prJoinGateConfigSchema } from "../entities/join-gate";
import { meetingPointConfigSchema } from "../entities/meeting-point";
import {
  prRouteSchema,
  prStatusManualSchema,
  visibilityStatusSchema,
} from "../entities/partner-request";

const app = new Hono<AdminAuthEnv>();
const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const messageParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  messageId: z.coerce.number().int().positive(),
});
const partnerParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  partnerId: z.coerce.number().int().positive(),
});
const feedbackQuestionnaireTemplateParamSchema = z.object({
  templateId: z.coerce.number().int().positive(),
});
const timeWindowSchema = z.tuple([z.string().nullable(), z.string().nullable()]);
const prInputSchema = z
  .object({
    timeWindow: timeWindowSchema,
    title: z.string().trim().max(200).nullable(),
    type: z.string().trim().min(1),
    location: z.string().trim().nullable(),
    route: prRouteSchema.nullable().default(null),
    minPartners: z.number().int().nonnegative().nullable(),
    maxPartners: z.number().int().nonnegative().nullable(),
    preferences: z.array(z.string().trim()),
    notes: z.string().trim().nullable(),
    meetingPoint: meetingPointConfigSchema.nullable().optional(),
    joinGateConfig: prJoinGateConfigSchema.optional(),
    confirmationEnabled: z.boolean().default(true),
    confirmationStartOffsetMinutes: z.number().int().nonnegative(),
    confirmationEndOffsetMinutes: z.number().int().nonnegative(),
    joinLockOffsetMinutes: z.number().int().nonnegative(),
  })
  .strict();
const prContentSchema = prInputSchema
  .omit({ timeWindow: true })
  .extend({ timeWindow: timeWindowSchema });
const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });
const statusSchema = z.object({ status: prStatusManualSchema });
const visibilitySchema = z.object({ visibilityStatus: visibilityStatusSchema });
const questionnaireInstanceSchema = z.object({
  feedbackQuestionnaireInstanceId: z.number().int().positive().nullable(),
});
const questionnaireTemplateSchema = z.object({
  feedbackQuestionnaireTemplateId: z.number().int().positive(),
});
const releaseSchema = z.object({ reason: z.string().trim().min(1) });
const feedbackQuestionnaireTemplateSchema = z
  .object({
    key: z.string().trim().min(1).max(120),
    version: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(200),
    definition: feedbackQuestionnaireDefinitionSchema,
  })
  .strict();

export const adminPRManagementRoute = app
  .use("*", adminAuthMiddleware)
  .get("/pr/workspace", async (c) => c.json(await getAdminPRWorkspace()))
  .get("/feedback-questionnaires/templates", async (c) =>
    c.json(await listAdminFeedbackQuestionnaireTemplates()),
  )
  .post(
    "/feedback-questionnaires/templates",
    zValidator("json", feedbackQuestionnaireTemplateSchema),
    async (c) => c.json(await createAdminFeedbackQuestionnaireTemplate(c.req.valid("json")), 201),
  )
  .patch(
    "/feedback-questionnaires/templates/:templateId",
    zValidator("param", feedbackQuestionnaireTemplateParamSchema),
    zValidator("json", feedbackQuestionnaireTemplateSchema),
    async (c) =>
      c.json(
        await updateAdminFeedbackQuestionnaireTemplate(
          c.req.valid("param").templateId,
          c.req.valid("json"),
        ),
      ),
  )
  .get("/prs", async (c) => c.json(await listAdminPRs()))
  .get("/prs/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await getAdminPRDetail(id));
  })
  .post("/prs", zValidator("json", prInputSchema), async (c) => {
    const payload = c.req.valid("json");
    const auth = c.get("auth");
    return c.json(await createAdminPR({ ...payload, actorUserId: auth.userId ?? null }), 201);
  })
  .delete("/prs/:id", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await deleteAdminPR({ prId: id, actorUserId: c.get("auth").userId ?? null }));
  })
  .patch(
    "/prs/:id/content",
    zValidator("param", idParamSchema),
    zValidator("json", prContentSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await updateAdminPRContent(id, c.req.valid("json")));
    },
  )
  .patch(
    "/prs/:id/status",
    zValidator("param", idParamSchema),
    zValidator("json", statusSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await updateAdminPRStatus(id, c.req.valid("json").status));
    },
  )
  .patch(
    "/prs/:id/visibility",
    zValidator("param", idParamSchema),
    zValidator("json", visibilitySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await updateAdminPRVisibility(id, c.req.valid("json").visibilityStatus));
    },
  )
  .get("/prs/:id/messages", zValidator("param", idParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await listAdminPRMessages(id));
  })
  .post(
    "/prs/:id/messages",
    zValidator("param", idParamSchema),
    zValidator("json", messageSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const userId = c.get("auth").userId;
      if (!userId) return c.json({ error: "Admin user id missing" }, 401);
      return c.json(
        await createAdminPRMessage({
          prId: id,
          body: c.req.valid("json").body,
          actorUserId: userId,
        }),
      );
    },
  )
  .patch(
    "/prs/:id/messages/:messageId",
    zValidator("param", messageParamSchema),
    zValidator("json", messageSchema),
    async (c) => {
      const { id, messageId } = c.req.valid("param");
      return c.json(
        await updateAdminPRMessage({
          prId: id,
          messageId,
          body: c.req.valid("json").body,
          actorUserId: c.get("auth").userId ?? null,
        }),
      );
    },
  )
  .delete("/prs/:id/messages/:messageId", zValidator("param", messageParamSchema), async (c) => {
    const { id, messageId } = c.req.valid("param");
    return c.json(
      await deleteAdminPRMessage({
        prId: id,
        messageId,
        actorUserId: c.get("auth").userId ?? null,
      }),
    );
  })
  .patch(
    "/prs/:id/feedback-questionnaire-instance",
    zValidator("param", idParamSchema),
    zValidator("json", questionnaireInstanceSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(
        await updateAdminPRFeedbackQuestionnaireInstance(
          id,
          c.req.valid("json").feedbackQuestionnaireInstanceId,
        ),
      );
    },
  )
  .post(
    "/prs/:id/feedback-questionnaire-instance/from-template",
    zValidator("param", idParamSchema),
    zValidator("json", questionnaireTemplateSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(
        await materializeAdminPRFeedbackQuestionnaireInstance({
          prId: id,
          feedbackQuestionnaireTemplateId: c.req.valid("json").feedbackQuestionnaireTemplateId,
        }),
      );
    },
  )
  .post(
    "/prs/:id/partners/:partnerId/release",
    zValidator("param", partnerParamSchema),
    zValidator("json", releaseSchema),
    async (c) => {
      const { id, partnerId } = c.req.valid("param");
      return c.json(
        await releaseAdminPRParticipant({
          prId: id,
          partnerId,
          reason: c.req.valid("json").reason,
          actorUserId: c.get("auth").userId ?? null,
        }),
      );
    },
  );

export type AdminPRManagementRoute = typeof adminPRManagementRoute;
