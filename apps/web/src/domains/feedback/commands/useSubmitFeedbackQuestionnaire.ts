import { useMutation } from "@tanstack/vue-query";
import type { FeedbackQuestionnaireAnswers } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

export type SubmitFeedbackQuestionnaireInput = {
  instanceId: number;
  answers: FeedbackQuestionnaireAnswers;
};

export const readSubmitFeedbackQuestionnaireError = async (response: Response): Promise<Error> => {
  const payload = await readApiErrorPayload(response);
  return buildApiError(resolveApiErrorMessage(payload, "提交反馈失败"), payload);
};

export const useSubmitFeedbackQuestionnaire = () =>
  useMutation({
    mutationFn: async (input: SubmitFeedbackQuestionnaireInput) => {
      const response = await client.api.feedback[":instanceId"].$post(
        {
          param: { instanceId: input.instanceId.toString() },
          json: { answers: input.answers },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!response.ok) {
        throw await readSubmitFeedbackQuestionnaireError(response);
      }

      return await response.json();
    },
  });
