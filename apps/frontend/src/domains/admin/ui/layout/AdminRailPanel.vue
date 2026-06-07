<template>
  <section class="admin-rail-panel">
    <header v-if="title || $slots.actions" class="admin-rail-panel__header">
      <h2 v-if="title" class="admin-rail-panel__title">{{ title }}</h2>
      <div v-if="$slots.actions" class="admin-rail-panel__actions">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<style lang="scss" scoped>
.admin-rail-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-large);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
}

.admin-rail-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}

.admin-rail-panel__title {
  @include mx.pu-font(section);
  margin: 0;
}

.admin-rail-panel__actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
}
</style>
