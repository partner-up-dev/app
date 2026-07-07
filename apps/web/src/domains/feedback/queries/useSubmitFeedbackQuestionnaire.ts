import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { FeedbackQuestionnaireAnswers, PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const useSubmitFeedbackQuestionnaire = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      instanceId: number;
      prId?: PRId | null;
      answers: FeedbackQuestionnaireAnswers;
    }) => {
      const res = await client.api.feedback[":instanceId"].$post(
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

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "提交反馈失败"));
      }

      return await res.json();
    },
    onSuccess: (_data, variables) => {
      if (variables.prId !== null && variables.prId !== undefined) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.pr.detail(variables.prId),
        });
      }
    },
  });
};
