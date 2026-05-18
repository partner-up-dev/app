<template>
  <div class="map-shell" :class="`map-shell--${variant}`">
    <div
      ref="containerRef"
      class="map-shell__canvas"
      :style="canvasStyle"
      aria-hidden="true"
    ></div>

    <div
      v-if="overlayVisible"
      class="map-shell__fallback"
      role="status"
      aria-live="polite"
    >
      <slot
        name="fallback"
        :status="status"
        :message="fallbackMessage"
      >
        <span class="map-shell__fallback-icon i-mdi-map-marker-path" aria-hidden="true"></span>
        <span class="map-shell__fallback-text">{{ fallbackMessage }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from "vue";
import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapMarker,
  MapPolyline,
  MapProviderStatus,
} from "@/shared/map/types";
import { createTencentLBSMapProvider } from "@/shared/map/tencent/tencent-lbs-provider";
import type {
  TencentLBSLibrary,
  TencentLBSMapProvider,
} from "@/shared/map/tencent/types";

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
    libraries?: readonly TencentLBSLibrary[];
    interactive?: boolean;
    variant?: "inline" | "immersive";
    hideBottomAttribution?: boolean;
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
    libraries: () => [],
    interactive: true,
    variant: "inline",
    hideBottomAttribution: false,
    loadingMessage: "地图加载中",
    unavailableMessage: "地图暂不可用",
    errorMessage: "地图加载失败",
  },
);

const emit = defineEmits<{
  ready: [];
  error: [error: Error];
}>();

const MAX_INIT_ATTEMPTS = 80;
const INIT_RETRY_DELAY_MS = 50;

const containerRef = ref<HTMLElement | null>(null);
const provider = ref<TencentLBSMapProvider | null>(null);
const status = ref<MapProviderStatus>("idle");
const isInitializing = ref(false);
let initFrameId: number | null = null;
let initRetryTimeoutId: number | null = null;
const hiddenBottomAttributionBleedPx = computed(() =>
  props.hideBottomAttribution ? 20 : 0,
);

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

const hasUsableContainerSize = (container: HTMLElement): boolean => {
  const rect = container.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const applyMapData = () => {
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
  currentProvider.fitGeometry({
    markers: props.markers,
    polylines: props.polylines,
    activeGeometry: props.activeGeometry ?? { kind: "all" },
    padding: compensatedFitPadding.value,
    maxZoom: props.maxZoom,
  });
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
      maxZoom: props.maxZoom,
      interactive: props.interactive,
    });
    status.value = "ready";
    applyMapData();
    emit("ready");
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    status.value = "error";
    emit("error", normalizedError);
  } finally {
    isInitializing.value = false;
  }
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
      container !== null &&
      normalizedApiKey.value.length > 0 &&
      !hasUsableContainerSize(container);

    if (
      !provider.value &&
      !isInitializing.value &&
      waitingForSize &&
      attempt < MAX_INIT_ATTEMPTS
    ) {
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
  () => [
    props.markers,
    props.polylines,
    props.center,
    props.zoom,
    props.fitPadding,
    props.hideBottomAttribution,
    props.activeGeometry,
    props.maxZoom,
  ],
  () => {
    applyMapData();
  },
  { deep: true },
);
</script>

<style scoped lang="scss">
.map-shell {
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
  position: absolute;
  inset: 0;
}

.map-shell__fallback {
  position: absolute;
  inset: 0;
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
  @include mx.pu-font(label-medium);
  overflow-wrap: anywhere;
}
</style>
