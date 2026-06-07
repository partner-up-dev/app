<template>
  <div class="join-success-prompt">
    <template v-if="joinSuccessPromptStep === 'CONFIRMATION_FOLLOWUP'">
      <PRJoinConfirmationFollowupPanel
        :confirmation-window-text="confirmationWindowText"
      />

      <Button
        tone="surface"
        block
        data-testid="pr-detail.join-success.confirmation-followup.done"
        @click="handleJoinConfirmationFollowupDone"
      >
        {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
      </Button>
    </template>

    <template v-else-if="joinSuccessPromptStep === 'SUBSCRIPTIONS'">
      <section
        class="join-success-prompt__subscriptions"
        data-testid="pr-detail.join-success.subscriptions"
        aria-labelledby="join-success-subscriptions-title"
      >
        <div class="join-success-prompt__subscriptions-heading">
          <h2
            id="join-success-subscriptions-title"
            class="join-success-prompt__subscriptions-title"
          >
            {{ t("prPage.notificationSubscriptions.title") }}
          </h2>
          <p class="join-success-prompt__subscriptions-description">
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
      <div class="join-success-prompt__actions">
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import PRJoinConfirmationFollowupPanel from "@/domains/pr/ui/composites/PRJoinConfirmationFollowupPanel.vue";
import PRJoinCommunityFollowupPanel from "@/domains/pr/ui/composites/PRJoinCommunityFollowupPanel.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type JoinSuccessPromptStep =
  | "CONFIRMATION_FOLLOWUP"
  | "SUBSCRIPTIONS"
  | "COMMUNITY_FOLLOWUP";

const props = defineProps<{
  prId: PRId | null;
  open: boolean;
}>();

const emit = defineEmits<{
  done: [];
}>();

const { t } = useI18n();
const JOIN_SUCCESS_NOTIFICATION_KINDS = [
  "NEW_PARTNER",
  "PR_READY",
  "MEETING_POINT_UPDATED",
] as const satisfies readonly WeChatNotificationKind[];

const joinSuccessPromptStep = ref<JoinSuccessPromptStep>("SUBSCRIPTIONS");
const communityFollowupShowsOfficialAccount = ref(false);
const prDetailId = computed(() => (props.open ? props.prId : null));
const { data: prDetailForPrompt } = usePRDetail(prDetailId);
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("pr_join_result");

const confirmationWindowText = computed(() => {
  const start =
    prDetailForPrompt.value?.partnerSection.timeline?.confirmationStartAt?.trim() ??
    "";
  const end =
    prDetailForPrompt.value?.partnerSection.timeline?.confirmationEndAt?.trim() ??
    "";
  const startText =
    start.length > 0 ? (formatLocalDateTimeValue(start) ?? start) : null;
  const endText =
    end.length > 0 ? (formatLocalDateTimeValue(end) ?? end) : null;

  if (startText && endText) {
    return t("prPage.joinConfirmationFollowup.windowRange", {
      start: startText,
      end: endText,
    });
  }
  if (endText) {
    return t("prPage.joinConfirmationFollowup.windowDeadline", {
      deadline: endText,
    });
  }
  return null;
});
const confirmationReminderSupported = computed(
  () => prDetailForPrompt.value?.partnerSection.confirmation.enabled ?? true,
);
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
  () => JOIN_SUCCESS_NOTIFICATION_KINDS,
);
const joinSuccessNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  NEW_PARTNER: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.NEW_PARTNER",
  ),
  PR_READY: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.PR_READY",
  ),
  MEETING_POINT_UPDATED: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.MEETING_POINT_UPDATED",
  ),
}));

const resolveInitialJoinSuccessPromptStep = (): JoinSuccessPromptStep =>
  confirmationReminderSupported.value
    ? "CONFIRMATION_FOLLOWUP"
    : "SUBSCRIPTIONS";

const resetPrompt = (): void => {
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  communityFollowupShowsOfficialAccount.value = false;
};

const finishSuccessPrompt = (): void => {
  resetPrompt();
  emit("done");
};

const close = (): void => {
  if (
    joinSuccessPromptStep.value === "COMMUNITY_FOLLOWUP" &&
    communityFollowupShowsOfficialAccount.value
  ) {
    officialAccountFollowPrompt.dismissPrompt();
  }
  finishSuccessPrompt();
};

const handleJoinConfirmationFollowupDone = (): void => {
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
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

watch(
  () => [props.open, props.prId] as const,
  ([open]) => {
    if (!open) return;
    joinSuccessPromptStep.value = resolveInitialJoinSuccessPromptStep();
    communityFollowupShowsOfficialAccount.value = false;
  },
  { immediate: true },
);

watch(confirmationReminderSupported, (supported) => {
  if (
    props.open &&
    !supported &&
    joinSuccessPromptStep.value === "CONFIRMATION_FOLLOWUP"
  ) {
    joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  }
});

defineExpose({
  close,
});
</script>

<style lang="scss" scoped>
.join-success-prompt {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-prompt__subscriptions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-success-prompt__subscriptions-heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.join-success-prompt__subscriptions-title {
  margin: 0;
  @include mx.pu-font(section);
}

.join-success-prompt__subscriptions-description {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.join-success-prompt__actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}
</style>
