<template>
  <button
    class="toggle-switch"
    :class="{
      'is-checked': props.modelValue,
      'is-disabled': props.disabled,
    }"
    type="button"
    role="switch"
    :aria-checked="props.modelValue"
    :disabled="props.disabled"
    @click="handleClick"
  >
    <span class="toggle-switch__label">
      {{ props.label }}
    </span>
    <span class="toggle-switch__track" aria-hidden="true">
      <span class="toggle-switch__thumb" />
    </span>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label: string;
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  change: [value: boolean];
}>();

const handleClick = () => {
  if (props.disabled) {
    return;
  }

  const nextValue = !props.modelValue;
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
};
</script>

<style lang="scss" scoped>
.toggle-switch {
  --toggle-switch-track-width: 3rem;
  --toggle-switch-track-height: 1.75rem;
  --toggle-switch-track-padding: 0.2rem;
  --toggle-switch-thumb-size: 1.35rem;
  --toggle-switch-thumb-offset: 1.2rem;

  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  min-width: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-medium);
  }
}

.toggle-switch.is-disabled {
  cursor: not-allowed;
  opacity: var(--sys-opacity-disabled);
}

.toggle-switch__label {
  min-width: 0;
  @include mx.pu-font(control);
}

.toggle-switch__track {
  position: relative;
  flex: 0 0 auto;
  width: var(--toggle-switch-track-width);
  height: var(--toggle-switch-track-height);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container-highest);
  transition: background-color 180ms ease;
}

.toggle-switch__thumb {
  position: absolute;
  top: var(--toggle-switch-track-padding);
  left: var(--toggle-switch-track-padding);
  width: var(--toggle-switch-thumb-size);
  height: var(--toggle-switch-thumb-size);
  border-radius: var(--sys-radius-full);
  background: var(--sys-color-on-surface-variant);
  transition:
    transform 180ms ease,
    background-color 180ms ease;
}

.toggle-switch.is-checked .toggle-switch__track {
  background: var(--sys-color-primary-container);
}

.toggle-switch.is-checked .toggle-switch__thumb {
  transform: translateX(var(--toggle-switch-thumb-offset));
  background: var(--sys-color-primary);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch__track,
  .toggle-switch__thumb {
    transition: none !important;
  }
}
</style>
