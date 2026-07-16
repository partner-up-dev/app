import { and, eq } from "drizzle-orm";
import {
  feedbackQuestionnaireInstances,
  feedbackQuestionnaireResponses,
  type PartnerRequest,
  type PRId,
  partnerRequests,
} from "../../../../src/entities";
import type {
  FeedbackQuestionnaireInstance,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireResponse,
} from "../../../../src/entities/feedback-questionnaire";
import type { UserId } from "../../../../src/entities/user";
import { getTestDb } from "../../../_infra/probes/sql-probe";

export async function probePartnerRequest(prId: PRId): Promise<PartnerRequest> {
  const rows = await getTestDb().select().from(partnerRequests).where(eq(partnerRequests.id, prId));
  const pr = rows[0] ?? null;
  if (!pr) {
    throw new Error(`PartnerRequest ${prId} not found`);
  }
  return pr;
}

export async function probeFeedbackQuestionnaireInstance(
  instanceId: FeedbackQuestionnaireInstanceId,
): Promise<FeedbackQuestionnaireInstance> {
  const rows = await getTestDb()
    .select()
    .from(feedbackQuestionnaireInstances)
    .where(eq(feedbackQuestionnaireInstances.id, instanceId));
  const instance = rows[0] ?? null;
  if (!instance) {
    throw new Error(`FeedbackQuestionnaireInstance ${instanceId} not found`);
  }
  return instance;
}

export async function probeFeedbackResponsesByInstanceAndUser(input: {
  instanceId: FeedbackQuestionnaireInstanceId;
  respondentUserId: UserId;
}): Promise<FeedbackQuestionnaireResponse[]> {
  return await getTestDb()
    .select()
    .from(feedbackQuestionnaireResponses)
    .where(
      and(
        eq(feedbackQuestionnaireResponses.instanceId, input.instanceId),
        eq(feedbackQuestionnaireResponses.respondentUserId, input.respondentUserId),
      ),
    );
}
