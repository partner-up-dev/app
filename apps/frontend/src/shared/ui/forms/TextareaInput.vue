<template>
  <div class="textarea-input">
    <textarea
      :id="inputId"
      class="textarea-input__control"
      :value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxLength"
      :style="controlStyle"
      @input="
        $emit(
          'update:modelValue',
          ($event.target as HTMLTextAreaElement).value,
        )
      "
    />

    <span v-if="showCount" class="textarea-input__count">
      <template v-if="maxLength !== undefined">
        {{ currentLength }} / {{ maxLength }}
      </template>
      <template v-else>
        {{ currentLength }}
      </template>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    inputId?: string;
    modelValue?: string;
    disabled?: boolean;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    showCount?: boolean;
    minHeight?: string;
  }>(),
  {
    inputId: undefined,
    modelValue: "",
    disabled: false,
    placeholder: "",
    rows: 3,
    maxLength: undefined,
    showCount: false,
    minHeight: undefined,
  },
);

defineEmits<{
  "update:modelValue": [value: string];
}>();

const currentLength = computed(() => props.modelValue.length);
const controlStyle = computed(() =>
  props.minHeight
    ? {
        "--textarea-input-min-height": props.minHeight,
      }
    : undefined,
);
</script>

<style scoped lang="scss">
.textarea-input {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  width: 100%;
  min-width: 0;
}

.textarea-input__control {
  @include mx.pu-font(body);
  width: 100%;
  border: 1px solid var(--sys-color-outline);
  color: var(--sys-color-on-surface);
  background: transparent;
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-xsmall);
  resize: vertical;
  min-height: var(--textarea-input-min-height, 7.5rem);

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
    opacity: 0.6;
  }

  &:focus {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -1px;
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
  }
}

.textarea-input__count {
  @include mx.pu-font(caption);
  color: var(--sys-color-on-surface-variant);
  text-align: right;
}
</style>
