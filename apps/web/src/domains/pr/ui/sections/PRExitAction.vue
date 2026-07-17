<template>
  <section
    v-if="showExitAction"
    class="action-section"
    data-region="exit-action"
    data-testid="pr-detail.exit-action"
  >
    <div class="action-group">
      <PuButton
        tone="danger"
        variant="outline"
        :disabled="!viewer.canExit"
        :loading="exitMutation.isPending.value"
        block
        data-testid="pr-detail.exit.open"
        @click="requestExitWithConfirm"
      >
        {{ t("prPage.exit") }}
      </PuButton>
      <p v-if="exitBlockedTip" class="action-tip">
        {{ exitBlockedTip }}
      </p>
      <p v-if="exitActionError" class="action-error">
        {{ exitActionError }}
      </p>
    </div>

    <PuDialog
      :open="showExitConfirmModal"
      title="确认退出"
      description="退出后你的参与名额会被释放，确认继续？"
      :confirm-text="exitMutation.isPending.value ? t('prPage.exiting') : t('common.confirm')"
      tone="error"
      :confirm-loading="exitMutation.isPending.value"
      @close="showExitConfirmModal = false"
      @cancel="showExitConfirmModal = false"
      @confirm="confirmExit"
    />
  </section>
</template>

<script setup lang="ts">
import { PuButton, PuDialog } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import { useExitPR } from "@/domains/pr/queries/usePRActions";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import { useRegisterPRPendingReplayHandler } from "@/domains/pr/use-cases/usePRPendingWeChatReplay";
import { trackEvent } from "@/shared/telemetry/track";

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const viewer = computed(() => props.pr.partnerSection.viewer);
const showExitConfirmModal = ref(false);
const exitActionError = ref<string | null>(null);
const exitMutation = useExitPR();
const { blockedReasonText } = usePRActionCopy(prDetail);

const showExitAction = computed(() => viewer.value.isParticipant);

const exitBlockedTip = computed(() => {
  if (viewer.value.canExit) return null;
  return blockedReasonText(viewer.value.exitBlockedReason);
});

const requestExitWithConfirm = (): void => {
  exitActionError.value = null;
  if (!viewer.value.canExit) return;
  showExitConfirmModal.value = true;
};

const confirmExit = async (): Promise<void> => {
  exitActionError.value = null;
  if (!viewer.value.canExit) return;
  try {
    await exitMutation.mutateAsync({ id: props.pr.id });
    trackEvent("pr_exit_success", {
      prId: props.pr.id,
      prType: props.pr.core.type,
    });
    showExitConfirmModal.value = false;
  } catch (error) {
    exitActionError.value = error instanceof Error ? error.message : t("errors.exitRequestFailed");
  }
};

const replayExit = async (): Promise<void> => {
  if (!viewer.value.canExit) return;
  await confirmExit();
};

const pendingReplayReady = computed(
  () => showExitAction.value && viewer.value.canExit && !exitMutation.isPending.value,
);

useRegisterPRPendingReplayHandler("PR_EXIT", {
  ready: pendingReplayReady,
  replay: replayExit,
});

defineExpose({
  replayExit,
});
</script>

<style lang="scss" scoped>
.action-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.action-tip {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-on-surface-variant);
}

.action-error {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}
</style>
