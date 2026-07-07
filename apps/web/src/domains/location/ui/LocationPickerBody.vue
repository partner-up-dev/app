<template>
  <section class="location-picker-content">
    <PuInput
      :model-value="searchText"
      :placeholder="t('locationPicker.searchPlaceholder')"
      prefix-icon="i-mdi-magnify"
      clearable
      data-testid="location-picker.search"
      @update:model-value="updateSearchText"
      @clear="clearSearch"
    />

    <div class="location-picker-content__map">
      <div
        ref="mapContainerRef"
        class="location-picker-content__canvas"
        data-testid="location-picker.map"
      ></div>

      <div
        v-if="mapOverlayVisible"
        class="location-picker-content__map-overlay"
        role="status"
        aria-live="polite"
      >
        <PuInlineNotice
          :tone="mapStatus === 'error' ? 'error' : 'info'"
          :message="mapOverlayMessage"
          show-icon
        />
      </div>

      <div
        v-if="isResolvingAddress"
        class="location-picker-content__map-badge"
        role="status"
        aria-live="polite"
      >
        <span class="i-mdi-map-search" aria-hidden="true"></span>
        <span>{{ t("locationPicker.reverseResolving") }}</span>
      </div>
    </div>

    <section v-if="searchResultSurfaceVisible" class="location-picker-content__results">
      <h2>{{ t("locationPicker.resultsTitle") }}</h2>

      <div v-if="searchCandidates.length > 0" class="location-picker-content__result-list">
        <button
          v-for="candidate in searchCandidates"
          :key="candidate.id"
          type="button"
          class="location-picker-content__result"
          :class="{ 'is-selected': selectedCandidateId === candidate.id }"
          data-testid="location-picker.search-result"
          @click="selectSearchCandidate(candidate)"
        >
          <span class="location-picker-content__result-main">
            <strong>{{ candidate.name }}</strong>
            <small>
              {{
                candidate.address ??
                candidate.cityName ??
                coordinateLabel(candidate.coordinate)
              }}
            </small>
          </span>
          <span
            class="location-picker-content__result-icon i-mdi-chevron-right"
            aria-hidden="true"
          ></span>
        </button>
      </div>

      <PuEmptyState
        v-else-if="searchCompleted && !isSearching"
        compact
        align="start"
        variant="plain"
        surface-level="plain"
        icon="i-mdi-map-search-outline"
        :title="t('locationPicker.resultsEmptyTitle')"
        :description="t('locationPicker.resultsEmptyDescription')"
      />
    </section>

    <PuInlineNotice
      v-if="reverseGeocodeMessage"
      tone="warning"
      :message="reverseGeocodeMessage"
      show-icon
    />

    <PuForm class="location-picker-content__editor">
      <h2>{{ t("locationPicker.selectedTitle") }}</h2>

      <PuFormItem :label="t('locationPicker.nameLabel')">
        <PuInput
          :model-value="draftLocation?.name ?? ''"
          :placeholder="t('locationPicker.namePlaceholder')"
          :disabled="draftLocation === null"
          data-testid="location-picker.name"
          @update:model-value="updateDraftName"
        />
      </PuFormItem>

      <PuFormItem :label="t('locationPicker.addressLabel')">
        <PuInput
          :model-value="draftLocation?.address ?? ''"
          :placeholder="t('locationPicker.addressPlaceholder')"
          :disabled="draftLocation === null"
          data-testid="location-picker.address"
          @update:model-value="updateDraftAddress"
        />
      </PuFormItem>

      <div class="location-picker-content__coordinate">
        <span>{{ t("locationPicker.coordinateLabel") }}</span>
        <strong>{{ coordinateText }}</strong>
      </div>
    </PuForm>

    <footer class="location-picker-content__actions">
      <PuButton
        tone="neutral"
        variant="outline"
        size="sm"
        data-testid="location-picker.cancel"
        @click="emit('cancel')"
      >
        {{ t("common.cancel") }}
      </PuButton>
      <PuButton
        size="sm"
        :disabled="!canConfirm"
        data-testid="location-picker.confirm"
        @click="confirmPick"
      >
        {{ t("common.confirm") }}
      </PuButton>
    </footer>
  </section>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuEmptyState,
  PuForm,
  PuFormItem,
  PuInlineNotice,
  PuInput,
} from "@partner-up-dev/design-web";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { clonePickedLocation, type PickedLocation } from "@/domains/location/model/location-picker";
import {
  createTencentLocationPickerProvider,
  type TencentLocationPickerProvider,
  type TencentLocationSearchCandidate,
} from "@/shared/map/tencent/tencent-location-picker-provider";
import type { MapCoordinate } from "@/shared/map/types";

