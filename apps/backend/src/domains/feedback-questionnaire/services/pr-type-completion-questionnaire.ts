import type { PRId } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { materializeFeedbackQuestionnaireInstance } from "./materialize-feedback-questionnaire";

const prRepo = new PartnerRequestRepository();

/** Snapshots the type-owned completion questionnaire when a PR is created. */
export async function materializePRTypeCompletionQuestionnaire(input: {
  prId: PRId;
  feedbackQuestionnaireTemplateId: number | null;
}): Promise<void> {
  const feedbackQuestionnaireInstanceId = await materializeFeedbackQuestionnaireInstance(
    input.feedbackQuestionnaireTemplateId,
  );
  await prRepo.updateFeedbackQuestionnaireInstanceId(input.prId, feedbackQuestionnaireInstanceId);
}
