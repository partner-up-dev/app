import { computed, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/telemetry/track";
import { useCheckInPRSlot, useConfirmPRSlot } from "@/domains/pr/queries/usePRActions";

export type UsePRAttendanceActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  onActionSuccess?: () => void;
};

export const usePRAttendanceActions = ({
  id,
  pr,
  onActionSuccess,
}: UsePRAttendanceActionsOptions) => {
  const confirmSlotMutation = useConfirmPRSlot();
  const checkInSlotMutation = useCheckInPRSlot();

  const canConfirm = computed(() => pr.value?.partnerSection.viewer.canConfirm ?? false);
  const canCheckIn = computed(() => pr.value?.partnerSection.viewer.canCheckIn ?? false);

  const confirmPending = computed(() => confirmSlotMutation.isPending.value);
  const checkInPending = computed(() => checkInSlotMutation.isPending.value);

  const handleConfirmSlot = async () => {
    if (id.value === null) return;

    await confirmSlotMutation.mutateAsync({ id: id.value });
    trackEvent("pr_confirm_success", {
      prId: id.value,
      scenarioType: pr.value?.core.type,
    });
    onActionSuccess?.();
  };

  const submitCheckIn = async () => {
    if (id.value === null) return;

    await checkInSlotMutation.mutateAsync({
      id: id.value,
    });

    trackEvent("pr_checkin_submitted", {
      prId: id.value,
      scenarioType: pr.value?.core.type,
      didAttend: true,
    });
    onActionSuccess?.();
  };

  return {
    canConfirm,
    canCheckIn,
    confirmPending,
    checkInPending,
    handleConfirmSlot,
    submitCheckIn,
  };
};
