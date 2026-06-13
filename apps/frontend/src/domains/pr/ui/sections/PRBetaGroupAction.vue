<template>
  <div
    v-if="showBetaGroupEntry"
    class="utility-action-cell"
    data-region="beta-group"
  >
    <Button
      tone="outline"
      block
      data-testid="pr-detail.beta-group.open"
      @click="handleOpenBetaGroupModal"
    >
      {{ t("prPage.betaGroupEntry.action") }}
    </Button>

    <PuModal :open="showBetaGroupModal" @close="showBetaGroupModal = false">
      <AnchorEventBetaGroupQrPanel
        :event-title="betaGroupEventTitle"
        :qr-code-url="betaGroupQrCode"
      />
    </PuModal>
  </div>
</template>

<script setup lang="ts">
import { PuModal } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import AnchorEventBetaGroupQrPanel from "@/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue";
import { trackEvent } from "@/shared/telemetry/track";

const props = defineProps<{
  pr: PRDetailView;
}>();

const { t } = useI18n();
const showBetaGroupModal = ref(false);

const betaGroupQrCode = computed(() => {
  const qrCode = props.pr.anchorEventContext?.betaGroupQrCode?.trim() ?? "";
  return qrCode.length > 0 ? qrCode : null;
});

const betaGroupEventTitle = computed(
  () => props.pr.anchorEventContext?.title ?? props.pr.core.type,
);

const showBetaGroupEntry = computed(() => betaGroupQrCode.value !== null);

const handleOpenBetaGroupModal = (): void => {
  showBetaGroupModal.value = true;
  trackEvent("pr_secondary_action_click", {
    prId: props.pr.id,
    actionType: "JOIN_BETA_GROUP",
  });
};
</script>

<style lang="scss" scoped>
.utility-action-cell {
  display: flex;
  flex-direction: column;
}
</style>
