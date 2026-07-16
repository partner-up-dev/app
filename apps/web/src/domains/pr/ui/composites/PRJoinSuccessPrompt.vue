<template>
  <div class="join-success-prompt">
    <template v-if="joinSuccessPromptStep === 'CONFIRMATION_FOLLOWUP'">
      <PRJoinConfirmationFollowupPanel
        :confirmation-window-text="confirmationWindowText"
      />

      <PuButton
        tone="neutral" variant="soft"
        block
        data-testid="pr-detail.join-success.confirmation-followup.done"
        @click="handleJoinConfirmationFollowupDone"
      >
        {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
      </PuButton>
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

        <PRNotificationSubscriptions
          :visible-kinds="joinSuccessNotificationKinds"
          :description-prefixes="joinSuccessNotificationDescriptionPrefixes"
          :updating-label="t('prPage.wechatReminder.updating')"
          outline-profile="surface"
        />
      </section>

      <PuButton
        tone="neutral" variant="soft"
        block
        data-testid="pr-detail.join-success.done"
        @click="handleJoinSuccessSubscriptionDone"
      >
        {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
      </PuButton>
    </template>

    <template v-else>
      <PRJoinCommunityFollowupPanel
        :show-official-account="communityFollowupShowsOfficialAccount"
        :show-type-community="communityFollowupShowsTypeCommunity"
        :type-title="typeDetail?.title ?? prType ?? ''"
        :type-community-qr-code="typeCommunityQrCode"
      />
      <div class="join-success-prompt__actions">
        <PuButton

          block
          data-testid="pr-detail.join-success.community-followup.done"
          @click="handleJoinCommunityFollowupDone"
        >
          {{ t("prPage.joinCommunityFollowup.closeAction") }}
        </PuButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import { PuButton } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { normalizeCommunityQrUrl } from "@/domains/pr/model/pr-type-community";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRDiscoveryTypeDetail } from "@/domains/pr/queries/usePRDiscovery";
import PRJoinCommunityFollowupPanel from "@/domains/pr/ui/composites/PRJoinCommunityFollowupPanel.vue";
import PRJoinConfirmationFollowupPanel from "@/domains/pr/ui/composites/PRJoinConfirmationFollowupPanel.vue";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";
import PRNotificationSubscriptions from "@/shared/ui/sections/PRNotificationSubscriptions.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";

type JoinSuccessPromptStep = "CONFIRMATION_FOLLOWUP" | "SUBSCRIPTIONS" | "COMMUNITY_FOLLOWUP";

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
const communityFollowupShowsTypeCommunity = ref(false);
const prDetailId = computed(() => (props.open ? props.prId : null));
const { data: prDetailForPrompt } = usePRDetail(prDetailId);
const officialAccountFollowPrompt = useOfficialAccountFollowPrompt("pr_join_result");
const prType = computed(() => {
  const type = prDetailForPrompt.value?.core.type?.trim() ?? "";
  return props.open && type.length > 0 ? type : null;
});
const typeDetailQuery = usePRDiscoveryTypeDetail(prType);
const typeDetail = computed(() =>
  typeDetailQuery.data.value?.type === prType.value ? typeDetailQuery.data.value : null,
);
const typeCommunityQrCode = computed(() =>
  normalizeCommunityQrUrl(typeDetail.value?.communityQrCode),
);

const confirmationWindowText = computed(() => {
  const start = prDetailForPrompt.value?.partnerSection.timeline?.confirmationStartAt?.trim() ?? "";
  const end = prDetailForPrompt.value?.partnerSection.timeline?.confirmationEndAt?.trim() ?? "";
  const startText = start.length > 0 ? (formatLocalDateTimeValue(start) ?? start) : null;
  const endText = end.length > 0 ? (formatLocalDateTimeValue(end) ?? end) : null;

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
const joinSuccessNotificationKinds = computed<readonly WeChatNotificationKind[]>(
  () => JOIN_SUCCESS_NOTIFICATION_KINDS,
);
const joinSuccessNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  NEW_PARTNER: t("prPage.joinSuccessSubscriptions.notificationReasons.NEW_PARTNER"),
  PR_READY: t("prPage.joinSuccessSubscriptions.notificationReasons.PR_READY"),
  MEETING_POINT_UPDATED: t(
    "prPage.joinSuccessSubscriptions.notificationReasons.MEETING_POINT_UPDATED",
  ),
}));

const resolveInitialJoinSuccessPromptStep = (): JoinSuccessPromptStep =>
  confirmationReminderSupported.value ? "CONFIRMATION_FOLLOWUP" : "SUBSCRIPTIONS";

const resetPrompt = (): void => {
  joinSuccessPromptStep.value = "SUBSCRIPTIONS";
  communityFollowupShowsOfficialAccount.value = false;
  communityFollowupShowsTypeCommunity.value = false;
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

const handleJoinSuccessSubscriptionDone = async (): Promise<void> => {
  const shouldShowOfficialAccount = officialAccountFollowPrompt.canPromptNow();
  let shouldShowTypeCommunity = typeCommunityQrCode.value !== null;
  if (!shouldShowTypeCommunity && prType.value !== null && !typeDetail.value) {
    const result = await typeDetailQuery.refetch();
    const detail = result.data;
    shouldShowTypeCommunity =
      detail?.type === prType.value && normalizeCommunityQrUrl(detail.communityQrCode) !== null;
  }
  if (shouldShowOfficialAccount || shouldShowTypeCommunity) {
    communityFollowupShowsOfficialAccount.value = shouldShowOfficialAccount;
    communityFollowupShowsTypeCommunity.value = shouldShowTypeCommunity;
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
  communityFollowupShowsTypeCommunity.value = false;
  finishSuccessPrompt();
};

watch(
  () => [props.open, props.prId] as const,
  ([open]) => {
    if (!open) return;
    joinSuccessPromptStep.value = resolveInitialJoinSuccessPromptStep();
    communityFollowupShowsOfficialAccount.value = false;
    communityFollowupShowsTypeCommunity.value = false;
  },
  { immediate: true },
);

watch(confirmationReminderSupported, (supported) => {
  if (props.open && !supported && joinSuccessPromptStep.value === "CONFIRMATION_FOLLOWUP") {
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
