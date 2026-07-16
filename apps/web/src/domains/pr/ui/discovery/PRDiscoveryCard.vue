<template>
  <component
    :is="rootComponent"
    v-bind="rootProps"
    class="pr-discovery-card"
    :class="{
      'pr-discovery-card--select': isSelectMode,
      'pr-discovery-card--shorter': isShorter,
      'pr-discovery-card--outline': isOutline,
      'pr-discovery-card--selected': isSelectMode && props.selected,
      'pr-discovery-card--disabled': isSelectMode && props.disabled,
    }"
    :aria-disabled="isSelectMode && props.disabled ? 'true' : undefined"
    @click="handleClick"
  >
    <div
      class="pr-discovery-card__cover-shell"
      data-testid="prd.discovery-card.cover"
      :class="{ 'pr-discovery-card__cover-shell--shorter': isShorter }"
    >
      <PuImg
        v-if="displayCoverImage"
        class="pr-discovery-card__cover"
        :src="displayCoverImage"
        alt=""
        mode="aspectFill"
        :show-loading="false"
      />
      <div v-else class="pr-discovery-card__cover pr-discovery-card__cover--placeholder">
        <span>{{ item.type }}</span>
      </div>

      <PuChipGroup
        v-if="isShorter && placeLabels.length > 0"
        class="pr-discovery-card__place-tags pr-discovery-card__place-tags--overlay"
        data-testid="prd.discovery-card.place-tags"
        gap="xs"
        fit
      >
        <PuChip
          v-for="placeLabel in visiblePlaceLabels"
          :key="placeLabel"
          class="pr-discovery-card__place-pill pr-discovery-card__place-pill--overlay"
          tone="neutral"
          size="sm"
        >
          {{ placeLabel }}
        </PuChip>
      </PuChipGroup>
    </div>

    <div class="pr-discovery-card__summary">
      <PuChipGroup
        v-if="!isShorter && placeLabels.length > 0"
        class="pr-discovery-card__place-tags"
        data-testid="prd.discovery-card.place-tags"
        gap="xs"
        fit
      >
        <PuChip
          v-for="placeLabel in visiblePlaceLabels"
          :key="placeLabel"
          class="pr-discovery-card__place-pill"
          tone="neutral"
          size="sm"
        >
          {{ placeLabel }}
        </PuChip>
      </PuChipGroup>
      <div class="flex flex-col gap-1">
        <h3 class="pr-discovery-card__title" data-testid="prd.discovery-card.title">{{ item.title }}</h3>
        <p
          v-if="item.description"
          class="pr-discovery-card__description"
          data-testid="prd.discovery-card.description"
        >
          {{ item.description }}
        </p>
      </div>
      <span v-if="!isSelectMode && !isShorter" class="pr-discovery-card__cta">
        {{ t("prDiscovery.catalogOpenAction") }}
        <span class="pr-discovery-card__cta-icon i-mdi:arrow-right" aria-hidden="true" />
      </span>
    </div>
  </component>
</template>

