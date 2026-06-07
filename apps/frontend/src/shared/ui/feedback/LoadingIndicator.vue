<template>
  <div class="loading-state">
    <div class="spinner" />
    <p>{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<style lang="scss" scoped>
.loading-state {
  @include mx.flex-center;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  padding: var(--sys-spacing-large);

  p {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface-variant);
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--sys-color-surface-container);
  border-top-color: var(--sys-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
