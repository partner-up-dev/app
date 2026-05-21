<template>
  <template v-if="$slots.trigger">
    <slot
      name="trigger"
      :open="open"
      :close="closeJoinGateModal"
      :pending="flowPending"
      :disabled="openDisabled"
      :joined="joined"
      :error-message="joinFlowError"
    />
  </template>

  <section
    v-else-if="showActionArea"
    class="contextual-area"
    data-region="join-action"
    data-testid="pr-detail.join-action"
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

    <div v-if="showJoinAction" class="primary-action">
      <Button
        class="primary-action__button"
        tone="primary"
        :disabled="openDisabled"
        :loading="flowPending"
        block
        data-testid="pr-detail.join.open"
        @click="handleDefaultJoinAction"
      >
        {{
          joined
            ? t("prPage.partnerSection.rosterJoined")
            : flowPending
              ? t("prPage.joining")
              : t("prPage.join")
        }}
      </Button>
      <p v-if="joinFlowError" class="action-error">
        {{ joinFlowError }}
      </p>
    </div>
  </section>

  <Modal
    :open="showJoinGateModal"
    max-width="420px"
    title="加入活动"
    @close="closeJoinGateModal"
  >
    <PRJoinGates
      :pr-id="resolvedPrId"
      :enabled="showJoinGateModal"
      :pending="flowPending"
      :error="joinFlowError"
      :fallback-confirm-gate="PRJoinFallbackConfirmGate"
      @cancel="closeJoinGateModal"
      @completed="finalizeJoin"
      @error="emitFlowError"
    />
  </Modal>

  <Modal :open="showJoinSuccessPrompt" @close="closeJoinSuccessPrompt">
    <PRJoinSuccessPrompt
      ref="joinSuccessPromptRef"
      :pr-id="resolvedPrId"
      :open="showJoinSuccessPrompt"
      @done="handleJoinSuccessPromptDone"
    />
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRJoinEntrySurface } from "@/domains/pr/model/pr-join-entry-context";
import Button from "@/shared/ui/actions/Button.vue";
import InlineNotice from "@/shared/ui/feedback/InlineNotice.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import { useJoinPR } from "@/domains/pr/queries/usePRActions";
import PRJoinGates from "@/domains/pr/ui/composites/PRJoinGates.vue";
import PRJoinSuccessPrompt from "@/domains/pr/ui/composites/PRJoinSuccessPrompt.vue";
import PRJoinFallbackConfirmGate from "@/domains/pr/ui/gates/PRJoinFallbackConfirmGate.vue";
import { usePRActionCopy } from "@/domains/pr/use-cases/usePRActionCopy";
import {
  trackPRPrimaryActionClick,
  usePRPrimaryActionImpression,
} from "@/domains/pr/use-cases/usePRPrimaryActionTelemetry";
import { useRegisterPRPendingReplayHandler } from "@/domains/pr/use-cases/usePRPendingWeChatReplay";
import type { ApiError } from "@/shared/api/error";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";

type JoinSuccessPromptExpose = {
  close: () => void;
};

const props = withDefaults(
  defineProps<{
    pr?: PRDetailView | null;
    prId?: PRId | null;
    disabled?: boolean;
    scenarioType?: string | null;
    viewerIsParticipant?: boolean | null;
    showSuccessPrompt?: boolean;
    eventId?: number | null;
    entrySurface?: PRJoinEntrySurface | null;
    candidateRank?: number | null;
  }>(),
  {
    pr: null,
    prId: null,
    disabled: false,
    scenarioType: null,
    viewerIsParticipant: null,
    showSuccessPrompt: true,
    eventId: null,
    entrySurface: null,
    candidateRank: null,
  },
);

const emit = defineEmits<{
  joined: [result: unknown];
  "success-closed": [];
  error: [message: string];
}>();

defineSlots<{
  trigger(props: {
    open: () => Promise<void>;
    close: () => void;
    pending: boolean;
    disabled: boolean;
    joined: boolean;
    errorMessage: string | null;
  }): unknown;
}>();

const { t } = useI18n();
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const resolvedPr = computed(() => props.pr);
const resolvedPrId = computed(() => props.pr?.id ?? props.prId ?? null);
const resolvedScenarioType = computed(
  () => props.scenarioType ?? props.pr?.core.type ?? null,
);
const viewer = computed(() => props.pr?.partnerSection.viewer ?? null);
const joinSuccessPromptRef = ref<JoinSuccessPromptExpose | null>(null);
const showJoinGateModal = ref(false);
const showJoinSuccessPrompt = ref(false);
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const joined = ref(false);
const joinMutation = useJoinPR();
const { releaseNoticeText, blockedReasonText } = usePRActionCopy(
  computed(() => props.pr as PRDetailView),
);

