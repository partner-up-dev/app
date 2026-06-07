<template>
  <component :is="as" class="form-field">
    <div v-if="label || $slots.labelTrailing" class="form-field__header">
      <label v-if="label" class="form-field__label" :for="forId">
        {{ label }}
        <span v-if="required" class="form-field__required" aria-hidden="true">
          *
        </span>
      </label>
      <slot name="labelTrailing" />
    </div>

    <div class="form-field__control">
      <slot />
    </div>

    <p v-if="error" class="form-field__message form-field__message--error">
      {{ error }}
    </p>
    <p v-else-if="hint" class="form-field__message form-field__message--hint">
      {{ hint }}
    </p>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
    label?: string;
    forId?: string;
    hint?: string | null;
    error?: string | null;
    required?: boolean;
  }>(),
  {
    as: "div",
    label: undefined,
    forId: undefined,
    hint: null,
    error: null,
    required: false,
  },
);
</script>

<style lang="scss" scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.form-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
}

.form-field__label {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.form-field__required {
  color: var(--sys-color-error);
}

.form-field__control {
  min-width: 0;
}

.form-field__message {
  margin: 0;
  @include mx.pu-font(support);
}

.form-field__message--hint {
  color: var(--sys-color-on-surface-variant);
}

.form-field__message--error {
  color: var(--sys-color-error);
}
</style>
