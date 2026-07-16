<template>
  <section
    v-if="showActionArea"
    class="action-section"
    data-region="waitlist-actions"
    data-testid="pr-detail.waitlist-actions"
  >
    <PuInlineNotice
      v-if="waitlistBlockedMessage"
      tone="warning"
      :message="waitlistBlockedMessage"
    />

    <PuInlineNotice
      v-if="waitlistNoticeText"
      tone="info"
      :message="waitlistNoticeText"
      data-testid="pr-detail.waitlist.notice"
    />

    <div v-if="showWaitlistAction" class="action-group">
      <PuButton
        class="action-group__button"
        tone="primary" variant="solid"
        :disabled="openDisabled"
        :loading="flowPending"
        block
        data-testid="pr-detail.waitlist.open"
        @click="handleWaitlistAction"
      >
        {{
          waitlisted
            ? t("prPage.waitlisted")
            : flowPending
              ? t("prPage.waitlisting")
              : t("prPage.waitlist")
        }}
      </PuButton>
      <p v-if="waitlistActionError" class="action-error">
        {{ waitlistActionError }}
      </p>
    </div>

    <div v-if="showCancelWaitlistAction" class="action-group">
      <PuButton
        tone="neutral" variant="soft"
        :loading="cancelWaitlistMutation.isPending.value"
        block
        data-testid="pr-detail.waitlist.cancel"
        @click="requestCancelWaitlistWithConfirm"
      >
        {{
          cancelWaitlistMutation.isPending.value
            ? t("prPage.cancelWaitlisting")
            : t("prPage.cancelWaitlist")
        }}
      </PuButton>
      <p v-if="cancelWaitlistActionError" class="action-error">
        {{ cancelWaitlistActionError }}
      </p>
    </div>

    <PuDialog
      :open="showCancelWaitlistConfirmModal"
      :title="t('prPage.cancelWaitlistConfirm.title')"
      :description="t('prPage.cancelWaitlistConfirm.message')"
      :confirm-text="
        cancelWaitlistMutation.isPending.value
          ? t('prPage.cancelWaitlisting')
          : t('prPage.cancelWaitlist')
      "
      tone="error"
      :confirm-loading="cancelWaitlistMutation.isPending.value"
      @close="showCancelWaitlistConfirmModal = false"
      @cancel="showCancelWaitlistConfirmModal = false"
      @confirm="confirmCancelWaitlist"
    />
  </section>

  <PuModal
    :open="showWaitlistGateModal"
    max-width="420px"
    title="提交候补"
    @close="closeWaitlistGateModal"
  >
    <label class="alternative-reminder-option">
      <input
        v-model="alternativePrReminderOptIn"
        class="alternative-reminder-option__control"
        type="checkbox"
        :disabled="flowPending"
        data-testid="pr-detail.waitlist.alternative-reminder"
      />
      <span class="alternative-reminder-option__text">
        {{ t("prPage.waitlistAlternativeReminder.optionLabel") }}
      </span>
    </label>
    <PRJoinGates
      :pr-id="pr.id"
      :enabled="showWaitlistGateModal"
      :pending="flowPending"
      :error="waitlistActionError"
      :fallback-confirm-gate="PRWaitlistFallbackConfirmGate"
      @cancel="closeWaitlistGateModal"
      @completed="finalizeWaitlist"
      @error="setWaitlistActionError"
    />
  </PuModal>

  <PuModal
    :open="showWaitlistSuccessPrompt"
    @close="closeWaitlistSuccessPrompt"
  >
    <PRWaitlistSuccessPrompt
      ref="waitlistSuccessPromptRef"
      :open="showWaitlistSuccessPrompt"
      :alternative-pr-reminder-opt-in="waitlistSuccessAlternativeReminderOptIn"
      @done="handleWaitlistSuccessPromptDone"
    />
  </PuModal>
</template>

