import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  feedbackQuestionnaireInstances,
  feedbackQuestionnaireResponses,
  feedbackQuestionnaireTemplates,
  type FeedbackQuestionnaireAnswers,
  type FeedbackQuestionnaireDefinition,
  type FeedbackQuestionnaireInstance,
  type FeedbackQuestionnaireInstanceId,
  type FeedbackQuestionnaireTemplateId,
  type NewFeedbackQuestionnaireInstance,
  type NewFeedbackQuestionnaireTemplate,
} from "../entities/feedback-questionnaire";
import type { UserId } from "../entities/user";

export class FeedbackQuestionnaireRepository {
  async createTemplate(data: NewFeedbackQuestionnaireTemplate) {
    const result = await db.insert(feedbackQuestionnaireTemplates).values(data).returning();
    return result[0];
  }

  async listTemplates() {
    return await db.select().from(feedbackQuestionnaireTemplates);
  }

  async findTemplateById(id: FeedbackQuestionnaireTemplateId) {
    const result = await db
      .select()
      .from(feedbackQuestionnaireTemplates)
      .where(eq(feedbackQuestionnaireTemplates.id, id));
    return result[0] ?? null;
  }

  async findTemplateByKeyVersion(input: { key: string; version: string }) {
    const result = await db
      .select()
      .from(feedbackQuestionnaireTemplates)
      .where(
        and(
          eq(feedbackQuestionnaireTemplates.key, input.key),
          eq(feedbackQuestionnaireTemplates.version, input.version),
        ),
      );
    return result[0] ?? null;
  }

  async updateTemplate(
    id: FeedbackQuestionnaireTemplateId,
    data: {
      key: string;
      version: string;
      title: string;
      definition: FeedbackQuestionnaireDefinition;
    },
  ) {
    const result = await db
      .update(feedbackQuestionnaireTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(feedbackQuestionnaireTemplates.id, id))
      .returning();
    return result[0] ?? null;
  }

  async createInstance(data: NewFeedbackQuestionnaireInstance) {
    const result = await db.insert(feedbackQuestionnaireInstances).values(data).returning();
    return result[0];
  }

  async createInstanceFromTemplate(
    templateId: FeedbackQuestionnaireTemplateId,
  ): Promise<FeedbackQuestionnaireInstance | null> {
    const template = await this.findTemplateById(templateId);
    if (!template) return null;
    return await this.createInstance({
      templateId: template.id,
      title: template.title,
      definition: template.definition,
    });
  }

  async findInstanceById(id: FeedbackQuestionnaireInstanceId) {
    const result = await db
      .select()
      .from(feedbackQuestionnaireInstances)
      .where(eq(feedbackQuestionnaireInstances.id, id));
    return result[0] ?? null;
  }

  async listInstances() {
    return await db.select().from(feedbackQuestionnaireInstances);
  }

  async findResponseByInstanceAndUser(input: {
    instanceId: FeedbackQuestionnaireInstanceId;
    respondentUserId: UserId;
  }) {
    const result = await db
      .select()
      .from(feedbackQuestionnaireResponses)
      .where(
        and(
          eq(feedbackQuestionnaireResponses.instanceId, input.instanceId),
          eq(feedbackQuestionnaireResponses.respondentUserId, input.respondentUserId),
        ),
      );
    return result[0] ?? null;
  }

  async upsertResponse(input: {
    instanceId: FeedbackQuestionnaireInstanceId;
    respondentUserId: UserId;
    answers: FeedbackQuestionnaireAnswers;
  }) {
    const now = new Date();
    const result = await db
      .insert(feedbackQuestionnaireResponses)
      .values({
        instanceId: input.instanceId,
        respondentUserId: input.respondentUserId,
        answers: input.answers,
        submittedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          feedbackQuestionnaireResponses.instanceId,
          feedbackQuestionnaireResponses.respondentUserId,
        ],
        set: {
          answers: input.answers,
          updatedAt: now,
        },
      })
      .returning();
    return result[0];
  }
}
