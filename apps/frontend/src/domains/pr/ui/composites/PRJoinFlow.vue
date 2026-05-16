<template>
  <slot
    :open="open"
    :close="closeJoinFlowModal"
    :pending="flowPending"
    :disabled="openDisabled"
    :joined="joined"
    :error-message="joinFlowError"
  />

  <Modal
    :open="showJoinFlowModal"
    max-width="420px"
    title="加入活动"
    @close="closeJoinFlowModal"
  >
    <PRJoinGates
      :pr-id="props.prId"
      :enabled="showJoinFlowModal"
      :pending="flowPending"
      :error="joinFlowError"
      :fallback-confirm-gate="PRJoinFallbackConfirmGate"
      @cancel="closeJoinFlowModal"
      @completed="finalizeJoinFlow"
      @error="emitFlowError"
      @resolved="applyAuthPayloadFromResult"
    />
  </Modal>

  <Modal :open="showJoinSubscriptionModal" @close="closeJoinSuccessPrompt">
    <div class="join-success-modal">
      <template v-if="joinSuccessPromptStep === 'SUBSCRIPTIONS'">
        <section
          class="join-success-modal__subscriptions"
          data-testid="pr-detail.join-success.subscriptions"
          aria-labelledby="join-success-subscriptions-title"
        >
          <div class="join-success-modal__subscriptions-heading">
            <h2
              id="join-success-subscriptions-title"
              class="join-success-modal__subscriptions-title"
            >
              {{ t("prPage.notificationSubscriptions.title") }}
            </h2>
            <p class="join-success-modal__subscriptions-description">
              {{ t("prPage.joinSuccessSubscriptions.description") }}
            </p>
          </div>

          <APRNotificationSubscriptions
            :visible-kinds="joinSuccessNotificationKinds"
            :description-prefixes="joinSuccessNotificationDescriptionPrefixes"
            :updating-label="t('prPage.wechatReminder.updating')"
            outline-profile="surface"
          />
        </section>

        <Button
          tone="surface"
          block
          data-testid="pr-detail.join-success.done"
          @click="handleJoinSuccessSubscriptionDone"
        >
          {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
        </Button>
      </template>

      <template v-else>
        <PRJoinCommunityFollowupPanel
          :event-title="joinSuccessEventTitle"
          :beta-group-qr-code="joinSuccessBetaGroupQrCode"
          :show-official-account="communityFollowupShowsOfficialAccount"
        />
        <div class="join-success-modal__actions">
          <Button
            type="button"
            block
            data-testid="pr-detail.join-success.community-followup.done"
            @click="handleJoinCommunityFollowupDone"
          >
            {{ t("prPage.joinCommunityFollowup.closeAction") }}
          </Button>
        </div>
      </template>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import Modal from "@/shared/ui/overlay/Modal.vue";
import { useBodyScrollLock } from "@/shared/ui/overlay/useBodyScrollLock";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { useJoinSuccessNotificationPrompt } from "@/domains/notification/use-cases/useJoinSuccessNotificationPrompt";
import { useJoinPR } from "@/domains/pr/queries/usePRActions";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import PRJoinCommunityFollowupPanel from "@/domains/pr/ui/composites/PRJoinCommunityFollowupPanel.vue";
import PRJoinGates from "@/domains/pr/ui/composites/PRJoinGates.vue";
import PRJoinFallbackConfirmGate from "@/domains/pr/ui/gates/PRJoinFallbackConfirmGate.vue";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";
import type { ApiError } from "@/shared/api/error";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type JoinSuccessPromptStep = "SUBSCRIPTIONS" | "COMMUNITY_FOLLOWUP";
type PRJoinEntrySurface =
  | "pr_detail"
  | "form_mode_matched"
  | "form_mode_candidate";

export type PRJoinFlowSlotProps = {
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
    confirmationReminderSupported?: boolean | null;
    viewerIsParticipant?: boolean | null;
    showSuccessPrompt?: boolean;
    writeJoinEntryOnAuth?: boolean;
    eventId?: number | null;
    entrySurface?: PRJoinEntrySurface | null;
    candidateRank?: number | null;
  }>(),
  {
    disabled: false,
    scenarioType: null,
    confirmationDeadlineAt: null,
    confirmationReminderSupported: null,
    viewerIsParticipant: null,
    showSuccessPrompt: true,
    writeJoinEntryOnAuth: false,
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
  default(props: PRJoinFlowSlotProps): unknown;
}>();

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const JOIN_SUCCESS_NOTIFICATION_KINDS = [
  "REMINDER_CONFIRMATION",
  "NEW_PARTNER",
  "MEETING_POINT_UPDATED",
] as const satisfies readonly WeChatNotificationKind[];

const showJoinFlowModal = ref(false);
const joinFlowPending = ref(false);
const joinFlowError = ref<string | null>(null);
const joined = ref(false);
const joinSuccessPromptStep = ref<JoinSuccessPromptStep>("SUBSCRIPTIONS");
const successPromptOpenForJoin = ref(false);
const communityFollowupShowsOfficialAccount = ref(false);

const joinMutation = useJoinPR();
const prDetailId = computed(() => props.prId);
const { data: prDetailForPrompt } = usePRDetail(prDetailId);
const {
  isOpen: showJoinSubscriptionModal,
  open: openJoinSuccessNotificationPrompt,
  close: closeJoinSuccessNotificationPrompt,
} = useJoinSuccessNotificationPrompt();
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("pr_join_result");

const confirmationDeadlineText = computed(() => {
  const deadline =
    props.confirmationDeadlineAt?.trim() ||
    prDetailForPrompt.value?.partnerSection.timeline?.confirmationEndAt?.trim() ||
    "";
  if (deadline.length === 0) {
    return null;
  }
  return formatLocalDateTimeValue(deadline) ?? deadline;
});
const confirmationReminderSupported = computed(() => {
  if (props.confirmationReminderSupported !== null) {
    return props.confirmationReminderSupported;
  }
  return prDetailForPrompt.value?.partnerSection.confirmation.enabled ?? true;
});
const joinSuccessBetaGroupQrCode = computed(() => {
  const qrCode =
    prDetailForPrompt.value?.anchorEventContext?.betaGroupQrCode?.trim() ?? "";
  return qrCode.length > 0 ? qrCode : null;
});
const joinSuccessEventTitle = computed(
  () =>
    prDetailForPrompt.value?.anchorEventContext?.title ??
    prDetailForPrompt.value?.core.type ??
    "",
);
const joinSuccessNotificationKinds = computed<readonly WeChatNotificationKind[]>(
  () =>
    confirmationReminderSupported.value
      ? JOIN_SUCCESS_NOTIFICATION_KINDS
      : JOIN_SUCCESS_NOTIFICATION_KINDS.filter(
          (kind) => kind !== "REMINDER_CONFIRMATION",
        ),
);
const joinSuccessNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  REMINDER_CONFIRMATION: confirmationDeadlineText.value
    ? t(
        "prPage.joinSuccessSubscriptions.notificationReasons.REMINDER_CONFIRMATION.withDeadline",
        { deadline: confirmationDeadlineText.value },
      )
    : t(
        "prPage.joinSuccessSubscriptions.notificationReasons.REMINDER_CONFIRMATION.fallback",
      ),
  NEW_PARTNER: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.NEW_PARTNER",
  ),
  MEETING_POINT_UPDATED: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.MEETING_POINT_UPDATED",
  ),
}));
const flowPending = computed(
  () => joinFlowPending.value || joinMutation.isPending.value,
);
const openDisabled = computed(
  () => props.disabled || props.prId === null || joined.value,
);

