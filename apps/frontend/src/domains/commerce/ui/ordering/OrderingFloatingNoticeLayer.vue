<template>
  <div
    v-if="message"
    class="ordering-floating-notice"
    :class="`ordering-floating-notice--${tone}`"
    :data-testid="dataTestid"
    role="status"
  >
    <span :class="iconClass" aria-hidden="true"></span>
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    message: string | null;
    tone?: "warning" | "error";
    dataTestid?: string;
  }>(),
  {
    tone: "warning",
    dataTestid: "ordering.notice.blocked",
  },
);

const iconClass = computed(() =>
  props.tone === "error" ? "i-mdi-alert-circle" : "i-mdi-alert-outline",
);
</script>

<style scoped lang="scss">
.ordering-floating-notice {
  position: absolute;
  right: var(--sys-spacing-medium);
  bottom: calc(var(--sys-size-large) + var(--sys-spacing-xlarge));
  left: var(--sys-spacing-medium);
  z-index: 20;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--sys-spacing-xsmall);
  align-items: center;
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-small);
  box-shadow: var(--sys-elevation-level3);

  span:first-child {
    @include mx.pu-icon(small);
  }

  span:last-child {
    @include mx.pu-font(body-small);
    overflow-wrap: anywhere;
  }
}

.ordering-floating-notice--warning {
  background: var(--sys-color-warning);
  color: var(--sys-color-on-warning);
}

.ordering-floating-notice--error {
  background: var(--sys-color-error);
  color: var(--sys-color-on-error);
}
</style>
