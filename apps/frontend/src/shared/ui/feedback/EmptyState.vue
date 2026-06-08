<template>
  <SurfaceCard
    :as="as"
    :tone="tone"
    :gap="compact ? 'xs' : 'sm'"
    class="empty-state"
    :class="`empty-state--align-${align}`"
  >
    <span
      v-if="icon"
      class="empty-state__icon"
      :class="icon"
      aria-hidden="true"
    ></span>

    <div class="empty-state__text">
      <h2 class="empty-state__title">{{ title }}</h2>
      <p v-if="description" class="empty-state__description">
        {{ description }}
      </p>
      <div v-if="$slots.default" class="empty-state__body">
        <slot />
      </div>
    </div>

    <div v-if="$slots.actions" class="empty-state__actions">
      <slot name="actions" />
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";

type EmptyStateAlign = "start" | "center";
type EmptyStateTone = "section" | "outline";

withDefaults(
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
</script>

<style lang="scss" scoped>
.empty-state {
  align-items: stretch;
}

.empty-state--align-center {
  text-align: center;
  align-items: center;
}

.empty-state--align-start {
  text-align: left;
  align-items: flex-start;
}

.empty-state__icon {
  @include mx.pu-icon(large, true);
  color: var(--sys-color-primary);
}

.empty-state__text {
  min-width: 0;
}

.empty-state__title,
.empty-state__description {
  margin: 0;
}

.empty-state__title {
  @include mx.pu-font(section);
  color: var(--sys-color-on-surface);
}

.empty-state__description,
.empty-state__body {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.empty-state__body {
  margin-top: var(--sys-spacing-xsmall);
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-small);
}
</style>
