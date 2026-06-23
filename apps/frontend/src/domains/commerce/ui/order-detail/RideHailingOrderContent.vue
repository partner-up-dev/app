<template>
  <section
    ref="contentRoot"
    class="ride-hailing-order-content"
    data-testid="order-detail.ride-hailing.page"
    :data-map-mode="orderMapViewModel.mode"
  >
    <RouteMap
      class="ride-hailing-order-content__route-map"
      data-testid="order-detail.ride-hailing.route-map"
      :data-map-mode="orderMapViewModel.mode"
      :route="routeForMap"
      :planned-polyline="orderMapViewModel.plannedPolyline"
      :extra-markers="orderMapViewModel.extraMarkers"
      :extra-polylines="orderMapViewModel.extraPolylines"
      :plan-route="orderMapViewModel.planRoute"
      :show-fallback-polyline="orderMapViewModel.showFallbackPolyline"
      :active-geometry="orderMapViewModel.activeGeometry"
      :fit-padding="routeMapFitPadding"
      :interactive="true"
      variant="immersive"
      hide-bottom-attribution
    />

    <PuFloatPanel
      v-model="panelStop"
      class="ride-hailing-order-content__panel"
      :stops="panelStops"
      position="absolute"
      :content-padding="false"
      aria-label="网约车订单状态面板"
      :z-index="20"
    >
      <div class="ride-hailing-order-content__panel-body">
        <pre
          class="ride-hailing-order-content__raw-data"
          data-testid="order-detail.ride-hailing.raw-data"
        >{{ rawDebugData }}</pre>
      </div>
    </PuFloatPanel>
  </section>
</template>

<script setup lang="ts">
import { PuFloatPanel, type PuFloatPanelStop } from "@partner-up-dev/design-web";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { CommerceOrderDetailResponse } from "@/domains/commerce/queries/useCommerce";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import type { MapFitPadding } from "@/shared/map/types";
import { buildRideHailingOrderMapViewModel } from "./ride-hailing-order-map-view-model";

type RideHailingDetail = NonNullable<CommerceOrderDetailResponse["rideHailing"]>;
type RidePanelStopValue = "peek" | "normal" | "expanded";

const props = defineProps<{
  detail: CommerceOrderDetailResponse;
  ride: RideHailingDetail;
}>();

const DEFAULT_CONTENT_HEIGHT = 720;

const contentRoot = ref<HTMLElement | null>(null);
const contentHeight = ref(DEFAULT_CONTENT_HEIGHT);
const panelStop = ref<RidePanelStopValue>("normal");

let contentResizeObserver: ResizeObserver | null = null;

const updateContentHeight = (): void => {
  const height = contentRoot.value?.getBoundingClientRect().height ?? DEFAULT_CONTENT_HEIGHT;
  contentHeight.value = Number.isFinite(height) && height > 0 ? height : DEFAULT_CONTENT_HEIGHT;
};

onMounted(() => {
  updateContentHeight();
  if (typeof ResizeObserver === "undefined" || !contentRoot.value) return;
  contentResizeObserver = new ResizeObserver(() => updateContentHeight());
  contentResizeObserver.observe(contentRoot.value);
});

onUnmounted(() => {
  contentResizeObserver?.disconnect();
  contentResizeObserver = null;
});

const toRoutePoint = (place: RideHailingDetail["route"]["origin"]): RoutePoint => ({
  bd09: null,
  full_address: place.address ?? null,
  gcj02: [place.latitude, place.longitude],
  name: place.name,
  wgs84: null,
});

const routeForMap = computed<Route>(() => [
  toRoutePoint(props.ride.route.origin),
  ...props.ride.route.waypoints.map(toRoutePoint),
  toRoutePoint(props.ride.route.destination),
]);

const panelStops = computed<PuFloatPanelStop[]>(() => {
  const rootHeight = contentHeight.value || DEFAULT_CONTENT_HEIGHT;
  const maxPanelHeight = Math.max(180, rootHeight - 16);
  const peek = Math.min(172, maxPanelHeight);
  const normal = Math.min(Math.max(360, peek + 128), maxPanelHeight);
  const expanded = Math.min(Math.max(Math.round(rootHeight * 0.72), normal + 120), maxPanelHeight);
  return [
    { value: "peek", label: "概览", height: peek },
    { value: "normal", label: "详情", height: normal },
    { value: "expanded", label: "展开", height: expanded },
  ];
});

const activePanelStop = computed(
  () =>
    panelStops.value.find((stop) => stop.value === panelStop.value) ??
    panelStops.value[1] ??
    panelStops.value[0] ??
    null,
);

const routeMapFitPadding = computed<MapFitPadding>(() => ({
  top: 48,
  right: 32,
  bottom: (activePanelStop.value?.height ?? 360) + 32,
  left: 32,
}));

const orderMapViewModel = computed(() =>
  buildRideHailingOrderMapViewModel({
    executionPhase: props.ride.executionPhase,
    live: props.ride.live,
    route: props.ride.route,
  }),
);

const rawDebugData = computed(() =>
  JSON.stringify(
    {
      order: props.detail.order,
      rideHailing: props.ride,
      bill: props.detail.bill,
      payment: props.detail.payment,
      mapViewModel: orderMapViewModel.value,
    },
    null,
    2,
  ),
);
</script>

<style scoped lang="scss">
.ride-hailing-order-content {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.ride-hailing-order-content,
.ride-hailing-order-content__route-map {
  height: 100%;
}

.ride-hailing-order-content__route-map :deep(.route-map),
.ride-hailing-order-content__route-map :deep(.map-shell) {
  height: 100%;
  border: 0;
  border-radius: 0;
}

.ride-hailing-order-content__panel {
  bottom: 0;
  z-index: 20;
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
}

.ride-hailing-order-content__panel-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-medium);
}

.ride-hailing-order-content__raw-data {
  overflow: auto;
  max-height: calc(100dvh - 6rem);
  margin: 0;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  padding: var(--sys-spacing-medium);
  background: var(--sys-color-surface-container-low);
  color: var(--sys-color-on-surface);
  font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.ride-hailing-order-content__raw-data::selection {
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-surface);
}

</style>
