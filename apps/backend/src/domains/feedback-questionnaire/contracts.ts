import { z } from "zod";

const questionIdSchema = z.string().trim().min(1).max(80);
const questionLabelSchema = z.string().trim().min(1).max(200);
const optionValueSchema = z.string().trim().min(1).max(80);

export const feedbackQuestionnaireDefinitionSchema = z.object({
  key: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(200),
  questions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          id: questionIdSchema,
          type: z.literal("single_choice"),
          label: questionLabelSchema,
          required: z.boolean(),
          options: z
            .array(
              z.object({
                value: optionValueSchema,
                label: z.string().trim().min(1).max(120),
                requires: z
                  .array(
                    z.object({
                      questionId: questionIdSchema,
                    }),
                  )
                  .optional(),
              }),
            )
            .min(1),
        }),
        z.object({
          id: questionIdSchema,
          type: z.literal("textarea"),
          label: questionLabelSchema,
          required: z.boolean(),
          maxLength: z.number().int().positive().max(5000),
        }),
        z.object({
          id: questionIdSchema,
          type: z.literal("image_upload"),
          label: questionLabelSchema,
          required: z.boolean(),
          purpose: z.literal("feedback"),
        }),
      ]),
    )
    .min(1),
});

export type FeedbackQuestionnaireDefinition = z.infer<typeof feedbackQuestionnaireDefinitionSchema>;

export const feedbackQuestionnaireAnswersSchema = z.record(
  questionIdSchema,
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("single_choice"),
      value: optionValueSchema,
    }),
    z.object({
      type: z.literal("textarea"),
      value: z.string(),
    }),
    z.object({
      type: z.literal("image_upload"),
      imageUrl: z.string().trim().min(1).max(2048),
    }),
  ]),
);

export type FeedbackQuestionnaireAnswers = z.infer<typeof feedbackQuestionnaireAnswersSchema>;