const props = withDefaults(
  defineProps<{
    initialLocation?: PickedLocation | null;
    apiKey?: string;
    referer?: string;
  }>(),
  {
    initialLocation: null,
    apiKey: undefined,
    referer: undefined,
  },
);

const emit = defineEmits<{
  pick: [location: PickedLocation];
  cancel: [];
}>();

const { t } = useI18n();

const INIT_RETRY_DELAY_MS = 50;
const MAX_INIT_ATTEMPTS = 80;
const SEARCH_DEBOUNCE_MS = 260;

type MapStatus = "idle" | "loading" | "ready" | "error";

const mapContainerRef = ref<HTMLElement | null>(null);
const provider = ref<TencentLocationPickerProvider | null>(null);
const mapStatus = ref<MapStatus>("idle");
const draftLocation = ref<PickedLocation | null>(clonePickedLocation(props.initialLocation));
const searchText = ref("");
const searchCandidates = ref<TencentLocationSearchCandidate[]>([]);
const selectedCandidateId = ref<string | null>(null);
const searchCompleted = ref(false);
const isSearching = ref(false);
const isResolvingAddress = ref(false);
const reverseGeocodeMessage = ref<string | null>(null);

let initFrameId: number | null = null;
let initRetryTimeoutId: number | null = null;
let searchTimeoutId: number | null = null;
let searchRequestSequence = 0;
let reverseGeocodeSequence = 0;
let suppressNextSearch = false;

const normalizedApiKey = computed(() => {
  const explicit = props.apiKey?.trim() ?? "";
  if (explicit.length > 0) {
    return explicit;
  }
  return import.meta.env.VITE_TENCENT_LBS_JS_KEY?.trim() ?? "";
});

const initialCoordinate = computed<MapCoordinate | null>(() => {
  const coordinate = props.initialLocation?.gcj02;
  return coordinate ? { lat: coordinate[0], lng: coordinate[1] } : null;
});

const mapOverlayVisible = computed(
  () => mapStatus.value !== "ready" || normalizedApiKey.value.length === 0,
);

const mapOverlayMessage = computed(() => {
  if (normalizedApiKey.value.length === 0) {
    return t("locationPicker.keyMissing");
  }
  if (mapStatus.value === "loading") {
    return t("locationPicker.mapLoading");
  }
  if (mapStatus.value === "error") {
    return t("locationPicker.mapFailed");
  }
  return t("locationPicker.mapUnavailable");
});

const searchResultSurfaceVisible = computed(
  () =>
    searchText.value.trim().length > 0 &&
    (isSearching.value || searchCompleted.value || searchCandidates.value.length > 0),
);

const coordinateText = computed(() => {
  if (!draftLocation.value) {
    return t("locationPicker.coordinateEmpty");
  }
  return coordinateLabel({
    lat: draftLocation.value.gcj02[0],
    lng: draftLocation.value.gcj02[1],
  });
});

const canConfirm = computed(() => {
  const location = draftLocation.value;
  if (!location) {
    return false;
  }

  return (
    location.name.trim().length > 0 &&
    Number.isFinite(location.gcj02[0]) &&
    Number.isFinite(location.gcj02[1])
  );
});

const coordinateLabel = (coordinate: MapCoordinate): string =>
  `${coordinate.lat.toFixed(6)}, ${coordinate.lng.toFixed(6)}`;

const hasUsableContainerSize = (container: HTMLElement): boolean => {
  const rect = container.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const clearScheduledInit = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (initFrameId !== null) {
    window.cancelAnimationFrame(initFrameId);
    initFrameId = null;
  }
  if (initRetryTimeoutId !== null) {
    window.clearTimeout(initRetryTimeoutId);
    initRetryTimeoutId = null;
  }
};

const scheduleInitRetry = (attempt: number) => {
  if (typeof window === "undefined") {
    void scheduleProviderInit(attempt);
    return;
  }

  if (initRetryTimeoutId !== null) {
    window.clearTimeout(initRetryTimeoutId);
  }
  initRetryTimeoutId = window.setTimeout(() => {
    initRetryTimeoutId = null;
    void scheduleProviderInit(attempt);
  }, INIT_RETRY_DELAY_MS);
};

const applyProviderSelection = (location: PickedLocation | null) => {
  const currentProvider = provider.value;
  if (!currentProvider) {
    return;
  }

  if (!location) {
    currentProvider.setSelectedCoordinate(null);
    return;
  }

  const coordinate = { lat: location.gcj02[0], lng: location.gcj02[1] };
  currentProvider.setSelectedCoordinate(coordinate);
  currentProvider.focusCoordinate(coordinate);
};

