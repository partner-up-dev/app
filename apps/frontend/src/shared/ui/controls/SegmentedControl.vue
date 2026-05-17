<template>
  <div
    class="segmented-control"
    :class="[
      `segmented-control--size-${size}`,
      `segmented-control--tone-${tone}`,
      { 'segmented-control--block': block },
    ]"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      class="segmented-control__item"
      type="button"
      role="radio"
      :aria-checked="option.value === modelValue"
      :aria-label="option.ariaLabel"
      :disabled="option.disabled"
      :data-active="option.value === modelValue ? 'true' : 'false'"
      :data-testid="option.testId"
      @click="selectOption(option)"
    >
      <span
        v-if="option.icon"
        class="segmented-control__icon"
        :class="option.icon"
        aria-hidden="true"
      ></span>
      <span class="segmented-control__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
export type SegmentedControlValue = string | number;

export type SegmentedControlOption = {
  value: SegmentedControlValue;
  label: string;
  icon?: string;
  ariaLabel?: string;
  testId?: string;
  disabled?: boolean;
};

const props = withDefaults(
  defineProps<{
    modelValue: SegmentedControlValue;
    options: readonly SegmentedControlOption[];
    ariaLabel?: string;
    size?: "sm" | "md";
    tone?: "surface" | "primary";
    block?: boolean;
  }>(),
  {
    ariaLabel: undefined,
    size: "md",
    tone: "surface",
    block: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: SegmentedControlValue];
}>();

const selectOption = (option: SegmentedControlOption) => {
  if (option.disabled || option.value === props.modelValue) {
    return;
  }

  emit("update:modelValue", option.value);
};
</script>

<style scoped lang="scss">
.segmented-control {
  display: inline-grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
  padding: calc(var(--sys-spacing-xsmall) / 2);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.segmented-control--block {
  width: 100%;
}

.segmented-control__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  border: 0;
  border-radius: var(--sys-radius-xsmall);
  color: var(--sys-color-on-surface-variant);
  background: transparent;
  cursor: pointer;
  appearance: none;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.segmented-control__item[data-active="true"] {
  color: var(--sys-color-on-primary-container);
  background: var(--sys-color-primary-container);
  @include mx.pu-elevation(1);
}

.segmented-control--tone-surface
  .segmented-control__item[data-active="true"] {
  color: var(--sys-color-on-surface);
  background: var(--sys-color-surface-container-highest);
}

.segmented-control__item:disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
}

.segmented-control__item:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.segmented-control--size-sm .segmented-control__item {
  @include mx.pu-font(label-medium);
  min-height: var(--sys-size-medium);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.segmented-control--size-md .segmented-control__item {
  @include mx.pu-font(label-large);
  min-height: var(--sys-size-large);
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.segmented-control__icon {
  @include mx.pu-icon(small);
  flex-shrink: 0;
}

.segmented-control__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
