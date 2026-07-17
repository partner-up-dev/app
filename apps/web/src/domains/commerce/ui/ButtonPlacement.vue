<template>
  <div v-if="placement" class="button-placement">
    <PuButton
      shape="rect"
      tone="neutral"
      variant="soft"
      size="md"
      :loading="isOpeningPlacement"
      data-testid="pr-detail.commerce-placement.open"
      @click="openPlacementOrdering(placement)"
    >
      <template #leading>
        <span class="i-mdi-storefront-outline"></span>
      </template>
      {{ placement.creative.ctaLabel }}
    </PuButton>
    <p v-if="placement.creative.description" class="button-placement__description">
      {{ placement.creative.description }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { PuButton } from "@partner-up-dev/design-web";
import { computed, toRef } from "vue";
import {
  type PlacementInstanceProjection,
  usePlacementMatch,
} from "@/domains/commerce/queries/useCommerce";
import { usePlacementOrderingEntryFlow } from "@/domains/commerce/use-cases/usePlacementOrderingEntryFlow";

const props = defineProps<{
  matchingContext: unknown;
  prId: number | null;
}>();

const matchingContext = toRef(props, "matchingContext");
const placementQuery = usePlacementMatch(
  computed(() => matchingContext.value),
  "BUTTON",
);
const placement = computed(() => placementQuery.data.value?.placements[0] ?? null);
const placementOrderingFlow = usePlacementOrderingEntryFlow();
const isOpeningPlacement = computed(
  () =>
    placement.value !== null &&
    placementOrderingFlow.pendingPlacementId.value === placement.value.id,
);

const openPlacementOrdering = async (
  selectedPlacement: PlacementInstanceProjection,
): Promise<void> => {
  await placementOrderingFlow.openPlacementOrdering({
    placement: selectedPlacement,
    matchingContext: matchingContext.value,
    prId: props.prId,
  });
};
</script>

<style scoped lang="scss">
.button-placement {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
}

.button-placement__description {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  font-size: var(--sys-typo-caption-size);
  line-height: 1.4;
}
</style>
