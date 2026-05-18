<template>
  <section
    v-if="showActionArea"
    class="contextual-area"
    data-region="join-exit-actions"
    data-testid="pr-detail.join-exit-actions"
  >
    <InlineNotice
      v-if="releaseNoticeText"
      tone="warning"
      :message="releaseNoticeText"
    />

    <InlineNotice
      v-if="joinBlockedMessage"
      tone="warning"
      :message="joinBlockedMessage"
    />

    <PRJoinFlow
      ref="joinFlowRef"
      :pr-id="pr.id"
      :disabled="!showJoinAction"
      :scenario-type="pr.core.type"
      :event-id="joinEntryContext.routeEventId"
      :entry-surface="joinEntryContext.joinEntrySurface"
      :confirmation-deadline-at="confirmationDeadlineAt"
      :confirmation-reminder-supported="pr.partnerSection.confirmation.enabled"
      :viewer-is-participant="pr.partnerSection.viewer.isParticipant"
      write-join-entry-on-auth
    >
      <template #default="{ open, pending, disabled, joined, errorMessage }">
        <div v-if="showJoinAction" class="primary-action">
          <Button
            class="primary-action__button"
            tone="primary"
            :disabled="disabled"
            :loading="pending"
            block
            data-testid="pr-detail.join.open"
            @click="handleJoinAction(open, pending, disabled)"
          >
            {{
              joined
                ? t("prPage.partnerSection.rosterJoined")
                : pending
                  ? t("prPage.joining")
                  : t("prPage.join")
            }}
          </Button>
          <p v-if="errorMessage" class="action-error">
            {{ errorMessage }}
          </p>
        </div>
      </template>
    </PRJoinFlow>

    <div v-if="showExitAction" class="secondary-danger-action">
      <Button
        tone="danger"
        :disabled="!viewer.canExit"
        :loading="exitMutation.isPending.value"
        block
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
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRJoinEntryContext } from "@/domains/pr/model/pr-join-entry-context";
import Button from "@/shared/ui/actions/Button.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import ConfirmDialog from "@/shared/ui/overlay/ConfirmDialog.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import PRJoinFlow from "@/domains/pr/ui/composites/PRJoinFlow.vue";
import { useExitPR } from "@/domains/pr/queries/usePRActions";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";
import { trackEvent } from "@/shared/telemetry/track";

type JoinFlowExpose = {
  open: () => Promise<void>;
};

const props = defineProps<{
  pr: PRDetailView;
  joinEntryContext: PRJoinEntryContext;
}>();

const { t } = useI18n();
const prDetail = computed(() => props.pr);
const viewer = computed(() => props.pr.partnerSection.viewer);
const joinFlowRef = ref<JoinFlowExpose | null>(null);
const showExitConfirmModal = ref(false);
const exitActionError = ref<string | null>(null);
const exitMutation = useExitPR();
const { releaseNoticeText, blockedReasonText } = usePRActionCopy(prDetail);

const confirmationDeadlineAt = computed(
  () => props.pr.partnerSection.timeline?.confirmationEndAt ?? null,
);

const showJoinAction = computed(
  () =>
    !viewer.value.isCreator &&
    !viewer.value.isParticipant &&
    !viewer.value.isWaitlisted &&
    viewer.value.canJoin &&
    !viewer.value.canWaitlist,
);

const joinBlockedMessage = computed(() => {
  if (
    viewer.value.isParticipant ||
    viewer.value.isWaitlisted ||
    viewer.value.canJoin ||
    viewer.value.canWaitlist ||
    viewer.value.joinBlockedReason === "FULL"
  ) {
    return null;
  }
  return blockedReasonText(viewer.value.joinBlockedReason);
});

const showExitAction = computed(() => viewer.value.isParticipant);

const exitBlockedTip = computed(() => {
  if (viewer.value.canExit) return null;
  return blockedReasonText(viewer.value.exitBlockedReason);
});

const showActionArea = computed(() =>
  Boolean(
    releaseNoticeText.value ||
      joinBlockedMessage.value ||
      showJoinAction.value ||
      showExitAction.value,
  ),
);

usePRPrimaryActionImpression({
  pr: prDetail,
  ctaType: computed(() => (showJoinAction.value ? "JOIN" : null)),
  visible: showJoinAction,
});

useBodyScrollLock(computed(() => showExitConfirmModal.value));

const openJoinFlow = async (): Promise<void> => {
  await nextTick();
  await joinFlowRef.value?.open();
};

const handleJoinAction = (
  open: () => Promise<void>,
  pending: boolean,
  disabled: boolean,
): void => {
  if (pending || disabled) return;
  trackPRPrimaryActionClick(props.pr, "JOIN");
  void open();
};

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

const replayJoin = async (): Promise<void> => {
  if (viewer.value.isParticipant || !viewer.value.canJoin) return;
  await openJoinFlow();
};

const replayExit = async (): Promise<void> => {
  if (!viewer.value.canExit) return;
  await confirmExit();
};

defineExpose({
  replayJoin,
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

.primary-action,
.secondary-danger-action {
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
