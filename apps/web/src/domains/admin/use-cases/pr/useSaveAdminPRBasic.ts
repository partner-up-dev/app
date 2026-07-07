import {
  useCreateAdminPR,
  useUpdateAdminPRContent,
  useUpdateAdminPRStatus,
  useUpdateAdminPRVisibility,
} from "@/domains/admin/queries/useAdminPRManagement";
import {
  type AdminPRBasicDraft,
  buildPRContentInput,
} from "@/domains/admin/use-cases/pr/prMutationInput";

export type AdminPRStatusDraft = {
  status: "OPEN" | "READY" | "ACTIVE" | "CLOSED";
  visibilityStatus: "VISIBLE" | "HIDDEN";
};

export type AdminPRCurrentState = {
  prId: number;
  status: AdminPRStatusDraft["status"];
  visibilityStatus: AdminPRStatusDraft["visibilityStatus"];
};

export const useSaveAdminPRBasic = () => {
  const createPRMutation = useCreateAdminPR();
  const updateContentMutation = useUpdateAdminPRContent();
  const updateStatusMutation = useUpdateAdminPRStatus();
  const updateVisibilityMutation = useUpdateAdminPRVisibility();

  const createPR = async (draft: AdminPRBasicDraft) => {
    const input = buildPRContentInput(draft);
    if (input === null) {
      return null;
    }
    return await createPRMutation.mutateAsync(input);
  };

  const updatePR = async ({
    current,
    draft,
  }: {
    current: AdminPRCurrentState;
    draft: AdminPRBasicDraft & AdminPRStatusDraft;
  }) => {
    const input = buildPRContentInput(draft);
    if (input === null) {
      return null;
    }

    await updateContentMutation.mutateAsync({
      prId: current.prId,
      input,
    });

    if (draft.status !== current.status) {
      await updateStatusMutation.mutateAsync({
        prId: current.prId,
        input: { status: draft.status },
      });
    }

    if (draft.visibilityStatus !== current.visibilityStatus) {
      await updateVisibilityMutation.mutateAsync({
        prId: current.prId,
        input: { visibilityStatus: draft.visibilityStatus },
      });
    }
  };

  const reset = () => {
    createPRMutation.reset();
    updateContentMutation.reset();
    updateStatusMutation.reset();
    updateVisibilityMutation.reset();
  };

  return {
    createPR,
    updatePR,
    isPending: {
      create: createPRMutation.isPending,
      updateContent: updateContentMutation.isPending,
      updateStatus: updateStatusMutation.isPending,
      updateVisibility: updateVisibilityMutation.isPending,
    },
    errors: {
      create: createPRMutation.error,
      updateContent: updateContentMutation.error,
      updateStatus: updateStatusMutation.error,
      updateVisibility: updateVisibilityMutation.error,
    },
    reset,
  };
};