<script setup lang="ts">
import { PuButton, PuDialog, PuInlineNotice, PuModal } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import { useCancelWaitlistPR, useWaitlistPR } from "@/domains/pr/queries/usePRActions";
import PRJoinGates from "@/domains/pr/ui/composites/PRJoinGates.vue";
import PRWaitlistSuccessPrompt from "@/domains/pr/ui/composites/PRWaitlistSuccessPrompt.vue";
import PRWaitlistFallbackConfirmGate from "@/domains/pr/ui/gates/PRWaitlistFallbackConfirmGate.vue";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import { useRegisterPRPendingReplayHandler } from "@/domains/pr/use-cases/usePRPendingWeChatReplay";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";
import type { ApiError } from "@/shared/api/error";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { trackEvent } from "@/shared/telemetry/track";

type WaitlistSuccessPromptExpose = {
  close: () => void;
};

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const prDetail = computed(() => props.pr);
const viewer = computed(() => props.pr.partnerSection.viewer);
const waitlistSuccessPromptRef = ref<WaitlistSuccessPromptExpose | null>(null);
const showWaitlistGateModal = ref(false);
const showWaitlistSuccessPrompt = ref(false);
const showCancelWaitlistConfirmModal = ref(false);
const waitlistActionPending = ref(false);
const cancelWaitlistActionError = ref<string | null>(null);
const waitlistActionError = ref<string | null>(null);
const waitlisted = ref(false);
const alternativePrReminderOptIn = ref(false);
const waitlistSuccessAlternativeReminderOptIn = ref(false);
const waitlistMutation = useWaitlistPR();
const cancelWaitlistMutation = useCancelWaitlistPR();
const { blockedReasonText } = usePRActionCopy(prDetail);

const showWaitlistAction = computed(
  () =>
    !viewer.value.isCreator &&
    !viewer.value.isParticipant &&
    !viewer.value.isWaitlisted &&
    viewer.value.canWaitlist,
);

const waitlistNoticeText = computed(() => {
  if (!viewer.value.isWaitlisted) return null;
  if (viewer.value.waitlistRank !== null) {
    return t("prPage.waitlistRankNotice", { rank: viewer.value.waitlistRank });
  }
  return t("prPage.waitlistedNotice");
});

const waitlistBlockedMessage = computed(() => {
  if (
    viewer.value.isParticipant ||
    viewer.value.isWaitlisted ||
    viewer.value.canJoin ||
    viewer.value.canWaitlist ||
    viewer.value.joinBlockedReason !== "FULL"
  ) {
    return null;
  }
  return blockedReasonText(viewer.value.waitlistBlockedReason);
});

const showCancelWaitlistAction = computed(() => viewer.value.isWaitlisted);

const flowPending = computed(() => waitlistActionPending.value || waitlistMutation.isPending.value);
const openDisabled = computed(() => !showWaitlistAction.value || waitlisted.value);

const showActionArea = computed(() =>
  Boolean(
    waitlistBlockedMessage.value ||
      waitlistNoticeText.value ||
      showWaitlistAction.value ||
      showCancelWaitlistAction.value,
  ),
);

usePRPrimaryActionImpression({
  pr: prDetail,
  ctaType: computed(() => (showWaitlistAction.value ? "WAITLIST" : null)),
  visible: showWaitlistAction,
});

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const setWaitlistActionError = (message: string): void => {
  waitlistActionError.value = message;
};

const trackWaitlistResult = (payload: {
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}): void => {
  trackEvent("pr_waitlist_result", {
    prId: props.pr.id,
    prType: props.pr.core.type,
    entrySurface: "pr_detail",
    ...payload,
  });
};

const closeWaitlistGateModal = (): void => {
  showWaitlistGateModal.value = false;
  waitlistActionPending.value = false;
  waitlistActionError.value = null;
};

const handleWaitlistSuccessPromptDone = (): void => {
  if (!showWaitlistSuccessPrompt.value) return;
  showWaitlistSuccessPrompt.value = false;
};

const closeWaitlistSuccessPrompt = (): void => {
  waitlistSuccessPromptRef.value?.close();
  if (!waitlistSuccessPromptRef.value) {
    handleWaitlistSuccessPromptDone();
  }
};

