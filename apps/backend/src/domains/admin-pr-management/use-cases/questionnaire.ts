import type {
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities/feedback-questionnaire";
import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepository = new PartnerRequestRepository();
const feedbackRepository = new FeedbackQuestionnaireRepository();

export const materializeAdminPRFeedbackQuestionnaireInstance = async (input: {
  prId: PRId;
  feedbackQuestionnaireTemplateId: FeedbackQuestionnaireTemplateId;
}) => {
  if (!(await prRepository.findById(input.prId)))
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  const instance = await feedbackRepository.createInstanceFromTemplate(
    input.feedbackQuestionnaireTemplateId,
  );
  if (!instance)
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire template not found" });
  return prRepository.updateFeedbackQuestionnaireInstanceId(input.prId, instance.id);
};

export const updateAdminPRFeedbackQuestionnaireInstance = async (
  prId: PRId,
  instanceId: FeedbackQuestionnaireInstanceId | null,
) => {
  if (!(await prRepository.findById(prId)))
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  if (instanceId !== null && !(await feedbackRepository.findInstanceById(instanceId))) {
    return throwHttpProblem({ status: 404, detail: "Feedback questionnaire instance not found" });
  }
  return prRepository.updateFeedbackQuestionnaireInstanceId(prId, instanceId);
};
