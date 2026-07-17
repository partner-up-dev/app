<template>
  <div class="map-shell" :class="`map-shell--${variant}`">
    <div
      ref="containerRef"
      class="map-shell__canvas"
      :style="canvasStyle"
      aria-hidden="true"
      @wheel.passive="handleUserViewportInteraction"
    ></div>

    <div
      v-if="viewportFollowControlsVisible"
      class="map-shell__viewport-controls"
      aria-label="地图视野"
    >
      <button
        v-if="followPausedByUser"
        type="button"
        class="map-shell__viewport-button"
        data-testid="shared-map.follow.resume"
        @click.stop="resumeViewportFollow"
      >
        <span class="i-mdi-crosshairs-gps" aria-hidden="true"></span>
        <span>{{ resumeFollowLabel }}</span>
      </button>
      <button
        v-else
        type="button"
        class="map-shell__viewport-button"
        data-testid="shared-map.follow.overview"
        @click.stop="showAllGeometry"
      >
        <span class="i-mdi-map-marker-path" aria-hidden="true"></span>
        <span>{{ overviewLabel }}</span>
      </button>
    </div>

    <div v-if="customZoomControlsVisible" class="map-shell__zoom-controls" aria-label="地图缩放">
      <button
        type="button"
        class="map-shell__zoom-button"
        aria-label="放大地图"
        @click.stop="zoomIn"
      >
        <span class="i-mdi-plus" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        class="map-shell__zoom-button"
        aria-label="缩小地图"
        @click.stop="zoomOut"
      >
        <span class="i-mdi-minus" aria-hidden="true"></span>
      </button>
    </div>

    <div v-if="overlayVisible" class="map-shell__fallback" role="status" aria-live="polite">
      <slot name="fallback" :status="status" :message="fallbackMessage">
        <span class="map-shell__fallback-icon i-mdi-map-marker-path" aria-hidden="true"></span>
        <span class="map-shell__fallback-text">{{ fallbackMessage }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  type CSSProperties,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { createTencentLBSMapProvider } from "@/shared/map/tencent/tencent-lbs-provider";
import type { TencentLBSLibrary, TencentLBSMapProvider } from "@/shared/map/tencent/types";
import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapMarker,
  MapPolyline,
  MapProviderStatus,
  MapViewportFollowMode,
} from "@/shared/map/types";
import {
  type MapAutomaticViewportSource,
  resolveMapAutomaticViewportAction,
} from "./viewport-follow";

const props = withDefaults(
  defineProps<{
    apiKey?: string;
    markers?: readonly MapMarker[];
    polylines?: readonly MapPolyline[];
    center?: MapCoordinate;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    fitPadding?: MapFitPadding;
    activeGeometry?: MapActiveGeometry;
    overviewGeometry?: MapActiveGeometry;
    viewportFollowMode?: MapViewportFollowMode;
    fitOnGeometryChange?: boolean;
    followResetKey?: string | number | null;
    followZoom?: number;
    showViewportFollowControls?: boolean;
    resumeFollowLabel?: string;
    overviewLabel?: string;
    libraries?: readonly TencentLBSLibrary[];
    interactive?: boolean;
    variant?: "inline" | "immersive";
    hideBottomAttribution?: boolean;
    showDefaultControls?: boolean;
    showZoomControls?: boolean;
    loadingMessage?: string;
    unavailableMessage?: string;
    errorMessage?: string;
  }>(),
  {
    apiKey: undefined,
    markers: () => [],
    polylines: () => [],
    center: undefined,
    zoom: undefined,
    minZoom: undefined,
    maxZoom: undefined,
    fitPadding: 28,
    activeGeometry: null,
    overviewGeometry: null,
    viewportFollowMode: "none",
    fitOnGeometryChange: true,
    followResetKey: null,
    followZoom: 17,
    showViewportFollowControls: false,
    resumeFollowLabel: "回到跟随",
    overviewLabel: "查看全程",
    libraries: () => [],
    interactive: true,
    variant: "inline",
    hideBottomAttribution: false,
    showDefaultControls: true,
    showZoomControls: false,
    loadingMessage: "地图加载中",
    unavailableMessage: "地图暂不可用",
    errorMessage: "地图加载失败",
  },
);

const emit = defineEmits<{
  ready: [];
  error: [error: Error];
  markerClick: [markerId: string];
}>();

const MAX_INIT_ATTEMPTS = 80;
const INIT_RETRY_DELAY_MS = 50;

const containerRef = ref<HTMLElement | null>(null);
const provider = ref<TencentLBSMapProvider | null>(null);
const status = ref<MapProviderStatus>("idle");
const isInitializing = ref(false);
const followPausedByUser = ref(false);
let initFrameId: number | null = null;
let initRetryTimeoutId: number | null = null;
const hiddenBottomAttributionBleedPx = computed(() => (props.hideBottomAttribution ? 20 : 0));