const openWaitlistSuccessPrompt = (): void => {
  waitlistSuccessAlternativeReminderOptIn.value = alternativePrReminderOptIn.value;
  showWaitlistSuccessPrompt.value = true;
};

const finalizeWaitlist = async (): Promise<void> => {
  if (waitlistActionPending.value || waitlistMutation.isPending.value) {
    return;
  }

  waitlistActionPending.value = true;
  waitlistActionError.value = null;
  try {
    await waitlistMutation.mutateAsync({
      id: props.pr.id,
      alternativePrReminderOptIn: alternativePrReminderOptIn.value,
    });
    waitlisted.value = true;
    trackWaitlistResult({ actionResult: "success" });
    closeWaitlistGateModal();
    openWaitlistSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      trackWaitlistResult({
        actionResult: "blocked",
        failureCode: PR_JOIN_GATE_UNRESOLVED_CODE,
        failureReason: resolveErrorMessage(error),
      });
      showWaitlistGateModal.value = true;
      return;
    }
    trackWaitlistResult({
      ...resolveTelemetryFailurePayload(error, "PR_WAITLIST_FAILED", resolveErrorMessage(error)),
    });
    setWaitlistActionError(resolveErrorMessage(error));
  } finally {
    waitlistActionPending.value = false;
  }
};

const openWaitlistGateModal = (): void => {
  if (openDisabled.value || flowPending.value) return;
  waitlistActionError.value = null;
  showWaitlistGateModal.value = true;
};

const handleWaitlistAction = (): void => {
  if (flowPending.value || openDisabled.value) return;
  trackPRPrimaryActionClick(props.pr, "WAITLIST");
  void openWaitlistGateModal();
};

const requestCancelWaitlistWithConfirm = (): void => {
  cancelWaitlistActionError.value = null;
  if (!showCancelWaitlistAction.value) return;
  showCancelWaitlistConfirmModal.value = true;
};

const confirmCancelWaitlist = async (): Promise<void> => {
  cancelWaitlistActionError.value = null;
  try {
    await cancelWaitlistMutation.mutateAsync({ id: props.pr.id });
    showCancelWaitlistConfirmModal.value = false;
  } catch (error) {
    cancelWaitlistActionError.value =
      error instanceof Error ? error.message : t("errors.cancelWaitlistFailed");
  }
};

const replayWaitlist = (): Promise<void> => {
  if (viewer.value.isParticipant || viewer.value.isWaitlisted) {
    return Promise.resolve();
  }
  if (!viewer.value.canWaitlist) {
    return Promise.resolve();
  }
  openWaitlistGateModal();
  return Promise.resolve();
};

const pendingReplayReady = computed(
  () => showWaitlistAction.value && !flowPending.value && !openDisabled.value,
);

useRegisterPRPendingReplayHandler("PR_WAITLIST", {
  ready: pendingReplayReady,
  replay: replayWaitlist,
});

watch(
  () => props.pr.id,
  () => {
    waitlisted.value = false;
    alternativePrReminderOptIn.value = false;
    waitlistSuccessAlternativeReminderOptIn.value = false;
    closeWaitlistGateModal();
    showWaitlistSuccessPrompt.value = false;
  },
);

watch(
  () => viewer.value.isWaitlisted,
  (isWaitlisted) => {
    if (isWaitlisted === false) {
      waitlisted.value = false;
    }
  },
);

defineExpose({
  replayWaitlist,
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

.action-group__button {
  max-width: 100%;
}

.alternative-reminder-option {
  display: flex;
  align-items: flex-start;
  gap: var(--sys-spacing-xsmall);
  margin-bottom: var(--sys-spacing-medium);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.alternative-reminder-option__control {
  flex: 0 0 auto;
  margin-top: 0.125rem;
}

.alternative-reminder-option__text {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
}

.action-error {
  margin: 0;
  @include mx.pu-font(support);
  color: var(--sys-color-error);
}
</style>
