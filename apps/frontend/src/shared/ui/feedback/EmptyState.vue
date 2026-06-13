<template>
  <PuEmptyState
    :as="props.as"
    :title="props.title"
    :description="props.description"
    :icon="props.icon"
    :compact="props.compact"
    :align="props.align"
    :surface-level="surfaceLevel"
    :variant="variant"
  >
    <slot />

    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>
  </PuEmptyState>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PuEmptyState } from "@partner-up-dev/design-web";

type EmptyStateAlign = "start" | "center";
type EmptyStateTone = "section" | "outline";
type EmptyStateSurfaceLevel = "section";
type EmptyStateVariant = "soft" | "outline";

const props = withDefaults(
  defineProps<{
    as?: string;
    title: string;
    description?: string;
    icon?: string;
    compact?: boolean;
    align?: EmptyStateAlign;
    tone?: EmptyStateTone;
  }>(),
  {
    as: "section",
    description: undefined,
    icon: undefined,
    compact: false,
    align: "center",
    tone: "outline",
  },
);

const surfaceLevel = computed<EmptyStateSurfaceLevel>(() => "section");
const variant = computed<EmptyStateVariant>(() =>
  props.tone === "outline" ? "outline" : "soft",
);
</script>
