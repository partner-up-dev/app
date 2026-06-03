<template>
  <section class="inline-place-selector">
    <div class="inline-place-selector__field">
      <span class="inline-place-selector__label">{{ label }}</span>

      <div class="inline-place-selector__preview">
        <RouteMap
          v-if="selectedOption?.kind === 'route'"
          :route="selectedOption.route"
          :interactive="false"
          :fit-padding="36"
          :max-zoom="15"
          variant="inline"
          hide-bottom-attribution
        />

        <SharedMap
          v-else-if="
            selectedOption?.kind === 'location' && selectedOption.coordinate
          "
          :markers="locationMarkers"
          :active-geometry="{ kind: 'all' }"
          :fit-padding="44"
          :max-zoom="16"
          :interactive="false"
          variant="inline"
          :loading-message="t('route.mapLoading')"
          :unavailable-message="t('route.mapUnavailable')"
          :error-message="t('route.mapFailed')"
          hide-bottom-attribution
        />

        <div v-else class="inline-place-selector__fallback">
          <span
            class="inline-place-selector__fallback-icon i-mdi-map-marker-path"
            aria-hidden="true"
          ></span>
          <span>{{ fallbackText }}</span>
        </div>
      </div>

      <select
        :value="modelValue ?? ''"
        class="inline-place-selector__input"
        :aria-label="label"
        data-testid="anchor-event-inline-place-selector.select"
        @change="handleChange"
      >
        <option value="">
          {{ placeholder }}
        </option>
        <option
          v-for="option in options"
          :key="option.id"
          :value="option.id"
          :disabled="option.disabled"
        >
          {{ formatOptionLabel(option) }}
        </option>
      </select>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import SharedMap from "@/shared/map/Map.vue";
import type { MapMarker } from "@/shared/map/types";
import {
  findAnchorEventPlaceOption,
  type AnchorEventPlaceOption,
} from "@/domains/event/model/place-options";

const props = defineProps<{
  modelValue: string | null;
  options: readonly AnchorEventPlaceOption[];
  label: string;
  placeholder: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const selectedOption = computed(() =>
  findAnchorEventPlaceOption(props.options, props.modelValue),
);

const locationMarkers = computed<MapMarker[]>(() => {
  const option = selectedOption.value;
  if (option?.kind !== "location" || !option.coordinate) {
    return [];
  }

  return [
    {
      id: option.id,
      position: option.coordinate,
      title: option.label,
      icon: "routeStart",
    },
  ];
});

const fallbackText = computed(() => {
  if (selectedOption.value?.kind === "location") {
    return t("anchorEvent.createCard.locationMapFallback", {
      place: selectedOption.value.label,
    });
  }
  return props.placeholder;
});

const formatOptionLabel = (option: AnchorEventPlaceOption): string => {
  if (option.kind === "route") {
    return option.label;
  }

  if (option.disabled && option.disabledReason === "TIME_UNAVAILABLE") {
    return t("anchorEvent.createCard.optionTimeUnavailable", {
      locationId: option.locationId,
    });
  }

  if (option.disabled && option.disabledReason === "MAX_REACHED") {
    return t("anchorEvent.createCard.optionMaxReached", {
      locationId: option.locationId,
    });
  }

  if (option.remainingQuota === null) {
    return option.label;
  }

  return t("anchorEvent.createCard.optionRemaining", {
    locationId: option.locationId,
    count: option.remainingQuota,
  });
};

const handleChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement | null;
  const value = target?.value.trim() ?? "";
  emit("update:modelValue", value.length > 0 ? value : null);
};
</script>

<style scoped lang="scss">
.inline-place-selector,
.inline-place-selector__field {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.inline-place-selector {
  gap: var(--sys-spacing-small);
}

.inline-place-selector__preview {
  height: 148px;
  min-width: 0;
}

.inline-place-selector__preview :deep(.route-map--inline) {
  height: 100%;
}

.inline-place-selector__preview :deep(.map-shell--inline),
.inline-place-selector__preview :deep(.route-map__fallback) {
  height: 100%;
  min-height: 100%;
  aspect-ratio: auto;
}

.inline-place-selector__fallback {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface-variant);
  text-align: center;
}

.inline-place-selector__fallback-icon {
  @include mx.pu-icon(large);
}

.inline-place-selector__field {
  gap: var(--sys-spacing-xsmall);
}

.inline-place-selector__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.inline-place-selector__input {
  width: 100%;
  min-height: var(--sys-size-large);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}
</style>
