<template>
  <div
    class="multi-stop-toggle"
    :class="[
      `multi-stop-toggle--size-${props.size}`,
      { 'is-disabled': props.disabled },
    ]"
    :style="toggleStyle"
    role="slider"
    :aria-label="props.ariaLabel"
    :aria-valuemin="0"
    :aria-valuemax="maxIndex"
    :aria-valuenow="activeIndex"
    :aria-valuetext="activeValueText"
    :aria-disabled="props.disabled"
    :tabindex="props.disabled ? undefined : 0"
    @click="selectNextByBounce"
    @keydown.enter.prevent="selectNextByBounce"
    @keydown.space.prevent="selectNextByBounce"
    @keydown.arrow-right.prevent="selectNextStop"
    @keydown.arrow-down.prevent="selectNextStop"
    @keydown.arrow-left.prevent="selectPreviousStop"
    @keydown.arrow-up.prevent="selectPreviousStop"
  >
    <span class="multi-stop-toggle__track" aria-hidden="true">
      <span class="multi-stop-toggle__thumb"></span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

export type MultiStopToggleValue = string | number;

export type MultiStopToggleOption = {
  value: MultiStopToggleValue;
  label: string;
  ariaLabel?: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: MultiStopToggleValue;
    options: readonly MultiStopToggleOption[];
    ariaLabel?: string;
    disabled?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    ariaLabel: undefined,
    disabled: false,
    size: "md",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: MultiStopToggleValue];
  change: [value: MultiStopToggleValue];
}>();

const bounceDirection = ref<1 | -1>(1);

const maxIndex = computed(() => Math.max(props.options.length - 1, 0));

const activeIndex = computed(() => {
  const index = props.options.findIndex(
    (option) => option.value === props.modelValue,
  );
  return index >= 0 ? index : 0;
});

const activeOption = computed(() => props.options[activeIndex.value] ?? null);

const activeValueText = computed(
  () => activeOption.value?.ariaLabel ?? activeOption.value?.label ?? "",
);

const toggleStyle = computed(() => ({
  "--multi-stop-toggle-index": String(activeIndex.value),
  "--multi-stop-toggle-count": String(Math.max(props.options.length, 2)),
}));

const selectOptionAt = (index: number) => {
  if (props.disabled || props.options.length === 0) {
    return;
  }

  const nextOption = props.options[index];
  if (!nextOption || nextOption.value === props.modelValue) {
    return;
  }

  emit("update:modelValue", nextOption.value);
  emit("change", nextOption.value);
};

const syncBounceDirectionForIndex = (index: number) => {
  if (index <= 0) {
    bounceDirection.value = 1;
    return;
  }
  if (index >= maxIndex.value) {
    bounceDirection.value = -1;
  }
};

const selectNextByBounce = () => {
  if (props.options.length === 0) {
    return;
  }
  let nextIndex = activeIndex.value + bounceDirection.value;
  if (nextIndex > maxIndex.value) {
    bounceDirection.value = -1;
    nextIndex = Math.max(maxIndex.value - 1, 0);
  }
  if (nextIndex < 0) {
    bounceDirection.value = 1;
    nextIndex = Math.min(1, maxIndex.value);
  }
  selectOptionAt(nextIndex);
  syncBounceDirectionForIndex(nextIndex);
};

const selectNextStop = () => {
  if (props.options.length === 0) {
    return;
  }
  const nextIndex = Math.min(activeIndex.value + 1, maxIndex.value);
  selectOptionAt(nextIndex);
  syncBounceDirectionForIndex(nextIndex);
};

const selectPreviousStop = () => {
  if (props.options.length === 0) {
    return;
  }
  const nextIndex = Math.max(activeIndex.value - 1, 0);
  selectOptionAt(nextIndex);
  syncBounceDirectionForIndex(nextIndex);
};
</script>

<style lang="scss" scoped>
.multi-stop-toggle {
  --multi-stop-toggle-track-padding: 0.2rem;
  --multi-stop-toggle-thumb-size: 1.35rem;
  --multi-stop-toggle-step: 1.2rem;
  --multi-stop-toggle-track-width: calc(
    var(--multi-stop-toggle-thumb-size) +
      (var(--multi-stop-toggle-step) * (var(--multi-stop-toggle-count) - 1)) +
      (var(--multi-stop-toggle-track-padding) * 2)
  );
  --multi-stop-toggle-track-height: calc(
    var(--multi-stop-toggle-thumb-size) +
      (var(--multi-stop-toggle-track-padding) * 2)
  );
  --multi-stop-toggle-track-radius: calc(
    var(--multi-stop-toggle-track-height) / 2
  );

  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  user-select: none;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--multi-stop-toggle-track-radius);
  }
}

.multi-stop-toggle.is-disabled {
  cursor: not-allowed;
  opacity: var(--sys-opacity-disabled);
}

.multi-stop-toggle--size-sm {
  --multi-stop-toggle-track-padding: 0.18rem;
  --multi-stop-toggle-thumb-size: 1.08rem;
  --multi-stop-toggle-step: 1rem;
}

.multi-stop-toggle--size-md {
  --multi-stop-toggle-track-padding: 0.2rem;
  --multi-stop-toggle-thumb-size: 1.35rem;
  --multi-stop-toggle-step: 1.2rem;
}

.multi-stop-toggle__track {
  position: relative;
  display: block;
  width: var(--multi-stop-toggle-track-width);
  height: var(--multi-stop-toggle-track-height);
  border-radius: var(--multi-stop-toggle-track-radius);
  background: var(--sys-color-surface-container-highest);
  transition: background-color 180ms ease;
}

.multi-stop-toggle__thumb {
  position: absolute;
  top: var(--multi-stop-toggle-track-padding);
  left: var(--multi-stop-toggle-track-padding);
  width: var(--multi-stop-toggle-thumb-size);
  height: var(--multi-stop-toggle-thumb-size);
  border-radius: var(--sys-radius-full);
  background: var(--sys-color-primary);
  box-shadow: var(--sys-elevation-level1);
  transform: translateX(
    calc(var(--multi-stop-toggle-index) * var(--multi-stop-toggle-step))
  );
  transition:
    transform 180ms ease,
    background-color 180ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .multi-stop-toggle__track,
  .multi-stop-toggle__thumb {
    transition: none !important;
  }
}
</style>
