<template>
  <section
    v-if="showInlineReminderSubscriptions"
    class="utility-section"
    data-region="reliability"
    data-testid="pr-detail.notification-subscriptions"
  >
    <div class="utility-section__body">
      <h2 class="utility-section__title">
        {{ t("prPage.notificationSubscriptions.title") }}
      </h2>
      <PRNotificationSubscriptions
        :updating-label="t('prPage.wechatReminder.updating')"
        outline-profile="surface"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import PRNotificationSubscriptions from "@/shared/ui/sections/PRNotificationSubscriptions.vue";

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();

const showInlineReminderSubscriptions = computed(() => {
  const section = props.pr.partnerSection;
  return section.reminder.supported && section.reminder.visible && section.viewer.isParticipant;
});
</script>

<style lang="scss" scoped>
.utility-section__body {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.utility-section__title {
  margin: 0;
  @include mx.pu-font(body);
}
</style>
