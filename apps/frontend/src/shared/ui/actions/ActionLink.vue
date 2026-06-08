<template>
  <component
    :is="rootComponent"
    class="ui-action-link"
    :class="[
      `ui-action-link--appearance-${props.appearance}`,
      `ui-action-link--tone-${props.tone}`,
      `ui-action-link--size-${props.size}`,
      {
        'ui-action-link--block': isBlock,
        'ui-action-link--full-width': isBlock,
        'is-disabled': props.disabled,
      },
    ]"
    v-bind="rootAttrs"
    :aria-disabled="props.disabled ? 'true' : undefined"
    :tabindex="props.disabled ? -1 : undefined"
    @click="handleClick"
  >
    <span
      v-if="$slots.leading"
      class="ui-action-link__leading"
      aria-hidden="true"
    >
      <slot name="leading" />
    </span>
    <span class="ui-action-link__label">
      <slot />
    </span>
    <span
      v-if="$slots.trailing"
      class="ui-action-link__trailing"
      aria-hidden="true"
    >
      <slot name="trailing" />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

type ActionLinkAppearance = "rect" | "pill";
type ActionLinkTone =
  | "primary"
  | "primary-outline"
  | "secondary"
  | "outline"
  | "surface"
  | "tertiary"
  | "dashed"
  | "danger"
  | "ghost";
type ActionLinkSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    to?: RouteLocationRaw;
    href?: string;
    target?: string;
    rel?: string;
    external?: boolean;
    appearance?: ActionLinkAppearance;
    tone?: ActionLinkTone;
    size?: ActionLinkSize;
    disabled?: boolean;
    block?: boolean;
    fullWidth?: boolean;
  }>(),
  {
    to: undefined,
    href: undefined,
    target: undefined,
    rel: undefined,
    external: false,
    appearance: "rect",
    tone: "primary",
    size: "md",
    disabled: false,
    block: false,
    fullWidth: false,
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const rootComponent = computed(() => (props.to ? RouterLink : "a"));
const resolvedTarget = computed(() =>
  props.target ?? (props.external ? "_blank" : undefined),
);
const resolvedRel = computed(() =>
  props.rel ??
  (resolvedTarget.value === "_blank" ? "noopener noreferrer" : undefined),
);

const rootAttrs = computed(() => {
  if (props.to) {
    return {
      to: props.to,
    };
  }

  return {
    href: props.href,
    target: resolvedTarget.value,
    rel: resolvedRel.value,
  };
});

const isBlock = computed(() => props.block || props.fullWidth);

const handleClick = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit("click", event);
};
</script>

<style lang="scss" scoped>
.ui-action-link {
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

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.ui-action-link.is-disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
  box-shadow: none;
}

.ui-action-link--block,
.ui-action-link--full-width {
  width: 100%;
}

.ui-action-link--appearance-rect {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  border-radius: var(--sys-radius-small);
}

.ui-action-link--appearance-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  border-radius: 999px;
}

.ui-action-link--appearance-rect.ui-action-link--tone-primary {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.ui-action-link--appearance-rect.ui-action-link--tone-secondary {
  border-color: var(--sys-color-secondary);
  background: transparent;
  color: var(--sys-color-secondary);
}

.ui-action-link--appearance-rect.ui-action-link--tone-primary-outline {
  border-color: var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.ui-action-link--appearance-rect.ui-action-link--tone-outline {
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-rect.ui-action-link--tone-surface {
  border-color: var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-rect.ui-action-link--tone-danger {
  border-color: var(--sys-color-error);
  background: transparent;
  color: var(--sys-color-error);
}

.ui-action-link--appearance-rect.ui-action-link--tone-tertiary {
  border: none;
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.ui-action-link--appearance-rect.ui-action-link--tone-dashed {
  border-style: dashed;
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-rect.ui-action-link--tone-ghost {
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-pill.ui-action-link--tone-primary {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.ui-action-link--appearance-pill.ui-action-link--tone-secondary {
  background: var(--sys-color-secondary);
  color: var(--sys-color-on-secondary);
}

.ui-action-link--appearance-pill.ui-action-link--tone-primary-outline {
  border-color: var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.ui-action-link--appearance-pill.ui-action-link--tone-outline {
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-pill.ui-action-link--tone-surface {
  background: var(--sys-color-surface-container-lowest);
  border-color: var(--sys-color-outline-variant);
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-pill.ui-action-link--tone-danger {
  background: transparent;
  border-color: var(--sys-color-error);
  color: var(--sys-color-error);
}

.ui-action-link--appearance-pill.ui-action-link--tone-tertiary {
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.ui-action-link--appearance-pill.ui-action-link--tone-dashed {
  border-style: dashed;
  border-color: var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--appearance-pill.ui-action-link--tone-ghost {
  background: transparent;
  color: var(--sys-color-on-surface);
}

.ui-action-link--size-sm {
  @include mx.pu-font(control);
}

.ui-action-link--size-md {
  @include mx.pu-font(control);
}

.ui-action-link--size-lg {
  @include mx.pu-font(section);
}

.ui-action-link--appearance-rect.ui-action-link--size-sm {
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.ui-action-link--appearance-rect.ui-action-link--size-md {
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.ui-action-link--appearance-rect.ui-action-link--size-lg {
  min-height: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-small));
  padding: var(--sys-spacing-medium) var(--sys-spacing-large);
}

.ui-action-link--appearance-pill.ui-action-link--size-sm {
  min-height: var(--sys-spacing-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.ui-action-link--appearance-pill.ui-action-link--size-md {
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.ui-action-link--appearance-pill.ui-action-link--size-lg {
  min-height: calc(calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall)) + var(--sys-spacing-small));
  padding: var(--sys-spacing-small) var(--sys-spacing-large);
}

.ui-action-link--appearance-pill.ui-action-link--tone-surface:hover,
.ui-action-link--appearance-pill.ui-action-link--tone-danger:hover,
.ui-action-link--appearance-pill.ui-action-link--tone-tertiary:hover,
.ui-action-link--appearance-pill.ui-action-link--tone-dashed:hover,
.ui-action-link--appearance-pill.ui-action-link--tone-ghost:hover,
.ui-action-link--appearance-pill.ui-action-link--tone-primary-outline:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-primary:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-primary-outline:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-secondary:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-outline:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-surface:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-tertiary:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-dashed:hover,
.ui-action-link--appearance-rect.ui-action-link--tone-danger:hover {
  filter: brightness(0.98);
}

.ui-action-link:active:not(.is-disabled) {
  transform: scale(0.99);
}

.ui-action-link__label {
  min-width: 0;
}

.ui-action-link__leading,
.ui-action-link__trailing {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ui-action-link__leading :deep([class^="i-"]),
.ui-action-link__leading :deep([class*=" i-"]),
.ui-action-link__trailing :deep([class^="i-"]),
.ui-action-link__trailing :deep([class*=" i-"]) {
  @include mx.pu-icon(small);
}

@media (prefers-reduced-motion: reduce) {
  .ui-action-link {
    transition: none !important;
  }
}
</style>
