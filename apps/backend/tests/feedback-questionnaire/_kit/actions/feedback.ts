import { expectJsonResponse, requestJson } from "../../../_infra/http/backend-app";
import type {
  FeedbackQuestionnaireAnswers,
  FeedbackQuestionnaireInstanceId,
  FeedbackQuestionnaireResponse,
} from "../../../../src/entities/feedback-questionnaire";
import type { ScenarioUser } from "../../../pr/_kit/builders/users";

export type SubmitFeedbackResponse = Pick<FeedbackQuestionnaireResponse, "instanceId"> & {
  responseId: FeedbackQuestionnaireResponse["id"];
  submittedAt: string;
  updatedAt: string;
};

export async function submitFeedbackQuestionnaire(input: {
  instanceId: FeedbackQuestionnaireInstanceId;
  respondent: ScenarioUser;
  answers: FeedbackQuestionnaireAnswers;
}): Promise<SubmitFeedbackResponse> {
  const response = await requestJson(`/api/feedback/${input.instanceId}`, {
    method: "POST",
    token: input.respondent.token,
    body: {
      answers: input.answers,
    },
  });

  return await expectJsonResponse<SubmitFeedbackResponse>(response, 200);
}
