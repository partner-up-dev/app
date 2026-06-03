<template>
  <article class="spu-card" :data-testid="dataTestid">
    <div class="spu-card__thumb" aria-hidden="true">
      <img
        v-if="resolvedThumbnailSrc && !thumbnailFailed"
        :src="resolvedThumbnailSrc"
        :alt="title"
        @error="thumbnailFailed = true"
      />
      <span v-else class="i-mdi-storefront-outline"></span>
    </div>
    <div class="spu-card__body">
      <strong data-testid="ordering.rental.product-name">{{ title }}</strong>
      <p v-if="description">{{ description }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string | null;
    thumbnailSrc?: string | null;
    dataTestid?: string;
  }>(),
  {
    description: null,
    thumbnailSrc: null,
    dataTestid: "ordering.spu-card",
  },
);

const thumbnailFailed = ref(false);

const resolvedThumbnailSrc = computed(() => {
  const value = props.thumbnailSrc?.trim() ?? "";
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return null;
});

watch(
  () => props.thumbnailSrc,
  () => {
    thumbnailFailed.value = false;
  },
);
</script>

<style scoped lang="scss">
.spu-card {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
  width: 100%;
  min-width: 0;
  color: var(--sys-color-on-surface);
}

.spu-card__thumb {
  display: grid;
  width: 4.5rem;
  height: 4.5rem;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  span {
    @include mx.pu-icon(large);
  }
}

.spu-card__body {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-xxsmall);

  strong {
    @include mx.pu-font(title-medium);
    overflow-wrap: anywhere;
  }

  p {
    @include mx.pu-font(body-small);
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--sys-color-on-surface-variant);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
