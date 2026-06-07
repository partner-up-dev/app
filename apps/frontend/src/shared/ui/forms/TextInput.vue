<template>
  <input
    :id="inputId"
    class="text-input"
    :type="type"
    :value="modelValue"
    :disabled="disabled"
    :placeholder="placeholder"
    :inputmode="inputmode"
    :autocomplete="autocomplete"
    :maxlength="maxLength"
    @input="
      $emit('update:modelValue', ($event.target as HTMLInputElement).value)
    "
  />
</template>

<script setup lang="ts">
type TextInputType =
  | "text"
  | "url"
  | "email"
  | "tel"
  | "search"
  | "number"
  | "password";

withDefaults(
  defineProps<{
    inputId?: string;
    modelValue?: string;
    type?: TextInputType;
    disabled?: boolean;
    placeholder?: string;
    inputmode?:
      | "none"
      | "text"
      | "decimal"
      | "numeric"
      | "tel"
      | "search"
      | "email"
      | "url";
    autocomplete?: string;
    maxLength?: number;
  }>(),
  {
    inputId: undefined,
    modelValue: "",
    type: "text",
    disabled: false,
    placeholder: "",
    inputmode: undefined,
    autocomplete: undefined,
    maxLength: undefined,
  },
);

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<style scoped lang="scss">
.text-input {
  @include mx.pu-font(body);
  width: 100%;
  min-width: 0;
  border: 1px solid var(--sys-color-outline);
  color: var(--sys-color-on-surface);
  background: transparent;
  padding: var(--sys-spacing-small);
  border-radius: var(--sys-radius-xsmall);

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
</style>
