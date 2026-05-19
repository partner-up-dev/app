<template>
  <slot
    :open="open"
    :close="closeWaitlistFlowModal"
    :pending="flowPending"
    :disabled="openDisabled"
    :joined="joined"
    :error-message="waitlistFlowError"
  />

  <Modal
    :open="showWaitlistFlowModal"
    max-width="420px"
    title="提交候补"
    @close="closeWaitlistFlowModal"
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
      :pr-id="props.prId"
      :enabled="showWaitlistFlowModal"
      :pending="flowPending"
      :error="waitlistFlowError"
      :fallback-confirm-gate="PRWaitlistFallbackConfirmGate"
      @cancel="closeWaitlistFlowModal"
      @completed="finalizeWaitlistFlow"
      @error="emitFlowError"
    />
  </Modal>

  <Modal :open="showWaitlistSubscriptionModal" @close="closeWaitlistPrompt">
    <div class="waitlist-success-modal">
      <template v-if="waitlistPromptStep === 'SUBSCRIPTIONS'">
        <p
          class="waitlist-success-modal__text"
          data-testid="pr-detail.waitlist-success.subscriptions"
        >
          {{ t("prPage.waitlistSuccessSubscriptions.description") }}
        </p>

        <WeChatNotificationSubscriptionsCard
          :title="t('prPage.notificationSubscriptions.title')"
        >
          <APRNotificationSubscriptions
            :visible-kinds="waitlistSuccessNotificationKinds"
            :description-prefixes="waitlistNotificationDescriptionPrefixes"
            :updating-label="t('prPage.wechatReminder.updating')"
            outline-profile="surface"
          />
        </WeChatNotificationSubscriptionsCard>

        <Button
          tone="surface"
          block
          data-testid="pr-detail.waitlist-success.done"
          @click="handleWaitlistSubscriptionDone"
        >
          {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
        </Button>
      </template>

      <template v-else>
        <OfficialAccountFollowPanel />
        <div class="waitlist-success-modal__actions">
          <Button
            tone="surface"
            type="button"
            @click="handleCloseWaitlistOfficialAccountPrompt"
          >
            {{ t("officialAccountFollow.laterAction") }}
          </Button>
          <Button type="button" @click="handleWaitlistOfficialAccountDone">
            {{ t("officialAccountFollow.doneAction") }}
          </Button>
        </div>
      </template>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { useJoinSuccessNotificationPrompt } from "@/domains/notification/use-cases/useJoinSuccessNotificationPrompt";
import { useWaitlistPR } from "@/domains/pr/queries/usePRActions";
import PRJoinGates from "@/domains/pr/ui/composites/PRJoinGates.vue";
import PRWaitlistFallbackConfirmGate from "@/domains/pr/ui/gates/PRWaitlistFallbackConfirmGate.vue";
import type { ApiError } from "@/shared/api/error";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";

type WaitlistPromptStep = "SUBSCRIPTIONS" | "OFFICIAL_ACCOUNT";
type PRWaitlistEntrySurface =
  | "pr_detail"
  | "form_mode_matched"
  | "form_mode_candidate";

export type PRWaitlistFlowSlotProps = {
  open: () => Promise<void>;
  close: () => void;
  pending: boolean;
  disabled: boolean;
  joined: boolean;
  errorMessage: string | null;
};

const props = withDefaults(
  defineProps<{
    prId: PRId | null;
    disabled?: boolean;
    scenarioType?: string | null;
    confirmationDeadlineAt?: string | null;
    viewerIsParticipant?: boolean | null;
    showSuccessPrompt?: boolean;
    eventId?: number | null;
    entrySurface?: PRWaitlistEntrySurface | null;
    candidateRank?: number | null;
  }>(),
  {
    disabled: false,
    scenarioType: null,
    confirmationDeadlineAt: null,
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
  default(props: PRWaitlistFlowSlotProps): unknown;
}>();

const { t } = useI18n();
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const showWaitlistFlowModal = ref(false);
const waitlistFlowPending = ref(false);
const waitlistFlowError = ref<string | null>(null);
const joined = ref(false);
const alternativePrReminderOptIn = ref(false);
const waitlistPromptStep = ref<WaitlistPromptStep>("SUBSCRIPTIONS");
const successPromptOpenForWaitlist = ref(false);

const waitlistMutation = useWaitlistPR();
const {
  isOpen: showWaitlistSubscriptionModal,
  open: openWaitlistNotificationPrompt,
  close: closeWaitlistNotificationPrompt,
} = useJoinSuccessNotificationPrompt();
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("pr_waitlist_result");

const waitlistNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  WAITLIST_PROMOTED: t(
    "prPage.waitlistSuccessSubscriptions.notificationReasons.WAITLIST_PROMOTED",
  ),
  WAITLIST_ALTERNATIVE_AVAILABLE: t(
    "prPage.waitlistSuccessSubscriptions.notificationReasons.WAITLIST_ALTERNATIVE_AVAILABLE",
  ),
}));
const waitlistSuccessNotificationKinds = computed<WeChatNotificationKind[]>(
  () =>
    alternativePrReminderOptIn.value
      ? ["WAITLIST_PROMOTED", "WAITLIST_ALTERNATIVE_AVAILABLE"]
      : ["WAITLIST_PROMOTED"],
);
const flowPending = computed(
  () => waitlistFlowPending.value || waitlistMutation.isPending.value,
);
const openDisabled = computed(
  () => props.disabled || props.prId === null || joined.value,
);

