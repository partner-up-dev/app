import { useCreateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import type { AnchorEventEditorForm } from "@/domains/admin/ui/anchor-event/anchorEventEditorTypes";
import { buildAnchorEventMutationInputFromEditorDraft } from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export const useCreateAnchorEvent = () => {
  const mutation = useCreateAdminAnchorEvent();

  const createAnchorEvent = async (draft: AnchorEventEditorForm) =>
    await mutation.mutateAsync(
      buildAnchorEventMutationInputFromEditorDraft(draft),
    );

  return {
    createAnchorEvent,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
