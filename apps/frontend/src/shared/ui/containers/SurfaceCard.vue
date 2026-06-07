<template>
  <PuCard
    class="surface-card"
    :class="`surface-card--compat-tone-${props.tone}`"
    :as="props.as"
    :tone="cardTone"
    :padding="cardPadding"
    :gap="props.gap"
  >
    <slot />
  </PuCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PuCard } from "@partner-up-dev/design-web";

type SurfaceCardTone = "section" | "inset-high" | "outline";
type SurfaceCardGap = "none" | "xs" | "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    as?: string;
    tone?: SurfaceCardTone;
    gap?: SurfaceCardGap;
  }>(),
  {
    as: "section",
    tone: "section",
    gap: "sm",
  },
);

const cardTone = computed(() => (props.tone === "outline" ? "outline" : "surface"));
const cardPadding = computed(() => (props.tone === "section" ? "md" : "sm"));
</script>

<style lang="scss" scoped>
.surface-card--compat-tone-inset-high {
  background: var(--sys-color-surface-container-high);
}

.surface-card--compat-tone-outline {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
}
</style>
