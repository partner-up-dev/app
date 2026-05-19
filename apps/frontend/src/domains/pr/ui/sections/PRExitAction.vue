<template>
  <section
    v-if="showExitAction"
    class="contextual-area"
    data-region="exit-action"
    data-testid="pr-detail.exit-action"
  >
    <div class="secondary-danger-action">
      <Button
        tone="danger"
        :disabled="!viewer.canExit"
        :loading="exitMutation.isPending.value"
        block
        data-testid="pr-detail.exit.open"
        @click="requestExitWithConfirm"
      >
        {{ t("prPage.exit") }}
      </Button>
      <p v-if="exitBlockedTip" class="action-tip">
        {{ exitBlockedTip }}
      </p>
      <p v-if="exitActionError" class="action-error">
        {{ exitActionError }}
      </p>
    </div>

    <ConfirmDialog
      :open="showExitConfirmModal"
      title="确认退出"
      message="退出后你的参与名额会被释放，确认继续？"
      :confirm-label="
        exitMutation.isPending.value ? t('prPage.exiting') : t('common.confirm')
      "
      confirm-tone="danger"
      :loading="exitMutation.isPending.value"
      @close="showExitConfirmModal = false"
      @confirm="confirmExit"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useExitPR } from "@/domains/pr/queries/usePRActions";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
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

useBodyScrollLock(computed(() => showExitConfirmModal.value));

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
      scenarioType: props.pr.core.type,
    });
    showExitConfirmModal.value = false;
  } catch (error) {
    exitActionError.value =
      error instanceof Error ? error.message : t("errors.exitRequestFailed");
  }
};

const replayExit = async (): Promise<void> => {
  if (!viewer.value.canExit) return;
  await confirmExit();
};

defineExpose({
  replayExit,
});
</script>

<style lang="scss" scoped>
.contextual-area {
  margin-top: var(--sys-spacing-large);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.secondary-danger-action {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
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
