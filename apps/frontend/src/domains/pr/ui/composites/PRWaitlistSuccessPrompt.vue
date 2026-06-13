<template>
  <div class="waitlist-success-prompt">
    <template v-if="waitlistPromptStep === 'SUBSCRIPTIONS'">
      <p
        class="waitlist-success-prompt__text"
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

      <PuButton
        tone="neutral" variant="soft"
        block
        data-testid="pr-detail.waitlist-success.done"
        @click="handleWaitlistSubscriptionDone"
      >
        {{ t("prPage.joinSuccessSubscriptions.closeAction") }}
      </PuButton>
    </template>

    <template v-else>
      <OfficialAccountFollowPanel />
      <div class="waitlist-success-prompt__actions">
        <PuButton
          tone="neutral" variant="soft"

          @click="handleCloseWaitlistOfficialAccountPrompt"
        >
          {{ t("officialAccountFollow.laterAction") }}
        </PuButton>
        <PuButton @click="handleWaitlistOfficialAccountDone">
          {{ t("officialAccountFollow.doneAction") }}
        </PuButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import WeChatNotificationSubscriptionsCard from "@/shared/ui/sections/WeChatNotificationSubscriptionsCard.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { PuButton } from "@partner-up-dev/design-web";

type WaitlistPromptStep = "SUBSCRIPTIONS" | "OFFICIAL_ACCOUNT";

const props = defineProps<{
  open: boolean;
  alternativePrReminderOptIn: boolean;
}>();

const emit = defineEmits<{
  done: [];
}>();

const { t } = useI18n();
const waitlistPromptStep = ref<WaitlistPromptStep>("SUBSCRIPTIONS");
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
    props.alternativePrReminderOptIn
      ? ["WAITLIST_PROMOTED", "WAITLIST_ALTERNATIVE_AVAILABLE"]
      : ["WAITLIST_PROMOTED"],
);

const resetPrompt = (): void => {
  waitlistPromptStep.value = "SUBSCRIPTIONS";
};

const finishPrompt = (): void => {
  resetPrompt();
  emit("done");
};

const close = (): void => {
  if (waitlistPromptStep.value === "OFFICIAL_ACCOUNT") {
    officialAccountFollowPrompt.dismissPrompt();
  }
  finishPrompt();
};

const handleWaitlistSubscriptionDone = (): void => {
  if (officialAccountFollowPrompt.canPromptNow()) {
    officialAccountFollowPrompt.markPromptPresented();
    waitlistPromptStep.value = "OFFICIAL_ACCOUNT";
    return;
  }
  finishPrompt();
};

const handleCloseWaitlistOfficialAccountPrompt = (): void => {
  officialAccountFollowPrompt.dismissPrompt();
  finishPrompt();
};

const handleWaitlistOfficialAccountDone = (): void => {
  officialAccountFollowPrompt.markPromptCompleted();
  finishPrompt();
};

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    resetPrompt();
  },
  { immediate: true },
);

defineExpose({
  close,
});
</script>

<style lang="scss" scoped>
.waitlist-success-prompt {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.waitlist-success-prompt__text {
  margin: 0;
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.waitlist-success-prompt__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.waitlist-success-prompt__actions > button {
  flex: 1 1 180px;
}
</style>
