import { useUpdateAdminAnchorEvent } from "@/domains/admin/queries/useAdminAnchorEvents";
import {
  type AdminAnchorEventRecord,
  type AnchorEventBasicDraft,
  normalizeNullableNonNegativeInteger,
  toAnchorEventMutationInput,
} from "@/domains/admin/use-cases/anchor-event/anchorEventMutationInput";

export const useUpdateAnchorEventBasic = () => {
  const mutation = useUpdateAdminAnchorEvent();

  const updateBasic = async ({
    event,
    draft,
  }: {
    event: AdminAnchorEventRecord;
    draft: AnchorEventBasicDraft;
  }) =>
    await mutation.mutateAsync({
      eventId: event.id,
      input: toAnchorEventMutationInput(event, {
        title: draft.title.trim(),
        type: draft.type.trim(),
        description: draft.description.trim() || null,
        defaultMinPartners: normalizeNullableNonNegativeInteger(
          draft.defaultMinPartners,
        ),
        defaultMaxPartners: normalizeNullableNonNegativeInteger(
          draft.defaultMaxPartners,
        ),
        coverImage: draft.coverImage.trim() || null,
        betaGroupQrCode: draft.betaGroupQrCode.trim() || null,
        status: draft.status,
      }),
    });

  return {
    updateBasic,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
};