const initProvider = async () => {
  const container = mapContainerRef.value;
  if (!container || normalizedApiKey.value.length === 0) {
    mapStatus.value = "idle";
    return;
  }

  if (provider.value) {
    return;
  }

  if (!hasUsableContainerSize(container)) {
    mapStatus.value = "idle";
    return;
  }

  mapStatus.value = "loading";
  try {
    provider.value = await createTencentLocationPickerProvider({
      container,
      apiKey: normalizedApiKey.value,
      initialCoordinate: initialCoordinate.value,
      onMapPick: handleMapPick,
    });
    mapStatus.value = "ready";
    applyProviderSelection(draftLocation.value);
  } catch {
    mapStatus.value = "error";
  }
};

const scheduleProviderInit = async (attempt = 0) => {
  await nextTick();

  if (provider.value) {
    return;
  }

  if (typeof window === "undefined") {
    void initProvider();
    return;
  }

  if (initFrameId !== null) {
    window.cancelAnimationFrame(initFrameId);
  }
  initFrameId = window.requestAnimationFrame(() => {
    initFrameId = null;
    const container = mapContainerRef.value;
    const waitingForSize =
      container !== null && normalizedApiKey.value.length > 0 && !hasUsableContainerSize(container);

    if (!provider.value && waitingForSize && attempt < MAX_INIT_ATTEMPTS) {
      mapStatus.value = "loading";
      scheduleInitRetry(attempt + 1);
      return;
    }

    void initProvider();
  });
};

const clearSearchTimer = () => {
  if (searchTimeoutId !== null && typeof window !== "undefined") {
    window.clearTimeout(searchTimeoutId);
  }
  searchTimeoutId = null;
};

const runSearch = async (keyword: string, sequence: number) => {
  const currentProvider = provider.value;
  if (!currentProvider || mapStatus.value !== "ready") {
    return;
  }

  isSearching.value = true;
  searchCompleted.value = false;
  try {
    const candidates = await currentProvider.search(keyword);
    if (sequence !== searchRequestSequence) {
      return;
    }
    searchCandidates.value = candidates;
    searchCompleted.value = true;
  } catch {
    if (sequence !== searchRequestSequence) {
      return;
    }
    searchCandidates.value = [];
    searchCompleted.value = true;
  } finally {
    if (sequence === searchRequestSequence) {
      isSearching.value = false;
    }
  }
};

const scheduleSearch = (value: string) => {
  clearSearchTimer();
  const keyword = value.trim();
  searchRequestSequence += 1;
  const sequence = searchRequestSequence;
  selectedCandidateId.value = null;

  if (keyword.length === 0) {
    searchCandidates.value = [];
    searchCompleted.value = false;
    isSearching.value = false;
    return;
  }

  if (typeof window === "undefined") {
    void runSearch(keyword, sequence);
    return;
  }

  searchTimeoutId = window.setTimeout(() => {
    searchTimeoutId = null;
    void runSearch(keyword, sequence);
  }, SEARCH_DEBOUNCE_MS);
};

const updateSearchText = (value: string) => {
  searchText.value = value;
};

const clearSearch = () => {
  searchText.value = "";
  searchCandidates.value = [];
  searchCompleted.value = false;
  selectedCandidateId.value = null;
};

const setDraftFromCoordinate = (coordinate: MapCoordinate) => {
  const existing = draftLocation.value;
  draftLocation.value = {
    name: existing?.name ?? "",
    address: existing?.address ?? null,
    cityName: existing?.cityName ?? null,
    gcj02: [coordinate.lat, coordinate.lng],
  };
};

const reverseGeocode = async (coordinate: MapCoordinate, sequence: number) => {
  const currentProvider = provider.value;
  if (!currentProvider) {
    return;
  }

  isResolvingAddress.value = true;
  reverseGeocodeMessage.value = null;
  try {
    const result = await currentProvider.reverseGeocode(coordinate);
    if (sequence !== reverseGeocodeSequence) {
      return;
    }
    draftLocation.value = {
      name: result.name,
      address: result.address,
      cityName: result.cityName,
      gcj02: [result.coordinate.lat, result.coordinate.lng],
    };
  } catch {
    if (sequence !== reverseGeocodeSequence) {
      return;
    }
    reverseGeocodeMessage.value = t("locationPicker.reverseFailed");
  } finally {
    if (sequence === reverseGeocodeSequence) {
      isResolvingAddress.value = false;
    }
  }
};

const handleMapPick = (coordinate: MapCoordinate) => {
  selectedCandidateId.value = null;
  searchCandidates.value = [];
  searchCompleted.value = false;
  reverseGeocodeSequence += 1;
  const sequence = reverseGeocodeSequence;
  provider.value?.setSelectedCoordinate(coordinate);
  setDraftFromCoordinate(coordinate);
  void reverseGeocode(coordinate, sequence);
};

