<template>
  <div class="info-row-action">
    <div v-if="hasLabel" class="info-row-action__label">
      <slot name="label">
        {{ props.label }}
      </slot>
    </div>

    <button
      class="info-row-action__button"
      type="button"
      :aria-label="props.ariaLabel"
      :disabled="props.disabled"
      @click="emit('click', $event)"
    >
      <span v-if="hasValue" class="info-row-action__value">
        <slot>
          {{ props.value }}
        </slot>
      </span>
      <span
        v-if="props.suffixIcon"
        class="info-row-action__suffix"
        aria-hidden="true"
      >
        <span :class="props.suffixIcon"></span>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    value?: string | number | null;
    suffixIcon?: string;
    ariaLabel?: string;
    disabled?: boolean;
  }>(),
  {
    label: undefined,
    value: null,
    suffixIcon: "i-mdi-chevron-right",
    ariaLabel: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const slots = useSlots();

const hasLabel = computed(() => Boolean(slots.label) || Boolean(props.label));
const hasValue = computed(
  () =>
    Boolean(slots.default) ||
    (props.value !== null &&
      props.value !== undefined &&
      String(props.value).length > 0),
);
</script>

<style lang="scss" scoped>
.info-row-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.info-row-action__label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;
}

.info-row-action__button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: var(--sys-radius-small);
  background: transparent;
  color: var(--sys-color-secondary);
  cursor: pointer;
  appearance: none;
}

.info-row-action__button:disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
}

.info-row-action__button:focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.info-row-action__value {
  @include mx.pu-font(control);
  min-width: 0;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row-action__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-row-action__suffix :deep([class^="i-"]),
.info-row-action__suffix :deep([class*=" i-"]) {
  @include mx.pu-icon(small);
}
</style>
