import type {
  FeedbackQuestionnaireTemplate,
  FeedbackQuestionnaireTemplateId,
} from "../../../entities/feedback-questionnaire";
import { FeedbackQuestionnaireRepository } from "../../../repositories/FeedbackQuestionnaireRepository";

const repository = new FeedbackQuestionnaireRepository();

/** Public owner query for configuration that references a future questionnaire template. */
export const findFeedbackQuestionnaireTemplate = async (
  templateId: FeedbackQuestionnaireTemplateId,
): Promise<FeedbackQuestionnaireTemplate | null> => await repository.findTemplateById(templateId);
