import { useUpdateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminAnchorEventRecord,
  type AnchorEventTimePolicyDraft,
  buildAnchorEventTimePoolConfig,
  toAnchorEventMutationInput,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export { buildAnchorEventTimePoolConfig };

export const useUpdateAnchorEventTimePolicy = () => {
  const mutation = useUpdateAdminAnchorEvent();

  const updateTimePolicy = async ({
    event,
    draft,
  }: {
    event: AdminAnchorEventRecord;
    draft: AnchorEventTimePolicyDraft;
  }) =>
    await mutation.mutateAsync({
      eventId: event.id,
      input: toAnchorEventMutationInput(event, {
        timePoolConfig: buildAnchorEventTimePoolConfig(draft),
        defaultConfirmationEnabled: draft.defaultConfirmationEnabled,
        defaultConfirmationStartOffsetMinutes:
          draft.defaultConfirmationStartOffsetMinutes,
        defaultConfirmationEndOffsetMinutes:
          draft.defaultConfirmationEndOffsetMinutes,
        defaultJoinLockOffsetMinutes: draft.defaultJoinLockOffsetMinutes,
        prTimeWindowEditorDefaultMode: draft.prTimeWindowEditorDefaultMode,
      }),
    });

  return {
    updateTimePolicy,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