useBodyScrollLock(
  computed(
    () => showWaitlistSubscriptionModal.value || showWaitlistFlowModal.value,
  ),
);

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : t("common.operationFailed");

const emitFlowError = (message: string): void => {
  waitlistFlowError.value = message;
  emit("error", message);
};

const trackWaitlistResult = (payload: {
  actionResult: "success" | "failure" | "blocked";
  failureCode?: string;
  failureReason?: string;
  correlationId?: string;
}): void => {
  const prId = props.prId;
  if (prId === null) {
    return;
  }

  trackEvent("pr_waitlist_result", {
    prId,
    scenarioType: props.scenarioType ?? undefined,
    eventId: props.eventId ?? undefined,
    entrySurface: props.entrySurface ?? undefined,
    candidateRank: props.candidateRank ?? undefined,
    correlationId: payload.correlationId,
    ...payload,
  });
  if (props.eventId !== null) {
    trackEvent("pr_commitment_result", {
      eventId: props.eventId,
      activityType: props.scenarioType ?? undefined,
      prId,
      commitmentType: "waitlist",
      entrySurface: props.entrySurface ?? "pr_detail",
      candidateRank: props.candidateRank ?? undefined,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
      correlationId: payload.correlationId,
    });
  }
};

const closeWaitlistFlowModal = (): void => {
  showWaitlistFlowModal.value = false;
  waitlistFlowPending.value = false;
  waitlistFlowError.value = null;
};

const finishWaitlistPrompt = (): void => {
  waitlistPromptStep.value = "SUBSCRIPTIONS";
  closeWaitlistNotificationPrompt();
  if (successPromptOpenForWaitlist.value) {
    successPromptOpenForWaitlist.value = false;
    emit("success-closed");
  }
};

const closeWaitlistPrompt = (): void => {
  if (waitlistPromptStep.value === "OFFICIAL_ACCOUNT") {
    officialAccountFollowPrompt.dismissPrompt();
  }
  finishWaitlistPrompt();
};

const handleWaitlistSubscriptionDone = (): void => {
  if (officialAccountFollowPrompt.canPromptNow()) {
    officialAccountFollowPrompt.markPromptPresented();
    waitlistPromptStep.value = "OFFICIAL_ACCOUNT";
    return;
  }
  finishWaitlistPrompt();
};

const handleCloseWaitlistOfficialAccountPrompt = (): void => {
  officialAccountFollowPrompt.dismissPrompt();
  finishWaitlistPrompt();
};

const handleWaitlistOfficialAccountDone = (): void => {
  officialAccountFollowPrompt.markPromptCompleted();
  finishWaitlistPrompt();
};

const openSuccessPrompt = (): void => {
  if (!props.showSuccessPrompt) {
    emit("success-closed");
    return;
  }
  successPromptOpenForWaitlist.value = true;
  waitlistPromptStep.value = "SUBSCRIPTIONS";
  openWaitlistNotificationPrompt();
};

const finalizeWaitlistFlow = async (): Promise<void> => {
  const prId = props.prId;
  if (
    prId === null ||
    waitlistFlowPending.value ||
    waitlistMutation.isPending.value
  ) {
    return;
  }

  waitlistFlowPending.value = true;
  waitlistFlowError.value = null;
  const correlationId = createCommandCorrelationId();
  try {
    const result = await waitlistMutation.mutateAsync({
      id: prId,
      alternativePrReminderOptIn: alternativePrReminderOptIn.value,
      correlationId,
    });
    joined.value = true;
    trackWaitlistResult({ actionResult: "success", correlationId });
    emit("joined", result);
    closeWaitlistFlowModal();
    openSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      trackWaitlistResult({
        actionResult: "blocked",
        failureCode: PR_JOIN_GATE_UNRESOLVED_CODE,
        failureReason: resolveErrorMessage(error),
        correlationId,
      });
      showWaitlistFlowModal.value = true;
      return;
    }
    trackWaitlistResult({
      ...resolveTelemetryFailurePayload(
        error,
        "PR_WAITLIST_FAILED",
        resolveErrorMessage(error),
      ),
      correlationId,
    });
    emitFlowError(resolveErrorMessage(error));
  } finally {
    waitlistFlowPending.value = false;
  }
};

const open = async (): Promise<void> => {
  if (openDisabled.value || flowPending.value) return;
  waitlistFlowError.value = null;
  showWaitlistFlowModal.value = true;
};

watch(
  () => props.prId,
  () => {
    joined.value = false;
    alternativePrReminderOptIn.value = false;
    closeWaitlistFlowModal();
    finishWaitlistPrompt();
  },
);

watch(
  () => props.viewerIsParticipant,
  (isParticipant) => {
    if (isParticipant === false) {
      joined.value = false;
    }
  },
);

defineExpose({
  open,
  close: closeWaitlistFlowModal,
});
</script>

<style lang="scss" scoped>
.waitlist-success-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.waitlist-success-modal__text {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.waitlist-success-modal__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.waitlist-success-modal__actions > button {
  flex: 1 1 180px;
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
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}
</style>
