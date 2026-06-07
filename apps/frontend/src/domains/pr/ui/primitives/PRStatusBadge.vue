<template>
  <span
    class="status-badge"
    :class="[
      status.toLowerCase(),
      `status-badge--size-${props.size}`,
      `status-badge--appearance-${props.appearance}`,
    ]"
  >
    {{ statusText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDisplayStatus } from "@/domains/pr/model/pr-display-status";

const props = withDefaults(
  defineProps<{
    status: PRDisplayStatus;
    size?: "sm" | "md";
    appearance?: "rounded" | "pill";
  }>(),
  {
    size: "md",
    appearance: "rounded",
  },
);
const { t } = useI18n();

const statusText = computed(() => {
  const map = {
    DRAFT: t("status.draft"),
    OPEN: t("status.open"),
    READY: t("status.ready"),
    FULL: t("status.full"),
    ACTIVE: t("status.active"),
    CLOSED: t("status.closed"),
    EXPIRED: t("status.expired"),
  };
  return map[props.status];
});
</script>

<style lang="scss" scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  flex-shrink: 0;

  &--size-md {
    @include mx.pu-font(control);
    padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  }

  &--size-sm {
    @include mx.pu-font(control);
    padding: calc(var(--sys-spacing-xsmall) / 2) var(--sys-spacing-small);
  }

  &--appearance-rounded {
    border-radius: var(--sys-radius-small);
  }

  &--appearance-pill {
    border-radius: 999px;
  }

  &.draft {
    background: var(--sys-color-surface-container-highest);
    color: var(--sys-color-on-surface);
  }

  &.open {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &.ready {
    background: var(--sys-color-tertiary-container);
    color: var(--sys-color-on-tertiary-container);
  }

  &.full {
    background: var(--sys-color-error-container);
    color: var(--sys-color-on-error-container);
  }

  &.active {
    background: var(--sys-color-secondary-container);
    color: var(--sys-color-on-secondary-container);
  }

  &.closed,
  &.expired {
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
