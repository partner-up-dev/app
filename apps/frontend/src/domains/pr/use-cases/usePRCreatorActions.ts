import { computed, type ComputedRef } from "vue";
import type { PartnerRequestFormInput } from "@/lib/validation";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";
import type { PRDetailView, PRFormFields } from "@/domains/pr/model/types";
import { toUserUpdatePRContentFields } from "@/domains/pr/model/types";
import {
  useUpdatePRContent,
  useUpdatePRStatus,
} from "@/domains/pr/queries/usePRActions";

type UsePRCreatorActionsInput = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  supportsEventContextFeatures: ComputedRef<boolean>;
};

export const usePRCreatorActions = ({
  id,
  pr,
  supportsEventContextFeatures,
}: UsePRCreatorActionsInput) => {
  const updateContentMutation = useUpdatePRContent();
  const updateStatusMutation = useUpdatePRStatus();

  const isCreator = computed(
    () => pr.value?.partnerSection.viewer.isCreator ?? false,
  );

  const showEditContentAction = computed(() => {
    const detail = pr.value;
    if (!detail || !isCreator.value) return false;
    return detail.editCapability.canEdit;
  });

  const showModifyStatusAction = computed(() => isCreator.value);
  const showHeaderQuickActions = computed(
    () => showEditContentAction.value || showModifyStatusAction.value,
  );

  const editableFields = computed<PRFormFields | null>(() => {
    const detail = pr.value;
    if (!detail) return null;

    return {
      title: detail.title,
      type: detail.core.type ?? "",
      time: detail.core.time ?? [null, null],
      location: detail.core.location ?? null,
      route: detail.core.route ?? null,
      minPartners: detail.core.minPartners ?? null,
      maxPartners: detail.core.maxPartners ?? null,
      partners: detail.core.partners ?? [],
      budget: detail.core.budget ?? null,
      preferences: detail.core.preferences ?? [],
      notes: detail.core.notes ?? null,
      meetingPoint: detail.core.meetingPoint
        ? {
            description: detail.core.meetingPoint.description,
            imageUrl: detail.core.meetingPoint.imageUrl,
          }
        : null,
    };
  });

  const showBudgetField = computed(
    () => !supportsEventContextFeatures.value,
  );
  const showTimeField = computed(
    () => !supportsEventContextFeatures.value,
  );

  const editContentPending = computed(
    () => updateContentMutation.isPending.value,
  );
  const editContentError = computed(() => updateContentMutation.error.value);
  const hasEditContentError = computed(() => Boolean(editContentError.value));
  const updateStatusPending = computed(
    () => updateStatusMutation.isPending.value,
  );
  const updateStatusError = computed(() => updateStatusMutation.error.value);
  const hasUpdateStatusError = computed(() => Boolean(updateStatusError.value));

  const submitContentUpdate = async (
    { fields }: PartnerRequestFormInput,
    options: { allowRelease?: boolean } = {},
  ): Promise<void> => {
    const prId = id.value;
    if (prId === null) return;

    await updateContentMutation.mutateAsync({
      id: prId,
      fields: toUserUpdatePRContentFields(fields),
      allowRelease: options.allowRelease,
    });
  };

  const submitStatusUpdate = async (
    status: PRStatusManual,
  ): Promise<void> => {
    const prId = id.value;
    if (prId === null) return;

    await updateStatusMutation.mutateAsync({
      id: prId,
      status,
    });
  };

  return {
    editableFields,
    showBudgetField,
    showTimeField,
    showEditContentAction,
    showModifyStatusAction,
    showHeaderQuickActions,
    editContentPending,
    editContentError,
    hasEditContentError,
    updateStatusPending,
    updateStatusError,
    hasUpdateStatusError,
    submitContentUpdate,
    submitStatusUpdate,
    resetContentUpdate: updateContentMutation.reset,
    resetStatusUpdate: updateStatusMutation.reset,
  };
};
