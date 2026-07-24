import { throwHttpProblem } from "../../../lib/problem-details";
import type { FeedbackQuestionnaireInstanceId } from "../../../entities/feedback-questionnaire";
import type { UserId } from "../../../entities/user";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import type { FeedbackQuestionnaireAnswers } from "../contracts";
import { assertFeedbackAnswersMatchDefinition } from "../services/answer-validation.service";

const feedbackRepo = new FeedbackQuestionnaireRepository();

export async function submitFeedbackQuestionnaire(input: {
  instanceId: FeedbackQuestionnaireInstanceId;
  respondentUserId: UserId;
  answers: FeedbackQuestionnaireAnswers;
}) {
  const instance = await feedbackRepo.findInstanceById(input.instanceId);
  if (!instance) {
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire instance not found" });
  }

  assertFeedbackAnswersMatchDefinition(instance.definition, input.answers);

  const response = await feedbackRepo.upsertResponse({
    instanceId: input.instanceId,
    respondentUserId: input.respondentUserId,
    answers: input.answers,
  });

  return {
    responseId: response.id,
    instanceId: response.instanceId,
    submittedAt: response.submittedAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}