const flowPending = computed(
  () => joinFlowPending.value || joinMutation.isPending.value,
);
const openDisabled = computed(
  () => props.disabled || resolvedPrId.value === null || joined.value,
);
const showJoinAction = computed(() => {
  const detailViewer = viewer.value;
  return Boolean(
    detailViewer &&
      !detailViewer.isCreator &&
      !detailViewer.isParticipant &&
      !detailViewer.isWaitlisted &&
      detailViewer.canJoin &&
      !detailViewer.canWaitlist,
  );
});
const joinBlockedMessage = computed(() => {
  const detailViewer = viewer.value;
  if (
    !detailViewer ||
    detailViewer.isParticipant ||
    detailViewer.isWaitlisted ||
    detailViewer.canJoin ||
    detailViewer.canWaitlist ||
    detailViewer.joinBlockedReason === "FULL"
  ) {
    return null;
  }
  return blockedReasonText(detailViewer.joinBlockedReason);
});
const showActionArea = computed(() =>
  Boolean(
    resolvedPr.value &&
      (releaseNoticeText.value || joinBlockedMessage.value || showJoinAction.value),
  ),
);

if (props.pr) {
  usePRPrimaryActionImpression({
    pr: computed(() => props.pr as PRDetailView),
    ctaType: computed(() => (showJoinAction.value ? "JOIN" : null)),
    visible: showJoinAction,
  });
}

useBodyScrollLock(
  computed(() => showJoinSuccessPrompt.value || showJoinGateModal.value),
);

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const emitFlowError = (message: string): void => {
  joinFlowError.value = message;
  emit("error", message);
};

const trackJoinResult = (payload: {
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
}): void => {
  const prId = resolvedPrId.value;
  if (prId === null) {
    return;
  }

  trackEvent("pr_join_result", {
    prId,
    scenarioType: resolvedScenarioType.value ?? undefined,
    eventId: props.eventId ?? undefined,
    entrySurface: props.entrySurface ?? undefined,
    candidateRank: props.candidateRank ?? undefined,
    ...payload,
  });
  if (props.eventId !== null) {
    trackEvent("pr_commitment_result", {
      eventId: props.eventId,
      activityType: resolvedScenarioType.value ?? undefined,
      prId,
      commitmentType: "join",
      entrySurface: props.entrySurface ?? "pr_detail",
      candidateRank: props.candidateRank ?? undefined,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
    });
  }
};

const closeJoinGateModal = (): void => {
  showJoinGateModal.value = false;
  joinFlowPending.value = false;
  joinFlowError.value = null;
};

const handleJoinSuccessPromptDone = (): void => {
  if (!showJoinSuccessPrompt.value) return;
  showJoinSuccessPrompt.value = false;
  emit("success-closed");
};

const closeJoinSuccessPrompt = (): void => {
  joinSuccessPromptRef.value?.close();
  if (!joinSuccessPromptRef.value) {
    handleJoinSuccessPromptDone();
  }
};

const openSuccessPrompt = (): void => {
  if (!props.showSuccessPrompt) {
    emit("success-closed");
    return;
  }
  showJoinSuccessPrompt.value = true;
};

const finalizeJoin = async (): Promise<void> => {
  const prId = resolvedPrId.value;
  if (prId === null || joinFlowPending.value || joinMutation.isPending.value) {
    return;
  }

  joinFlowPending.value = true;
  joinFlowError.value = null;
  try {
    const result = await joinMutation.mutateAsync({ id: prId });
    joined.value = true;
    trackJoinResult({ actionResult: "success" });
    emit("joined", result);
    closeJoinGateModal();
    openSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      trackJoinResult({
        actionResult: "blocked",
        failureCode: PR_JOIN_GATE_UNRESOLVED_CODE,
        failureReason: resolveErrorMessage(error),
      });
      showJoinGateModal.value = true;
      return;
    }
    trackJoinResult({
      ...resolveTelemetryFailurePayload(
        error,
        "PR_JOIN_FAILED",
        resolveErrorMessage(error),
      ),
    });
    emitFlowError(resolveErrorMessage(error));
  } finally {
    joinFlowPending.value = false;
  }
};

const open = async (): Promise<void> => {
  if (openDisabled.value || flowPending.value) return;
  joinFlowError.value = null;
  showJoinGateModal.value = true;
};

const handleDefaultJoinAction = (): void => {
  if (flowPending.value || openDisabled.value) return;
  if (props.pr) {
    trackPRPrimaryActionClick(props.pr, "JOIN");
  }
  void open();
};

const replayJoin = async (): Promise<void> => {
  const detailViewer = viewer.value;
  if (detailViewer) {
    if (detailViewer.isParticipant || !detailViewer.canJoin) return;
  }
  await open();
};

const pendingReplayReady = computed(() => {
  const detailViewer = viewer.value;
  if (detailViewer) {
    return (
      detailViewer.canJoin &&
      !detailViewer.isParticipant &&
      !flowPending.value &&
      !openDisabled.value
    );
  }
  return !flowPending.value && !openDisabled.value;
});

useRegisterPRPendingReplayHandler("PR_JOIN", {
  ready: pendingReplayReady,
  replay: replayJoin,
});

watch(
  resolvedPrId,
  () => {
    joined.value = false;
    closeJoinGateModal();
    showJoinSuccessPrompt.value = false;
  },
);

watch(
  () => props.viewerIsParticipant ?? viewer.value?.isParticipant ?? null,
  (isParticipant) => {
    if (isParticipant === false) {
      joined.value = false;
    }
  },
);

defineExpose({
  open,
  close: closeJoinGateModal,
  replayJoin,
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

.action-error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
