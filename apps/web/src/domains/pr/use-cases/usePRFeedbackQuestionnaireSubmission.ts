import { computed, type Ref } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import type { PRId } from "@partner-up-dev/backend";
import {
  type SubmitFeedbackQuestionnaireInput,
  useSubmitFeedbackQuestionnaire,
} from "@/domains/feedback/commands/useSubmitFeedbackQuestionnaire";
import { queryKeys } from "@/shared/api/query-keys";

export const usePRFeedbackQuestionnaireSubmission = (prId: Readonly<Ref<PRId>>) => {
  const queryClient = useQueryClient();
  const command = useSubmitFeedbackQuestionnaire();

  const submit = async (input: SubmitFeedbackQuestionnaireInput) => {
    const submittedPrId = prId.value;
    command.reset();
    const result = await command.mutateAsync(input);
    await queryClient.invalidateQueries({
      queryKey: queryKeys.pr.detail(submittedPrId),
    });
    return result;
  };

  return {
    submit,
    resetError: command.reset,
    isPending: command.isPending,
    errorMessage: computed(() =>
      command.error.value instanceof Error ? command.error.value.message : null,
    ),
  };
};
