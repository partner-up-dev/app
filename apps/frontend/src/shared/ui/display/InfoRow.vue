<template>
  <div
    class="info-row"
    :class="[
      `info-row--layout-${layout}`,
      `info-row--align-${align}`,
      { 'info-row--collapse': collapseOnMobile },
    ]"
  >
    <div v-if="label || $slots.label" class="info-row__label">
      <slot name="label">
        {{ label }}
      </slot>
    </div>
    <div class="info-row__value">
      <slot>
        {{ value }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
type InfoRowLayout = "inline" | "stack";
type InfoRowAlign = "start" | "end";

withDefaults(
  defineProps<{
    label?: string;
    value?: string | number | null;
    layout?: InfoRowLayout;
    align?: InfoRowAlign;
    collapseOnMobile?: boolean;
  }>(),
  {
    label: undefined,
    value: null,
    layout: "inline",
    align: "end",
    collapseOnMobile: true,
  },
);
</script>

<style lang="scss" scoped>
.info-row {
  display: flex;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.info-row--layout-inline {
  align-items: center;
  justify-content: space-between;
}

.info-row--layout-stack {
  flex-direction: column;
  align-items: flex-start;
}

.info-row__label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;
}

.info-row__value {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  min-width: 0;
  flex: 1;
}

.info-row--align-end .info-row__value {
  text-align: right;
}

.info-row--layout-stack .info-row__value,
.info-row--align-start .info-row__value {
  text-align: left;
}

@media (max-width: 879px) {
  .info-row--layout-inline.info-row--collapse {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-row--layout-inline.info-row--collapse .info-row__value {
    text-align: left;
  }
}
</style>
