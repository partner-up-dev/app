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
    <p
      v-if="admissionMessage"
      class="button-placement__admission-message"
      data-testid="pr-detail.commerce-placement.admission-result"
      aria-live="polite"
    >
      {{ admissionMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { PuButton } from "@partner-up-dev/design-web";
import { computed, toRef, watch } from "vue";
import {
  type PlacementInstanceProjection,
  usePlacementMatch,
} from "@/domains/commerce/queries/useCommerce";
import { usePlacementOrderingEntryFlow } from "@/domains/commerce/use-cases/usePlacementOrderingEntryFlow";

const props = defineProps<{
  matchingContext: unknown;
}>();

const matchingContext = toRef(props, "matchingContext");
const placementQuery = usePlacementMatch(
  computed(() => matchingContext.value),
  "BUTTON",
);
const placement = computed(() => placementQuery.data.value?.placements[0] ?? null);
const placementOrderingFlow = usePlacementOrderingEntryFlow();
watch([matchingContext, () => placement.value?.id ?? null], () => {
  placementOrderingFlow.resetAdmissionOutcome();
});
const admissionMessage = computed(() => {
  if (placementOrderingFlow.admissionOutcome.value === "NON_CREATOR") {
    return "仅搭子发起人可以创建新订单";
  }
  if (placementOrderingFlow.admissionOutcome.value === "INACTIVE") {
    return "当前下单入口不可用";
  }
  return null;
});
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

.button-placement__admission-message {
  margin: 0;
  color: var(--sys-color-error);
  font-size: var(--sys-typo-caption-size);
  line-height: 1.4;
}
</style>
