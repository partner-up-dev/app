<template>
  <div v-if="communityQrCode" class="utility-action-cell" data-region="type-community">
    <PuButton
      tone="neutral"
      variant="outline"
      block
      data-testid="pr-detail.type-community.open"
      @click="showCommunityModal = true"
    >
      {{ t("prPage.typeCommunityEntry.action") }}
    </PuButton>

    <PuModal
      :open="showCommunityModal"
      :title="t('prDiscovery.typeDetail.communityTitle')"
      max-width="480px"
      @close="showCommunityModal = false"
    >
      <PRTypeCommunityQrPanel
        :type-title="typeDetail?.title ?? props.type"
        :qr-code-url="communityQrCode"
      />
    </PuModal>
  </div>
</template>

<script setup lang="ts">
import { PuButton, PuModal } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { normalizeCommunityQrUrl } from "@/domains/pr/model/pr-type-community";
import { usePRDiscoveryTypeDetail } from "@/domains/pr/queries/usePRDiscovery";
import PRTypeCommunityQrPanel from "@/domains/pr/ui/discovery/PRTypeCommunityQrPanel.vue";

const props = defineProps<{
  type: string;
}>();

const { t } = useI18n();
const type = computed(() => props.type.trim() || null);
const typeDetailQuery = usePRDiscoveryTypeDetail(type);
const typeDetail = computed(() =>
  typeDetailQuery.data.value?.type === type.value ? typeDetailQuery.data.value : null,
);
const communityQrCode = computed(() => normalizeCommunityQrUrl(typeDetail.value?.communityQrCode));
const showCommunityModal = ref(false);
</script>

<style lang="scss" scoped>
.utility-action-cell {
  display: flex;
  flex-direction: column;
}
</style>