const canvasStyle = computed<CSSProperties>(() => ({
  bottom: `-${hiddenBottomAttributionBleedPx.value}px`,
}));

const compensatedFitPadding = computed<MapFitPadding>(() => {
  const extraBottomPadding = hiddenBottomAttributionBleedPx.value;
  if (extraBottomPadding === 0) {
    return props.fitPadding;
  }

  if (typeof props.fitPadding === "number") {
    return {
      top: props.fitPadding,
      right: props.fitPadding,
      bottom: props.fitPadding + extraBottomPadding,
      left: props.fitPadding,
    };
  }

  return {
    ...props.fitPadding,
    bottom: props.fitPadding.bottom + extraBottomPadding,
  };
});

const normalizedApiKey = computed(() => {
  const explicit = props.apiKey?.trim() ?? "";
  if (explicit.length > 0) {
    return explicit;
  }
  return import.meta.env.VITE_TENCENT_LBS_JS_KEY?.trim() ?? "";
});

const fallbackMessage = computed(() => {
  if (status.value === "loading") {
    return props.loadingMessage;
  }
  if (status.value === "error") {
    return props.errorMessage;
  }
  return props.unavailableMessage;
});

const overlayVisible = computed(
  () => status.value !== "ready" || normalizedApiKey.value.length === 0,
);

const customZoomControlsVisible = computed(
  () => props.showZoomControls && props.interactive && !overlayVisible.value,
);

const resolvedMaxZoom = computed(() => {
  if (props.viewportFollowMode === "none") {
    return props.maxZoom;
  }

  return Math.max(props.maxZoom ?? props.followZoom, props.followZoom);
});

const activeFollowMarker = computed(() => {
  const activeGeometry = props.activeGeometry;
  if (activeGeometry?.kind !== "marker") {
    return null;
  }
  return props.markers.find((marker) => marker.id === activeGeometry.id) ?? null;
});

const viewportFollowControlsVisible = computed(
  () =>
    props.showViewportFollowControls &&
    props.viewportFollowMode !== "none" &&
    (!followPausedByUser.value || activeFollowMarker.value !== null) &&
    props.interactive &&
    !overlayVisible.value,
);

