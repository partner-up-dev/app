<template>
  <PRShareCarousel
    v-if="prId !== null && prData !== null && spmRouteKey !== null"
    class="space-m-t-large space-p-x-small"
    :share-url="shareUrl"
    :spm-route-key="spmRouteKey"
    :pr-id="prId"
    :pr-data="prData"
    :default-method-id="defaultMethodId"
    :auto-rotate-interval-ms="autoRotateIntervalMs"
  />
</template>

<script setup lang="ts">
import type { PRId } from "@partner-up-dev/backend";
import PRShareCarousel from "@/domains/share/ui/composites/PRShareCarousel.vue";
import type { PRShareData } from "@/domains/share/model/types";
import type { ShareMethodId } from "@/domains/share/use-cases/useShareCarousel";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

withDefaults(
  defineProps<{
    prId: PRId | null;
    shareUrl: string;
    spmRouteKey: ShareSpmRouteKey | null;
    prData: PRShareData | null;
    defaultMethodId?: ShareMethodId;
    autoRotateIntervalMs?: number | null;
  }>(),
  {
    defaultMethodId: "XIAOHONGSHU",
    autoRotateIntervalMs: 3000,
  },
);
</script>
