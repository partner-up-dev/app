<template>
  <div v-if="showShareAction" class="utility-action-group" data-region="share">
    <PuButton
      tone="neutral"
      variant="outline"
      block
      data-testid="pr-detail.share.open"
      @click="showShareDrawer = true"
    >
      {{ t("prPage.shareEntry.action") }}
    </PuButton>

    <PuDrawer v-model:visible="showShareDrawer" title="分享邀请">
      <PRShareSection
        :pr-id="pr.id"
        :share-url="shareUrl"
        :spm-route-key="spmRouteKey"
        :pr-data="prShareData"
        default-method-id="XIAOHONGSHU"
        :auto-rotate-interval-ms="null"
      />
    </PuDrawer>
  </div>
</template>

<script setup lang="ts">
import { PuButton, PuDrawer } from "@partner-up-dev/design-web";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import type { PRShareData } from "@/domains/share/model/types";
import type { ShareSpmRouteKey } from "@/shared/url/spm";
import PRShareSection from "@/domains/pr/ui/sections/PRShareSection.vue";

const props = defineProps<{
  pr: PRDetailView;
  shareUrl: string;
  spmRouteKey: ShareSpmRouteKey | null;
  prShareData: PRShareData | null;
}>();

const { t } = useI18n();
const showShareDrawer = ref(false);

const showShareAction = computed(() => props.spmRouteKey !== null && props.prShareData !== null);
</script>

<style lang="scss" scoped>
.utility-action-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}
</style>