const selectSearchCandidate = (candidate: TencentLocationSearchCandidate) => {
  selectedCandidateId.value = candidate.id;
  reverseGeocodeMessage.value = null;
  const location: PickedLocation = {
    name: candidate.name,
    address: candidate.address,
    cityName: candidate.cityName,
    gcj02: [candidate.coordinate.lat, candidate.coordinate.lng],
  };
  draftLocation.value = location;
  provider.value?.setSelectedCoordinate(candidate.coordinate);
  provider.value?.focusCoordinate(candidate.coordinate);

  suppressNextSearch = true;
  searchText.value = candidate.name;
  searchCandidates.value = [];
  searchCompleted.value = false;
};

const updateDraftName = (value: string) => {
  if (!draftLocation.value) {
    return;
  }
  draftLocation.value = {
    ...draftLocation.value,
    name: value,
  };
};

const updateDraftAddress = (value: string) => {
  if (!draftLocation.value) {
    return;
  }
  const normalized = value.trim();
  draftLocation.value = {
    ...draftLocation.value,
    address: normalized.length > 0 ? value : null,
  };
};

const confirmPick = () => {
  const location = clonePickedLocation(draftLocation.value);
  if (!location || !canConfirm.value) {
    return;
  }

  emit("pick", {
    name: location.name.trim(),
    address: location.address?.trim() || null,
    cityName: location.cityName,
    gcj02: [location.gcj02[0], location.gcj02[1]],
  });
};

watch(searchText, (value) => {
  if (suppressNextSearch) {
    suppressNextSearch = false;
    return;
  }
  scheduleSearch(value);
});

watch(
  () => props.initialLocation,
  (location) => {
    draftLocation.value = clonePickedLocation(location);
    applyProviderSelection(draftLocation.value);
  },
);

onMounted(() => {
  void scheduleProviderInit();
});

onBeforeUnmount(() => {
  clearScheduledInit();
  clearSearchTimer();
  provider.value?.destroy();
  provider.value = null;
});
</script>

<style scoped lang="scss">
.location-picker-content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
}

.location-picker-content__map {
  isolation: isolate;
  position: relative;
  min-height: 320px;
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.location-picker-content__canvas {
  position: absolute;
  inset: 0;
}

.location-picker-content__map-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: var(--sys-spacing-medium);
  background: var(--sys-color-surface-container-low);
}

.location-picker-content__map-badge {
  @include mx.pu-font(caption);
  position: absolute;
  left: var(--sys-spacing-small);
  top: var(--sys-spacing-small);
  z-index: 10;
  display: inline-flex;
  max-width: calc(100% - var(--sys-spacing-small) * 2);
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-pill);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-shadow-2);
}

.location-picker-content__map-badge span:first-child {
  @include mx.pu-icon(small);
  flex: 0 0 auto;
}

.location-picker-content__results,
.location-picker-content__editor {
  display: grid;
  gap: var(--sys-spacing-small);
}

.location-picker-content__results h2,
.location-picker-content__editor h2 {
  @include mx.pu-font(control);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.location-picker-content__result-list {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

.location-picker-content__result {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 0;
  border-bottom: 1px solid var(--sys-color-outline-variant);
  background: transparent;
  color: var(--sys-color-on-surface);
  text-align: left;
  cursor: pointer;
  appearance: none;
}

.location-picker-content__result:last-child {
  border-bottom: 0;
}

.location-picker-content__result.is-selected {
  background: var(--sys-color-primary-container);
}

.location-picker-content__result:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--sys-color-primary);
  outline-offset: -2px;
}

.location-picker-content__result-main {
  display: grid;
  min-width: 0;
  gap: calc(var(--sys-spacing-xsmall) / 2);
}

.location-picker-content__result-main strong {
  @include mx.pu-font(body);
  min-width: 0;
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.location-picker-content__result-main small {
  @include mx.pu-font(caption);
  min-width: 0;
  color: var(--sys-color-on-surface-variant);
  overflow-wrap: anywhere;
}

.location-picker-content__result-icon {
  @include mx.pu-icon(small);
  flex: 0 0 auto;
  color: var(--sys-color-on-surface-variant);
}

.location-picker-content__coordinate {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small) 0;
}

.location-picker-content__coordinate span {
  @include mx.pu-font(control);
  color: var(--sys-color-on-surface-variant);
}

.location-picker-content__coordinate strong {
  @include mx.pu-font(body);
  min-width: 0;
  color: var(--sys-color-on-surface);
  text-align: right;
  overflow-wrap: anywhere;
}

.location-picker-content__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sys-spacing-small);
}

@media (max-width: 520px) {
  .location-picker-content__map {
    min-height: 280px;
  }

  .location-picker-content__actions {
    flex-direction: column-reverse;
  }
}
</style>
