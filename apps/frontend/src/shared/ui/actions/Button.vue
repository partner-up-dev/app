<template>
  <button
    class="ui-button"
    :class="[
      `ui-button--appearance-${props.appearance}`,
      `ui-button--tone-${resolvedTone}`,
      `ui-button--size-${props.size}`,
      {
        'ui-button--block': isBlock,
        'ui-button--full-width': isBlock,
        'is-loading': props.loading,
      },
    ]"
    :type="props.type"
    :form="props.form"
    :disabled="props.disabled || props.loading"
    @click="$emit('click', $event)"
  >
    <span
      v-if="$slots.leading && !props.loading"
      class="ui-button__leading"
      aria-hidden="true"
    >
      <slot name="leading" />
    </span>
    <span
      v-if="props.loading"
      class="ui-button__spinner"
      aria-hidden="true"
    ></span>
    <span class="ui-button__content">
      <slot />
    </span>
    <span
      v-if="$slots.trailing && !props.loading"
      class="ui-button__trailing"
      aria-hidden="true"
    >
      <slot name="trailing" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

type ButtonAppearance = "rect" | "pill";
type ButtonTone =
  | "primary"
  | "primary-outline"
  | "secondary"
  | "outline"
  | "surface"
  | "tertiary"
  | "dashed"
  | "danger"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    form?: string;
    variant?: "primary" | "secondary";
    appearance?: ButtonAppearance;
    tone?: ButtonTone;
    size?: ButtonSize;
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    type: "button",
    form: undefined,
    variant: undefined,
    appearance: "rect",
    tone: undefined,
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    fullWidth: false,
  },
);

const resolvedTone = computed<ButtonTone>(() => {
  if (props.tone) {
    return props.tone;
  }
  return props.variant === "secondary" ? "secondary" : "primary";
});

const isBlock = computed(() => props.block || props.fullWidth);

defineEmits<{
  click: [event: MouseEvent];
}>();
</script>

<style lang="scss" scoped>
.ui-button {
  position: relative;
  min-width: 0;
  border: 1px solid transparent;
  text-decoration: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    opacity 180ms ease,
    filter 180ms ease;

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ui-button--block,
.ui-button--full-width {
  width: 100%;
}

.ui-button--appearance-rect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
}

.ui-button--appearance-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  border-radius: 999px;
}

.ui-button--appearance-rect.ui-button--tone-primary {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.ui-button--appearance-rect.ui-button--tone-secondary {
  border-color: var(--sys-color-secondary);
  background: transparent;
  color: var(--sys-color-secondary);
}

.ui-button--appearance-rect.ui-button--tone-primary-outline {
  border-color: var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.ui-button--appearance-rect.ui-button--tone-outline {
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-rect.ui-button--tone-surface {
  border-color: var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-rect.ui-button--tone-danger {
  border-color: var(--sys-color-error);
  background: transparent;
  color: var(--sys-color-error);
}

.ui-button--appearance-rect.ui-button--tone-tertiary {
  border: none;
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.ui-button--appearance-rect.ui-button--tone-dashed {
  border-style: dashed;
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-rect.ui-button--tone-ghost {
  background: transparent;
  color: var(--sys-color-on-surface);

  &:hover:not(:disabled) {
    background: var(--sys-color-surface-container-high);
  }
}

.ui-button--appearance-pill.ui-button--tone-primary {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.ui-button--appearance-pill.ui-button--tone-secondary {
  background: var(--sys-color-secondary);
  color: var(--sys-color-on-secondary);
}

.ui-button--appearance-pill.ui-button--tone-primary-outline {
  border-color: var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.ui-button--appearance-pill.ui-button--tone-outline {
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-pill.ui-button--tone-surface {
  background: var(--sys-color-surface-container-lowest);
  border-color: var(--sys-color-outline-variant);
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-pill.ui-button--tone-danger {
  background: transparent;
  border-color: var(--sys-color-error);
  color: var(--sys-color-error);
}

.ui-button--appearance-pill.ui-button--tone-tertiary {
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.ui-button--appearance-pill.ui-button--tone-dashed {
  border-style: dashed;
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-button--appearance-pill.ui-button--tone-ghost {
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-button--size-sm {
  @include mx.pu-font(control);
}

.ui-button--size-md {
  @include mx.pu-font(control);
}

.ui-button--size-lg {
  @include mx.pu-font(section);
}

.ui-button--appearance-rect.ui-button--size-sm {
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.ui-button--appearance-rect.ui-button--size-md {
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.ui-button--appearance-rect.ui-button--size-lg {
  min-height: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-small));
  padding: var(--sys-spacing-medium) var(--sys-spacing-large);
}

.ui-button--appearance-pill.ui-button--size-sm {
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.ui-button--appearance-pill.ui-button--size-md {
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.ui-button--appearance-pill.ui-button--size-lg {
  min-height: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-small));
  padding: var(--sys-spacing-small) var(--sys-spacing-large);
}

.ui-button--appearance-pill.ui-button--tone-surface:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-danger:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-tertiary:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-dashed:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-ghost:hover:not(:disabled),
.ui-button--appearance-pill.ui-button--tone-primary-outline:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-primary:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-primary-outline:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-secondary:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-outline:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-surface:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-tertiary:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-dashed:hover:not(:disabled),
.ui-button--appearance-rect.ui-button--tone-danger:hover:not(:disabled) {
  filter: brightness(0.98);
}

.ui-button:active:not(:disabled) {
  transform: scale(0.99);
}

.ui-button__content {
  min-width: 0;
}

.ui-button__leading,
.ui-button__trailing,
.ui-button__spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ui-button__leading :deep([class^="i-"]),
.ui-button__leading :deep([class*=" i-"]),
.ui-button__trailing :deep([class^="i-"]),
.ui-button__trailing :deep([class*=" i-"]) {
  @include mx.pu-icon(small);
}

.ui-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ui-button-spin 0.8s linear infinite;
}

.is-loading .ui-button__content {
  opacity: 0.92;
}

@media (prefers-reduced-motion: reduce) {
  .ui-button,
  .ui-button__spinner {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes ui-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