const hasUsableContainerSize = (container: HTMLElement): boolean => {
  const rect = container.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const syncMapData = () => {
  const currentProvider = provider.value;
  if (!currentProvider) {
    return;
  }

  currentProvider.setPolylines(props.polylines);
  currentProvider.setMarkers(props.markers);
  currentProvider.setViewport({
    center: props.center,
    zoom: props.zoom,
  });
};

const fitActiveGeometry = (
  activeGeometry: MapActiveGeometry = props.activeGeometry ?? { kind: "all" },
) => {
  provider.value?.fitGeometry({
    markers: props.markers,
    polylines: props.polylines,
    activeGeometry,
    padding: compensatedFitPadding.value,
    maxZoom: resolvedMaxZoom.value,
  });
};

const followActiveMarker = (markerId: string) => {
  const marker = props.markers.find((item) => item.id === markerId);
  if (!marker) {
    return;
  }

  provider.value?.fitMarker({
    marker,
    padding: compensatedFitPadding.value,
    zoom: props.followZoom,
  });
};

const applyAutomaticViewport = (source: MapAutomaticViewportSource) => {
  const action = resolveMapAutomaticViewportAction({
    activeGeometry: props.activeGeometry ?? { kind: "all" },
    fitOnGeometryChange: props.fitOnGeometryChange,
    followPausedByUser: followPausedByUser.value,
    source,
    viewportFollowMode: props.viewportFollowMode,
  });

  if (action.kind === "fit-geometry") {
    fitActiveGeometry();
    return;
  }

  if (action.kind === "follow-active-marker") {
    followActiveMarker(action.markerId);
  }
};

const applyMapData = (source: MapAutomaticViewportSource) => {
  syncMapData();
  applyAutomaticViewport(source);
};

const initMap = async () => {
  const container = containerRef.value;
  if (!container || normalizedApiKey.value.length === 0) {
    status.value = "idle";
    return;
  }

  if (provider.value || isInitializing.value) {
    return;
  }

  if (!hasUsableContainerSize(container)) {
    status.value = "idle";
    return;
  }

  isInitializing.value = true;
  status.value = "loading";
  try {
    provider.value = await createTencentLBSMapProvider({
      container,
      apiKey: normalizedApiKey.value,
      libraries: props.libraries,
      center: props.center,
      zoom: props.zoom,
      minZoom: props.minZoom,
      maxZoom: resolvedMaxZoom.value,
      interactive: props.interactive,
      showDefaultControls: props.showDefaultControls,
      onMarkerClick: (markerId) => emit("markerClick", markerId),
      onUserViewportInteraction: () => {
        handleUserViewportInteraction();
      },
    });
    status.value = "ready";
    applyMapData("init");
    emit("ready");
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    status.value = "error";
    emit("error", normalizedError);
  } finally {
    isInitializing.value = false;
  }
};

const zoomIn = () => {
  handleUserViewportInteraction();
  provider.value?.zoomIn();
};

const zoomOut = () => {
  handleUserViewportInteraction();
  provider.value?.zoomOut();
};

const handleUserViewportInteraction = () => {
  if (props.viewportFollowMode === "none" || !props.interactive || status.value !== "ready") {
    return;
  }
  followPausedByUser.value = true;
};

const resumeViewportFollow = () => {
  followPausedByUser.value = false;
  applyAutomaticViewport("reset");
};

const showAllGeometry = () => {
  followPausedByUser.value = true;
  fitActiveGeometry(props.overviewGeometry ?? { kind: "all" });
};

const clearScheduledInitialMapInit = () => {
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

const scheduleInitialMapInitRetry = (attempt: number) => {
  if (typeof window === "undefined") {
    void scheduleInitialMapInit(attempt);
    return;
  }

  if (initRetryTimeoutId !== null) {
    window.clearTimeout(initRetryTimeoutId);
  }

  initRetryTimeoutId = window.setTimeout(() => {
    initRetryTimeoutId = null;
    void scheduleInitialMapInit(attempt);
  }, INIT_RETRY_DELAY_MS);
};

const scheduleInitialMapInit = async (attempt = 0) => {
  await nextTick();

  if (provider.value || isInitializing.value) {
    return;
  }

  if (typeof window === "undefined") {
    void initMap();
    return;
  }

  if (initFrameId !== null) {
    window.cancelAnimationFrame(initFrameId);
  }

  initFrameId = window.requestAnimationFrame(() => {
    initFrameId = null;
    const container = containerRef.value;
    const waitingForSize =
      container !== null && normalizedApiKey.value.length > 0 && !hasUsableContainerSize(container);

    if (!provider.value && !isInitializing.value && waitingForSize && attempt < MAX_INIT_ATTEMPTS) {
      status.value = "loading";
      scheduleInitialMapInitRetry(attempt + 1);
      return;
    }

    void initMap();
  });
};

onMounted(() => {
  void scheduleInitialMapInit();
});

onBeforeUnmount(() => {
  clearScheduledInitialMapInit();
  provider.value?.destroy();
  provider.value = null;
});

watch(
  () => [props.markers, props.polylines, props.center, props.zoom],
  () => {
    applyMapData("geometry");
  },
  { deep: true },
);

watch(
  () => [
    props.fitPadding,
    props.hideBottomAttribution,
    props.activeGeometry,
    props.overviewGeometry,
    resolvedMaxZoom.value,
    props.viewportFollowMode,
    props.fitOnGeometryChange,
    props.followZoom,
  ],
  () => {
    applyAutomaticViewport("view-context");
  },
  { deep: true },
);

watch(
  () => props.followResetKey,
  () => {
    followPausedByUser.value = false;
    applyAutomaticViewport("reset");
  },
);
</script>

<style scoped lang="scss">
.map-shell {
  isolation: isolate;
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
}

.map-shell--inline {
  min-height: 180px;
  aspect-ratio: 16 / 9;
}

.map-shell--immersive {
  min-height: 320px;
  height: 100%;
}

.map-shell__canvas {
  isolation: isolate;
  position: absolute;
  inset: 0;
  z-index: 0;
}

.map-shell__zoom-controls {
  position: absolute;
  right: var(--sys-spacing-small);
  top: var(--sys-spacing-small);
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  box-shadow: var(--sys-shadow-2);
}

.map-shell__viewport-controls {
  position: absolute;
  left: var(--sys-spacing-small);
  top: var(--sys-spacing-small);
  z-index: 10;
  display: flex;
  max-width: calc(100% - var(--sys-spacing-small) * 2);
}

.map-shell__viewport-button {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-pill);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-shadow-2);
  cursor: pointer;
  font-size: var(--sys-typo-caption-size);
  font-weight: var(--sys-typo-caption-weight);
  line-height: var(--sys-typo-caption-line-height);

  span:last-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.map-shell__zoom-button {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: 0;
  border-bottom: 1px solid var(--sys-color-outline-variant);
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;

  &:last-child {
    border-bottom: 0;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: -2px;
  }

  span {
    @include mx.pu-icon(small);
  }
}

.map-shell__fallback {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xsmall);
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container-low);
  text-align: center;
}

.map-shell__fallback-icon {
  @include mx.pu-icon(large);
}

.map-shell__fallback-text {
  @include mx.pu-font(control);
  overflow-wrap: anywhere;
}
</style>
