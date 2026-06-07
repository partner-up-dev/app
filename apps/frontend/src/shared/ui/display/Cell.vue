<template>
  <component
    :is="props.as"
    class="ui-cell"
    :class="{ 'ui-cell--border': props.border }"
    :type="props.as === 'button' ? props.type : undefined"
  >
    <div v-if="hasTitle" class="ui-cell__title">
      <slot name="title">
        {{ props.title }}
      </slot>
    </div>

    <div v-if="hasRight" class="ui-cell__right">
      <div v-if="hasValue" class="ui-cell__value">
        <slot>
          {{ props.value }}
        </slot>
      </div>

      <span v-if="hasSuffix" class="ui-cell__suffix" aria-hidden="true">
        <slot name="suffix">
          <span v-if="props.suffixIcon" :class="props.suffixIcon"></span>
        </slot>
      </span>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    as?: string;
    type?: "button" | "submit" | "reset";
    border?: boolean;
    title?: string;
    value?: string | number | null;
    suffixIcon?: string;
  }>(),
  {
    as: "div",
    type: "button",
    border: false,
    title: undefined,
    value: null,
    suffixIcon: undefined,
  },
);

const slots = useSlots();

const hasTitle = computed(() => Boolean(slots.title) || Boolean(props.title));
const hasValue = computed(
  () =>
    Boolean(slots.default) ||
    (props.value !== null &&
      props.value !== undefined &&
      String(props.value).length > 0),
);
const hasSuffix = computed(
  () => Boolean(slots.suffix) || Boolean(props.suffixIcon),
);
const hasRight = computed(() => hasValue.value || hasSuffix.value);
</script>

<style lang="scss" scoped>
.ui-cell {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
  min-height: calc(var(--sys-spacing-large) + var(--sys-spacing-small) + var(--sys-spacing-xsmall));
  box-sizing: border-box;
  padding: var(--sys-spacing-small) 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--sys-color-on-surface);
  text-decoration: none;
}

.ui-cell--border {
  border-bottom: 1px solid var(--sys-color-outline-variant);
}

.ui-cell:is(button) {
  cursor: pointer;
  text-align: left;
  appearance: none;
}

.ui-cell:is(a) {
  cursor: pointer;
}

.ui-cell:is(button, a):hover {
  background: var(--sys-color-surface-container-low);
}

.ui-cell:is(button, a):focus-visible {
  outline: 2px solid var(--sys-color-primary);
  outline-offset: 2px;
}

.ui-cell__title,
.ui-cell__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-cell__title {
  @include mx.pu-font(body);
  flex: 0 1 auto;
  color: var(--sys-color-on-surface);
}

.ui-cell__right {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);
  flex: 1 1 auto;
  min-width: 0;
}

.ui-cell__value {
  @include mx.pu-font(body);
  flex: 0 1 auto;
  color: var(--sys-color-on-surface-variant);
  text-align: right;
}

.ui-cell__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--sys-color-on-surface-variant);
}

.ui-cell__suffix :deep([class^="i-"]),
.ui-cell__suffix :deep([class*=" i-"]) {
  @include mx.pu-icon(medium);
}
</style>
