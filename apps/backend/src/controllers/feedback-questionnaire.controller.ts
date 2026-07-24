import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { feedbackQuestionnaireAnswersSchema } from "../domains/feedback-questionnaire/contracts";
import { submitFeedbackQuestionnaire } from "../domains/feedback-questionnaire";
import { requireAuthenticatedUserId } from "./pr-controller.shared";

const app = new Hono<AuthEnv>();

const feedbackInstanceParamSchema = z.object({
  instanceId: z.coerce.number().int().positive(),
});

const submitFeedbackSchema = z.object({
  answers: feedbackQuestionnaireAnswersSchema,
});

export const feedbackQuestionnaireRoute = app
  .use("*", authMiddleware)
  .post(
    "/:instanceId",
    zValidator("param", feedbackInstanceParamSchema),
    zValidator("json", submitFeedbackSchema),
    async (c) => {
      const { instanceId } = c.req.valid("param");
      const { answers } = c.req.valid("json");
      const respondentUserId = requireAuthenticatedUserId(c);

      const result = await submitFeedbackQuestionnaire({
        instanceId,
        respondentUserId,
        answers,
      });
      return c.json(result);
    },
  );
