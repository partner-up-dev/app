<template>
  <div v-if="placement" class="button-placement">
    <Button
      appearance="rect"
      tone="surface"
      size="md"
      type="button"
      data-testid="pr-detail.commerce-placement.open"
      @click="emit('placement-click', placement)"
    >
      <template #leading>
        <span class="i-mdi-storefront-outline"></span>
      </template>
      {{ placement.creative.ctaLabel }}
    </Button>
    <p v-if="placement.creative.description" class="button-placement__description">
      {{ placement.creative.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  usePlacementMatch,
  type PlacementInstanceProjection,
} from "@/domains/commerce/queries/useCommerce";

const props = defineProps<{
  matchingContext: unknown;
}>();

const emit = defineEmits<{
  "placement-click": [placement: PlacementInstanceProjection];
}>();

const matchingContext = toRef(props, "matchingContext");
const placementQuery = usePlacementMatch(computed(() => matchingContext.value), "BUTTON");
const placement = computed(() => placementQuery.data.value?.placements[0] ?? null);
</script>

<style scoped lang="scss">
.button-placement {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);
}

.button-placement__description {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  font-size: var(--sys-font-size-small);
  line-height: 1.4;
}
</style>
