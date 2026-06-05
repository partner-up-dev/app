<template>
  <section class="expandable-card">
    <button
      type="button"
      class="expandable-card__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <div class="expandable-card__header">
        <h3 class="expandable-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="expandable-card__subtitle">{{ subtitle }}</p>
      </div>
      <span class="expandable-card__icon" :class="{ 'is-open': expanded }">
        ▾
      </span>
    </button>
    <div
      v-if="keepContentMounted"
      class="expandable-card__content-motion"
      :class="{ 'is-open': expanded }"
      :aria-hidden="!expanded"
      :inert="!expanded"
    >
      <div class="expandable-card__content-clip">
        <div class="expandable-card__content">
          <slot />
        </div>
      </div>
    </div>
    <Transition v-else name="expandable-card-content">
      <div v-if="expanded" class="expandable-card__content">
        <slot />
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string | null;
    defaultExpanded?: boolean;
    expandedResetKey?: string | number | null;
    keepContentMounted?: boolean;
  }>(),
  {
    subtitle: null,
    defaultExpanded: false,
    expandedResetKey: null,
    keepContentMounted: false,
  },
);

const expanded = ref(props.defaultExpanded);
const keepContentMounted = computed(() => props.keepContentMounted);

watch(
  () => [props.defaultExpanded, props.expandedResetKey] as const,
  ([defaultExpanded]) => {
    expanded.value = defaultExpanded;
  },
);
</script>

<style lang="scss" scoped>
.expandable-card {
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface);
}

.expandable-card__toggle {
  width: 100%;
  min-height: var(--sys-size-large);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-align: left;
}

.expandable-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.expandable-card__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.expandable-card__subtitle {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.expandable-card__icon {
  @include mx.pu-font(label-medium);
  transition: transform 0.18s ease;
}

.expandable-card__icon.is-open {
  transform: rotate(180deg);
}

.expandable-card__content {
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-medium);
}

.expandable-card__content-motion {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition:
    grid-template-rows 0.18s ease,
    opacity 0.15s ease,
    transform 0.15s ease;
}

.expandable-card__content-motion.is-open {
  grid-template-rows: 1fr;
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.expandable-card__content-motion > .expandable-card__content-clip {
  min-height: 0;
  overflow: hidden;
}

.expandable-card-content-enter-active,
.expandable-card-content-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.expandable-card-content-enter-from,
.expandable-card-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
