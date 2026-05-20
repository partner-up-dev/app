<template>
  <section
    v-if="showConfirmAction || primaryActionError"
    class="contextual-area"
    data-region="confirmation-action"
    data-testid="pr-detail.confirmation-action"
  >
    <div v-if="showConfirmAction" class="primary-action">
      <Button
        class="primary-action__button"
        tone="primary"
        :disabled="!viewer.canConfirm"
        :loading="attendanceActions.confirmPending.value"
        block
        data-testid="pr-detail.participant.confirm-action"
        @click="handleConfirmSlot"
      >
        {{
          attendanceActions.confirmPending.value
            ? t("prPage.confirmingSlot")
            : t("prPage.confirmSlot")
        }}
      </Button>
      <p v-if="confirmTip" class="action-tip">
        {{ confirmTip }}
      </p>
    </div>

    <p v-if="primaryActionError" class="action-error">
      {{ primaryActionError }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import { usePRAttendanceActions } from "@/domains/pr/use-cases/usePRAttendanceActions";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";
import { useRegisterPRPendingReplayHandler } from "@/domains/pr/use-cases/usePRPendingWeChatReplay";

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const prId = computed(() => props.pr.id);
const viewer = computed(() => props.pr.partnerSection.viewer);
const primaryActionError = ref<string | null>(null);
const { resolveConfirmTip } = usePRActionCopy(prDetail);

const attendanceActions = usePRAttendanceActions({
  id: prId,
  pr: prDetail,
});

const showConfirmAction = computed(
  () =>
    viewer.value.isParticipant &&
    viewer.value.slotState === "JOINED" &&
    props.pr.partnerSection.confirmation.enabled,
);

const confirmTip = computed(() => {
  if (!showConfirmAction.value || viewer.value.canConfirm) return null;
  return resolveConfirmTip();
});

usePRPrimaryActionImpression({
  pr: prDetail,
  ctaType: computed(() => (showConfirmAction.value ? "CONFIRM_SLOT" : null)),
  visible: showConfirmAction,
});

const handleConfirmSlot = async (): Promise<void> => {
  if (!showConfirmAction.value) return;
  if (!viewer.value.canConfirm || attendanceActions.confirmPending.value) return;
  primaryActionError.value = null;
  trackPRPrimaryActionClick(props.pr, "CONFIRM_SLOT");
  try {
    await attendanceActions.handleConfirmSlot();
  } catch (error) {
    primaryActionError.value =
      error instanceof Error ? error.message : t("errors.confirmSlotFailed");
  }
};

const replayConfirm = async (): Promise<void> => {
  if (!attendanceActions.canConfirm.value) return;
  await handleConfirmSlot();
};

const pendingReplayReady = computed(
  () =>
    showConfirmAction.value &&
    attendanceActions.canConfirm.value &&
    !attendanceActions.confirmPending.value,
);

useRegisterPRPendingReplayHandler("PR_CONFIRM", {
  ready: pendingReplayReady,
  replay: replayConfirm,
});

defineExpose({
  replayConfirm,
});
</script>

<style lang="scss" scoped>
.contextual-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.primary-action__button {
  max-width: 100%;
}

.action-tip {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
