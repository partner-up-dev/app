<template>
  <section
    class="join-community-followup"
    data-testid="pr-detail.join-success.community-followup"
  >
    <PRTypeCommunityQrPanel
      v-if="showTypeCommunity"
      :type-title="typeTitle"
      :qr-code-url="typeCommunityQrCode"
      data-testid="pr-detail.join-success.type-community"
    />

    <div
      v-if="showTypeCommunity && showOfficialAccount"
      class="join-community-followup__divider"
      aria-hidden="true"
    />

    <OfficialAccountFollowPanel v-if="showOfficialAccount" />
  </section>
</template>

<script setup lang="ts">
import OfficialAccountFollowPanel from "@/domains/marketing/ui/OfficialAccountFollowPanel.vue";
import PRTypeCommunityQrPanel from "@/domains/pr/ui/discovery/PRTypeCommunityQrPanel.vue";

defineProps<{
  showOfficialAccount: boolean;
  showTypeCommunity: boolean;
  typeTitle: string;
  typeCommunityQrCode: string | null;
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
