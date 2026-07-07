<template>
  <section
    class="join-community-followup"
    data-testid="pr-detail.join-success.community-followup"
  >
    <AnchorEventBetaGroupQrPanel
      v-if="betaGroupQrCode"
      :event-title="eventTitle"
      :qr-code-url="betaGroupQrCode"
    />

    <div
      v-if="betaGroupQrCode && showOfficialAccount"
      class="join-community-followup__divider"
      aria-hidden="true"
    ></div>

    <OfficialAccountFollowPanel v-if="showOfficialAccount" />
  </section>
</template>

<script setup lang="ts">
import AnchorEventBetaGroupQrPanel from "@/domains/event/ui/primitives/AnchorEventBetaGroupQrPanel.vue";
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";

defineProps<{
  eventTitle: string;
  betaGroupQrCode: string | null;
  showOfficialAccount: boolean;
}>();
</script>

<style lang="scss" scoped>
.join-community-followup {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.join-community-followup__divider {
  height: 1px;
  background: var(--sys-color-outline-variant);
}
</style>
