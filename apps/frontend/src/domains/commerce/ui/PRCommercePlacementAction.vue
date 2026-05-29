<template>
  <ActionLink
    v-if="placement"
    :to="placement.target.href"
    appearance="rect"
    tone="surface"
    size="md"
    data-testid="pr-detail.commerce-placement.open"
  >
    <template #leading>
      <span class="i-mdi-storefront-outline"></span>
    </template>
    {{ placement.creative.ctaLabel }}
  </ActionLink>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import ActionLink from "@/shared/ui/actions/ActionLink.vue";
import { useCommercePlacement } from "@/domains/commerce/queries/useCommerce";

const props = defineProps<{
  prId: PRId;
}>();

const prId = toRef(props, "prId");
const placementQuery = useCommercePlacement(computed(() => prId.value), "BUTTON");
const placement = computed(() => placementQuery.data.value?.placement ?? null);
</script>
