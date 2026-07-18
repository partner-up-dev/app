import { useMutation } from "@tanstack/vue-query";
import type { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { buildApiError, readApiErrorPayload, resolveApiErrorMessage } from "@/shared/api/error";

type FeedbackQuestionnaireRoute = (typeof client.api.feedback)[":instanceId"];
type SubmitFeedbackQuestionnaireRoute = FeedbackQuestionnaireRoute["$post"];

export type SubmitFeedbackQuestionnaireRequest = InferRequestType<SubmitFeedbackQuestionnaireRoute>;
export type SubmitFeedbackQuestionnaireAnswers =
  SubmitFeedbackQuestionnaireRequest["json"]["answers"];
export type SubmitFeedbackQuestionnaireResponse = InferResponseType<
  SubmitFeedbackQuestionnaireRoute
>;

export type SubmitFeedbackQuestionnaireInput = {
  instanceId: number;
  answers: SubmitFeedbackQuestionnaireAnswers;
};

export const readSubmitFeedbackQuestionnaireError = async (response: Response): Promise<Error> => {
  const payload = await readApiErrorPayload(response);
  return buildApiError(resolveApiErrorMessage(payload, "提交反馈失败"), payload);
};

export const useSubmitFeedbackQuestionnaire = () =>
  useMutation<SubmitFeedbackQuestionnaireResponse, Error, SubmitFeedbackQuestionnaireInput>({
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