<script setup lang="ts">
import { PuChip, PuChipGroup, PuImg } from "@partner-up-dev/design-web";
import { computed, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { PRDiscoveryCatalogItem } from "@/domains/pr/model/pr-discovery-types";
import { prDiscoveryTypePath } from "@/domains/pr/routing/discovery";

interface PRDiscoveryCardProps {
  item: PRDiscoveryCatalogItem;
  mode?: "link" | "select";
  variant?: "default" | "shorter";
  surface?: "filled" | "outline";
  selected?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<PRDiscoveryCardProps>(), {
  mode: "link",
  variant: "default",
  surface: "filled",
  selected: false,
  disabled: false,
});
const MAX_PLACE_LABELS = 3;

const emit = defineEmits<{
  click: [type: string];
}>();

const { t } = useI18n();
const isSelectMode = computed(() => props.mode === "select");
const isShorter = computed(() => props.variant === "shorter");
const isOutline = computed(() => props.surface === "outline");
const rootComponent = computed(() => (isSelectMode.value ? "div" : RouterLink));
const rootProps = computed<Record<string, unknown>>(() =>
  isSelectMode.value
    ? {}
    : {
        to: prDiscoveryTypePath(props.item.type),
      },
);

const normalizeNonEmptyString = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeImageGallery = (value: readonly string[]): string[] => {
  const uniqueUrls = new Set<string>();
  for (const item of value) {
    const normalizedUrl = normalizeNonEmptyString(item);
    if (!normalizedUrl) {
      continue;
    }
    uniqueUrls.add(normalizedUrl);
  }

  return Array.from(uniqueUrls);
};

const coverImage = computed(() => normalizeNonEmptyString(props.item.coverImage));
const poiNames = computed(() => {
  const uniqueNames: string[] = [];
  const nameSet = new Set<string>();
  for (const poi of props.item.pois) {
    const normalizedName = normalizeNonEmptyString(poi.name);
    if (!normalizedName || nameSet.has(normalizedName)) continue;
    nameSet.add(normalizedName);
    uniqueNames.push(normalizedName);
  }

  return uniqueNames;
});

const placeLabels = computed(() => {
  if (poiNames.value.length > 0) {
    return poiNames.value;
  }

  const uniqueLocations: string[] = [];
  const locationSet = new Set<string>();
  for (const location of props.item.locationPool) {
    const normalizedLocation = location.trim();
    if (!normalizedLocation || locationSet.has(normalizedLocation)) continue;
    locationSet.add(normalizedLocation);
    uniqueLocations.push(normalizedLocation);
  }
  return uniqueLocations;
});

const poiGalleryImages = computed(() => {
  const uniqueUrls = new Set<string>();
  for (const poi of props.item.pois) {
    const gallery = poi.gallery;
    for (const imageUrl of normalizeImageGallery(gallery)) {
      uniqueUrls.add(imageUrl);
    }
  }

  return Array.from(uniqueUrls);
});

const poiGalleryCoverImage = computed(() => poiGalleryImages.value[0] ?? null);

const fallbackGalleryImages = computed(() => normalizeImageGallery(props.item.fallbackGallery));

const fallbackIndex = ref(0);
const activeFallbackImage = computed(() => {
  if (coverImage.value || poiGalleryCoverImage.value || fallbackGalleryImages.value.length === 0) {
    return null;
  }

  const safeIndex = fallbackIndex.value % fallbackGalleryImages.value.length;
  return fallbackGalleryImages.value[safeIndex] ?? null;
});

const displayCoverImage = computed(
  () => coverImage.value ?? poiGalleryCoverImage.value ?? activeFallbackImage.value,
);
const visiblePlaceLabels = computed(() => placeLabels.value.slice(0, MAX_PLACE_LABELS));

watch(fallbackGalleryImages, () => {
  fallbackIndex.value = 0;
});

let fallbackTimerId: number | null = null;

const clearFallbackTimer = () => {
  if (fallbackTimerId !== null) {
    window.clearInterval(fallbackTimerId);
    fallbackTimerId = null;
  }
};

watchEffect((onCleanup) => {
  if (typeof window === "undefined") {
    return;
  }

  if (coverImage.value || poiGalleryCoverImage.value || fallbackGalleryImages.value.length <= 1) {
    clearFallbackTimer();
    return;
  }

  clearFallbackTimer();
  fallbackTimerId = window.setInterval(() => {
    fallbackIndex.value = (fallbackIndex.value + 1) % fallbackGalleryImages.value.length;
  }, 2200);

  onCleanup(() => {
    clearFallbackTimer();
  });
});

onBeforeUnmount(() => {
  clearFallbackTimer();
});

const handleClick = () => {
  if (props.disabled) return;
  emit("click", props.item.type);
};
</script>

<style lang="scss" scoped>
.pr-discovery-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: hidden;
  width: 100%;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  text-align: left;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease,
    opacity 180ms ease;
  @include mx.pu-elevation(3);

  &:active:not(.pr-discovery-card--select) {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.pr-discovery-card--select {
  cursor: inherit;
}

.pr-discovery-card--selected {
  @include mx.pu-elevation(4);
}

.pr-discovery-card--disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.pr-discovery-card--outline {
  background: transparent;
  border-color: var(--sys-color-outline-variant);
  box-shadow: none;
}

.pr-discovery-card__cover {
  display: block;
  width: 100%;
  height: 130px;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    @include mx.pu-font(title);
  }
}

.pr-discovery-card__cover-shell {
  position: relative;
}

.pr-discovery-card__cover-shell--shorter::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  block-size: 56%;
  background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 55%) 100%);
  pointer-events: none;
}

.pr-discovery-card__place-tags--overlay {
  position: absolute;
  inset: auto var(--sys-spacing-small) var(--sys-spacing-small);
  z-index: 1;
  min-width: 0;
}

.pr-discovery-card__summary {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
}

.pr-discovery-card__place-tags {
  min-height: calc(var(--sys-spacing-medium) + var(--sys-spacing-small));
}

.pr-discovery-card__place-pill {
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface-variant);
  border-color: var(--sys-color-outline-variant);
}

.pr-discovery-card__place-pill--overlay {
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
  border-color: transparent;
}

.pr-discovery-card__title {
  @include mx.pu-font(body);
  color: var(--sys-color-on-surface);
  margin: 0;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.pr-discovery-card__description {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.pr-discovery-card__cta {
  @include mx.pu-font(control);
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  margin-top: auto;
  color: var(--sys-color-secondary);
}

.pr-discovery-card__cta-icon {
  @include mx.pu-icon(small);
}

.pr-discovery-card--shorter .pr-discovery-card__cover {
  height: 104px;
}

.pr-discovery-card--shorter .pr-discovery-card__summary {
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-small) var(--sys-spacing-medium)
    var(--sys-spacing-medium);
}

.pr-discovery-card--outline:hover,
.pr-discovery-card--outline:focus-visible {
  box-shadow: none;
}
</style>
