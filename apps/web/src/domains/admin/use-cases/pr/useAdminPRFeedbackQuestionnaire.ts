import {
  useMaterializeAdminPRFeedbackQuestionnaireInstance,
  useUpdateAdminPRFeedbackQuestionnaireInstance,
} from "@/domains/admin/queries/useAdminPRManagement";

export const useAdminPRFeedbackQuestionnaire = () => {
  const updateInstanceMutation = useUpdateAdminPRFeedbackQuestionnaireInstance();
  const materializeInstanceMutation =
    useMaterializeAdminPRFeedbackQuestionnaireInstance();

  const updateInstance = async ({
    prId,
    feedbackQuestionnaireInstanceId,
  }: {
    prId: number;
    feedbackQuestionnaireInstanceId: number | null;
  }) =>
    await updateInstanceMutation.mutateAsync({
      prId,
      input: { feedbackQuestionnaireInstanceId },
    });

  const materializeFromTemplate = async ({
    prId,
    feedbackQuestionnaireTemplateId,
  }: {
    prId: number;
    feedbackQuestionnaireTemplateId: number;
  }) =>
    await materializeInstanceMutation.mutateAsync({
      prId,
      input: { feedbackQuestionnaireTemplateId },
    });

  const reset = () => {
    updateInstanceMutation.reset();
    materializeInstanceMutation.reset();
  };

  return {
    updateInstance,
    materializeFromTemplate,
    isPending: {
      updateInstance: updateInstanceMutation.isPending,
      materialize: materializeInstanceMutation.isPending,
    },
    errors: {
      updateInstance: updateInstanceMutation.error,
      materialize: materializeInstanceMutation.error,
    },
    reset,
  };
};
