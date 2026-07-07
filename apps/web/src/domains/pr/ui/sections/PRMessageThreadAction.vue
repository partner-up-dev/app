<template>
  <div
    v-if="showMessageThread"
    class="utility-action-cell"
    data-region="message-thread"
  >
    <PuButton
      tone="neutral" variant="outline"
      block
      data-testid="pr-detail.message-thread.open"
      @click="handleOpenMessages"
    >
      {{ t("prPage.messageEntry.action") }}
    </PuButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import { prMessagesPath } from "@/domains/pr/routing/routes";
import { PuButton } from "@partner-up-dev/design-web";

const props = defineProps<{
  pr: PRDetailView;
}>();

const router = useRouter();
const { t } = useI18n();

const showMessageThread = computed(
  () =>
    props.pr.partnerSection.reminder.supported &&
    props.pr.partnerSection.viewer.isParticipant,
);

const handleOpenMessages = (): void => {
  if (!showMessageThread.value) return;
  router.push(prMessagesPath(props.pr.id));
};
</script>

<style lang="scss" scoped>
.utility-action-cell {
  display: flex;
  flex-direction: column;
}
</style>