useBodyScrollLock(
  computed(() => showJoinSubscriptionModal.value || showJoinFlowModal.value),
);

const readAuthPayload = (result: unknown): AuthSessionPayload | null => {
  if (typeof result !== "object" || result === null) {
    return null;
  }
  return (result as { auth?: AuthSessionPayload | null }).auth ?? null;
};

const applyAuthPayloadFromResult = async (result: unknown): Promise<void> => {
  const authPayload = readAuthPayload(result);
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }
  if (authPayload && props.writeJoinEntryOnAuth) {
    await router.replace({
      query: {
        ...route.query,
        entry: "join",
      },
    });
  }
};

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
  correlationId?: string;
}): void => {
  const prId = props.prId;
  if (prId === null) {
    return;
  }

  trackEvent("pr_join_result", {
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
      commitmentType: "join",
      entrySurface: props.entrySurface ?? "pr_detail",
      candidateRank: props.candidateRank ?? undefined,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
      correlationId: payload.correlationId,
    });
  }
};

const closeJoinFlowModal = (): void => {
  showJoinFlowModal.value = false;
  joinFlowPending.value = false;
  joinFlowError.value = null;
};

const finishSuccessPrompt = (): void => {
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  communityFollowupShowsOfficialAccount.value = false;
  closeJoinSuccessNotificationPrompt();
  if (successPromptOpenForJoin.value) {
    successPromptOpenForJoin.value = false;
    emit("success-closed");
  }
};

