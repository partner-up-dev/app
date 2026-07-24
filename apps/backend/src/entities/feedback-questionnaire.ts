import {
  bigserial,
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  feedbackQuestionnaireAnswersSchema,
  feedbackQuestionnaireDefinitionSchema,
  type FeedbackQuestionnaireAnswers,
  type FeedbackQuestionnaireDefinition,
} from "../domains/feedback-questionnaire/contracts";
import { users, type UserId } from "./user";

export {
  feedbackQuestionnaireAnswersSchema,
  feedbackQuestionnaireDefinitionSchema,
} from "../domains/feedback-questionnaire/contracts";
export type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireDefinition,
} from "../domains/feedback-questionnaire/contracts";

export const feedbackQuestionnaireTemplates = pgTable(
  "feedback_questionnaire_templates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: text("key").notNull(),
    version: text("version").notNull(),
    title: text("title").notNull(),
    definition: jsonb("definition").$type<FeedbackQuestionnaireDefinition>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    keyVersionUnique: uniqueIndex("feedback_questionnaire_templates_key_version_uq").on(
      table.key,
      table.version,
    ),
  }),
);

export const feedbackQuestionnaireInstances = pgTable("feedback_questionnaire_instances", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  templateId: bigint("template_id", { mode: "number" }).references(
    () => feedbackQuestionnaireTemplates.id,
    { onDelete: "set null" },
  ),
  title: text("title").notNull(),
  definition: jsonb("definition").$type<FeedbackQuestionnaireDefinition>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const feedbackQuestionnaireResponses = pgTable(
  "feedback_questionnaire_responses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    instanceId: bigint("instance_id", { mode: "number" })
      .notNull()
      .references(() => feedbackQuestionnaireInstances.id, {
        onDelete: "cascade",
      }),
    respondentUserId: uuid("respondent_user_id")
      .$type<UserId>()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<FeedbackQuestionnaireAnswers>().notNull(),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    instanceRespondentUnique: uniqueIndex(
      "feedback_questionnaire_responses_instance_respondent_uq",
    ).on(table.instanceId, table.respondentUserId),
  }),
);

export const insertFeedbackQuestionnaireTemplateSchema = createInsertSchema(
  feedbackQuestionnaireTemplates,
  {
    definition: feedbackQuestionnaireDefinitionSchema,
  },
);
export const selectFeedbackQuestionnaireTemplateSchema = createSelectSchema(
  feedbackQuestionnaireTemplates,
  {
    definition: feedbackQuestionnaireDefinitionSchema,
  },
);
export const insertFeedbackQuestionnaireInstanceSchema = createInsertSchema(
  feedbackQuestionnaireInstances,
  {
    definition: feedbackQuestionnaireDefinitionSchema,
  },
);
export const selectFeedbackQuestionnaireInstanceSchema = createSelectSchema(
  feedbackQuestionnaireInstances,
  {
    definition: feedbackQuestionnaireDefinitionSchema,
  },
);
export const insertFeedbackQuestionnaireResponseSchema = createInsertSchema(
  feedbackQuestionnaireResponses,
  {
    answers: feedbackQuestionnaireAnswersSchema,
  },
);
export const selectFeedbackQuestionnaireResponseSchema = createSelectSchema(
  feedbackQuestionnaireResponses,
  {
    answers: feedbackQuestionnaireAnswersSchema,
  },
);

export type FeedbackQuestionnaireTemplate = typeof feedbackQuestionnaireTemplates.$inferSelect;
export type NewFeedbackQuestionnaireTemplate = typeof feedbackQuestionnaireTemplates.$inferInsert;
export type FeedbackQuestionnaireTemplateId = FeedbackQuestionnaireTemplate["id"];
export type FeedbackQuestionnaireInstance = typeof feedbackQuestionnaireInstances.$inferSelect;
export type NewFeedbackQuestionnaireInstance = typeof feedbackQuestionnaireInstances.$inferInsert;
export type FeedbackQuestionnaireInstanceId = FeedbackQuestionnaireInstance["id"];
export type FeedbackQuestionnaireResponse = typeof feedbackQuestionnaireResponses.$inferSelect;
export type NewFeedbackQuestionnaireResponse = typeof feedbackQuestionnaireResponses.$inferInsert;
