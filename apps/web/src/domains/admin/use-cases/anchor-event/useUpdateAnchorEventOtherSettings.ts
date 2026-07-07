import { useUpdateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminAnchorEventRecord,
  type AnchorEventOtherSettingsDraft,
  toAnchorEventMutationInput,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export const useUpdateAnchorEventOtherSettings = () => {
  const mutation = useUpdateAdminAnchorEvent();

  const updateOtherSettings = async ({
    event,
    draft,
  }: {
    event: AdminAnchorEventRecord;
    draft: AnchorEventOtherSettingsDraft;
  }) =>
    await mutation.mutateAsync({
      eventId: event.id,
      input: toAnchorEventMutationInput(event, {
        joinGateConfig: draft.joinGateConfig,
        participationFrequencyLimit: draft.participationFrequencyLimit,
        feedbackQuestionnaireTemplateId: draft.feedbackQuestionnaireTemplateId,
        defaultPrNotes: draft.defaultPrNotes.trim() || null,
        prCreationPolicy: draft.prCreationPolicy,
        fullPrExpansionPolicy: draft.fullPrExpansionPolicy,
      }),
    });

  return {
    updateOtherSettings,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
