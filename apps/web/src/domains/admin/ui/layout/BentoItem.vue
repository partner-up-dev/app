<template>
  <section class="bento-item" :class="`bento-item--span-${span}`">
    <header class="bento-item__header">
      <div class="bento-item__heading">
        <h2 class="bento-item__title">{{ title }}</h2>
        <p v-if="description" class="bento-item__description">
          {{ description }}
        </p>
      </div>
      <div v-if="$slots.actions" class="bento-item__actions">
        <slot name="actions" />
      </div>
    </header>

    <div class="bento-item__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    span?: "full" | "half";
  }>(),
  {
    description: undefined,
    span: "half",
  },
);
</script>

<style lang="scss" scoped>
.bento-item {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  min-width: 0;
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.bento-item--span-full {
  grid-column: 1 / -1;
}

.bento-item__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.bento-item__heading,
.bento-item__body,
.bento-item__actions {
  min-width: 0;
}

.bento-item__heading {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.bento-item__title,
.bento-item__description {
  margin: 0;
}

.bento-item__title {
  @include mx.pu-font(section);
}

.bento-item__description {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface-variant);
}

.bento-item__actions {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 720px) {
  .bento-item {
    grid-column: 1 / -1;
  }
}
</style>
