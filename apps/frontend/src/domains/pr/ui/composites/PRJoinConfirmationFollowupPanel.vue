<template>
  <section
    class="join-confirmation-followup"
    data-testid="pr-detail.join-success.confirmation-followup"
    aria-labelledby="join-confirmation-followup-title"
  >
    <div class="join-confirmation-followup__heading">
      <span
        class="join-confirmation-followup__icon i-mdi-clock-alert-outline"
        aria-hidden="true"
      ></span>
      <div class="join-confirmation-followup__copy">
        <h2
          id="join-confirmation-followup-title"
          class="join-confirmation-followup__title"
        >
          {{ t("prPage.joinConfirmationFollowup.title") }}
        </h2>
        <p class="join-confirmation-followup__description">
          {{ description }}
        </p>
      </div>
    </div>

    <div
      class="join-confirmation-followup__subscriptions"
      data-testid="pr-detail.join-success.confirmation-followup.subscription"
    >
      <APRNotificationSubscriptions
        :visible-kinds="confirmationNotificationKinds"
        :description-prefixes="confirmationNotificationDescriptionPrefixes"
        :updating-label="t('prPage.wechatReminder.updating')"
        outline-profile="surface"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import APRNotificationSubscriptions from "@/shared/ui/sections/APRNotificationSubscriptions.vue";
import type { WeChatNotificationKind } from "@/shared/wechat/useWeChatNotificationSubscriptionsPanel";

const props = defineProps<{
  confirmationWindowText: string | null;
}>();

const { t } = useI18n();

const confirmationNotificationKinds = [
  "REMINDER_CONFIRMATION",
] as const satisfies readonly WeChatNotificationKind[];

const description = computed(() =>
  props.confirmationWindowText
    ? t("prPage.joinConfirmationFollowup.descriptionWithWindow", {
        window: props.confirmationWindowText,
      })
    : t("prPage.joinConfirmationFollowup.descriptionFallback"),
);

const confirmationNotificationDescriptionPrefixes = computed<
  Partial<Record<WeChatNotificationKind, string>>
>(() => ({
  REMINDER_CONFIRMATION: t(
    "prPage.joinConfirmationFollowup.notificationReason",
  ),
}));
</script>

<style lang="scss" scoped>
.join-confirmation-followup {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-confirmation-followup__heading {
  display: flex;
  align-items: flex-start;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.join-confirmation-followup__icon {
  flex: 0 0 auto;
  margin-top: 0.125rem;
  color: var(--sys-color-primary);
  @include mx.pu-icon(medium);
}

.join-confirmation-followup__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.join-confirmation-followup__title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.join-confirmation-followup__description {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.join-confirmation-followup__subscriptions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}
</style>
