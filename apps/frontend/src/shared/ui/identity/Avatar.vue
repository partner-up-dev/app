<template>
  <div
    class="ui-avatar"
    :class="[
      `ui-avatar--size-${size}`,
      `ui-avatar--shape-${shape}`,
      { 'ui-avatar--bordered': bordered },
    ]"
  >
    <img
      v-if="src"
      class="ui-avatar__image"
      :src="src"
      :alt="resolvedAlt"
      loading="lazy"
      decoding="async"
    />
    <div
      v-else
      class="ui-avatar__fallback"
      :aria-hidden="fallbackAriaHidden"
      :role="fallbackAriaHidden ? undefined : 'img'"
      :aria-label="fallbackAriaHidden ? undefined : resolvedAlt"
    >
      <span>{{ fallbackText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type AvatarShape = "circle" | "rounded";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    name?: string | null;
    fallback?: string | null;
    size?: AvatarSize;
    shape?: AvatarShape;
    bordered?: boolean;
  }>(),
  {
    src: null,
    alt: "",
    name: null,
    fallback: null,
    size: "md",
    shape: "circle",
    bordered: false,
  },
);

const fallbackText = computed(() => {
  const explicitFallback = props.fallback?.trim();
  if (explicitFallback) {
    return explicitFallback;
  }
  const normalizedName = props.name?.trim();
  if (normalizedName) {
    return normalizedName.slice(0, 1).toUpperCase();
  }
  return "?";
});

const resolvedAlt = computed(() => {
  if (props.alt.trim().length > 0) {
    return props.alt;
  }
  return props.name?.trim() ?? "";
});

const fallbackAriaHidden = computed(() => resolvedAlt.value.length === 0);
</script>

<style lang="scss" scoped>
.ui-avatar {
  position: relative;
  flex-shrink: 0;
}

.ui-avatar--size-sm {
  width: 2rem;
  height: 2rem;
}

.ui-avatar--size-md {
  width: 3rem;
  height: 3rem;
}

.ui-avatar--size-lg {
  width: 4.75rem;
  height: 4.75rem;
}

.ui-avatar--size-xl {
  width: 5.5rem;
  height: 5.5rem;
}

.ui-avatar--shape-circle,
.ui-avatar--shape-circle .ui-avatar__image,
.ui-avatar--shape-circle .ui-avatar__fallback {
  border-radius: 999px;
}

.ui-avatar--shape-rounded,
.ui-avatar--shape-rounded .ui-avatar__image,
.ui-avatar--shape-rounded .ui-avatar__fallback {
  border-radius: var(--sys-radius-medium);
}

.ui-avatar--bordered .ui-avatar__image,
.ui-avatar--bordered .ui-avatar__fallback {
  border: 1px solid var(--sys-color-outline-variant);
}

.ui-avatar__image,
.ui-avatar__fallback {
  display: flex;
  width: 100%;
  height: 100%;
}

.ui-avatar__image {
  object-fit: cover;
}

.ui-avatar__fallback {
  align-items: center;
  justify-content: center;
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
}

.ui-avatar--size-sm .ui-avatar__fallback span {
  @include mx.pu-font(control);
}

.ui-avatar--size-md .ui-avatar__fallback span {
  @include mx.pu-font(section);
}

.ui-avatar--size-lg .ui-avatar__fallback span {
  @include mx.pu-font(title);
}

.ui-avatar--size-xl .ui-avatar__fallback span {
  @include mx.pu-font(title);
}
</style>