const closeJoinSuccessPrompt = (): void => {
  if (
    joinSuccessPromptStep.value === "COMMUNITY_FOLLOWUP" &&
    communityFollowupShowsOfficialAccount.value
  ) {
    officialAccountFollowPrompt.dismissPrompt();
  }
  finishSuccessPrompt();
};

const handleJoinSuccessSubscriptionDone = (): void => {
  const shouldShowOfficialAccount = officialAccountFollowPrompt.canPromptNow();
  const shouldShowBetaGroup = joinSuccessBetaGroupQrCode.value !== null;

  if (shouldShowOfficialAccount || shouldShowBetaGroup) {
    communityFollowupShowsOfficialAccount.value = shouldShowOfficialAccount;
    if (shouldShowOfficialAccount) {
      officialAccountFollowPrompt.markPromptPresented();
    }
    joinSuccessPromptStep.value = "COMMUNITY_FOLLOWUP";
    return;
  }

  finishSuccessPrompt();
};

const handleJoinCommunityFollowupDone = (): void => {
  if (communityFollowupShowsOfficialAccount.value) {
    officialAccountFollowPrompt.markPromptCompleted();
  }
  finishSuccessPrompt();
};

const openSuccessPrompt = (): void => {
  if (!props.showSuccessPrompt) {
    emit("success-closed");
    return;
  }
  successPromptOpenForJoin.value = true;
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  communityFollowupShowsOfficialAccount.value = false;
  openJoinSuccessNotificationPrompt();
};

const finalizeJoinFlow = async (): Promise<void> => {
  const prId = props.prId;
  if (prId === null || joinFlowPending.value || joinMutation.isPending.value) {
    return;
  }

  joinFlowPending.value = true;
  joinFlowError.value = null;
  const correlationId = createCommandCorrelationId();
  try {
    const result = await joinMutation.mutateAsync({ id: prId, correlationId });
    await applyAuthPayloadFromResult(result);
    joined.value = true;
    trackJoinResult({ actionResult: "success", correlationId });
    emit("joined", result);
    closeJoinFlowModal();
    openSuccessPrompt();
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      trackJoinResult({
        actionResult: "blocked",
        failureCode: PR_JOIN_GATE_UNRESOLVED_CODE,
        failureReason: resolveErrorMessage(error),
        correlationId,
      });
      showJoinFlowModal.value = true;
      return;
    }
    trackJoinResult({
      ...resolveTelemetryFailurePayload(
        error,
        "PR_JOIN_FAILED",
        resolveErrorMessage(error),
      ),
      correlationId,
    });
    emitFlowError(resolveErrorMessage(error));
  } finally {
    joinFlowPending.value = false;
  }
};

const open = async (): Promise<void> => {
  if (openDisabled.value || flowPending.value) return;
  joinFlowError.value = null;
  showJoinFlowModal.value = true;
};

watch(
  () => props.prId,
  () => {
    joined.value = false;
    closeJoinFlowModal();
    finishSuccessPrompt();
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
  close: closeJoinFlowModal,
});
</script>

<style lang="scss" scoped>
.join-success-modal {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-modal__subscriptions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-modal__subscriptions-heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.join-success-modal__subscriptions-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.join-success-modal__subscriptions-description {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.join-success-modal__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.join-success-modal__actions > button {
  flex: 1 1 180px;
}
</style>
