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
        <header
          class="ride-hailing-order-content__status-hero"
          data-testid="order-detail.ride-hailing.status-hero"
        >
          <div class="ride-hailing-order-content__status-copy">
            <h2 data-testid="order-detail.ride-hailing.status-title">
              {{ statusHero.title }}
            </h2>
            <p data-testid="order-detail.ride-hailing.status-description">
              {{ statusHero.description }}
            </p>
          </div>

          <div class="ride-hailing-order-content__status-actions">
            <PuButton
              v-if="showsCancelAction"
              type="button"
              size="sm"
              shape="pill"
              tone="neutral"
              variant="outline"
              disabled
              title="取消订单能力待接入"
              data-testid="order-detail.ride-hailing.cancel"
            >
              取消订单
            </PuButton>
            <PuButton
              type="button"
              size="sm"
              shape="circle"
              tone="neutral"
              variant="ghost"
              disabled
              aria-label="更多操作"
              title="更多操作待接入"
              data-testid="order-detail.ride-hailing.more"
            >
              <span class="i-mdi-dots-horizontal" aria-hidden="true"></span>
            </PuButton>
          </div>
        </header>

        <section
          v-if="showsDispatchingCandidateVehicles"
          class="ride-hailing-order-content__candidate-section"
          data-testid="order-detail.ride-hailing.dispatching-skus"
        >
          <RideHailingSkuCard
            v-for="candidate in props.ride.candidateVehicles"
            :key="candidate.skuId"
            readonly
            :display-name="candidate.displayName"
            :price-label="formatFen(candidate.quoteAmountFen)"
            :preview-src="directImageSrc(candidate.previewImageAssetId)"
            :selectable="false"
            :selected="false"
          />
        </section>

        <div class="ride-hailing-order-content__facts">
          <section
            class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.route-section"
          >
            <h3>路线</h3>
            <RoutePointList
              class="ride-hailing-order-content__route-list"
              :route="routeForMap"
              variant="detail"
              show-address
            />
          </section>

          <section
            class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.riders-section"
          >
            <h3>乘车人</h3>
            <div class="ride-hailing-order-content__rider-list">
              <div
                v-for="rider in props.ride.riders"
                :key="rider.userId"
                class="ride-hailing-order-content__rider-row"
              >
                <span class="i-mdi-account-circle" aria-hidden="true"></span>
                <div>
                  <strong>{{ rider.displayName }}</strong>
                  <small>{{ rider.phoneMasked ?? "暂无手机号" }}</small>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PuFloatPanel>
  </section>
</template>

<script setup lang="ts">
import { PuButton, PuFloatPanel, type PuFloatPanelStop } from "@partner-up-dev/design-web";
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { CommerceOrderDetailResponse } from "@/domains/commerce/queries/useCommerce";
import RideHailingSkuCard from "@/domains/commerce/ui/ordering/RideHailingSkuCard.vue";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import RoutePointList from "@/domains/route/ui/RoutePointList.vue";
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

const statusCopyByPhase: Record<
  RideHailingDetail["executionPhase"],
  {
    title: string;
    description: string;
  }
> = {
  ACCEPTED: {
    title: "已接单",
    description: "已接单，等待司机出发接客",
  },
  ARRIVED_AT_PICKUP: {
    title: "已到达上车点",
    description: "请尽快上车",
  },
  CANCELLED: {
    title: "已取消",
    description: "订单已取消",
  },
  DISPATCHING: {
    title: "派单中",
    description: "努力为您寻找司机中...",
  },
  FAILED: {
    title: "订单异常",
    description: "请联系客服介入",
  },
  FINISHED: {
    title: "行程已结束",
    description: "感谢使用，请留意账单状态",
  },
  INITIATING: {
    title: "正在创建",
    description: "正在准备派单",
  },
  IN_TRIP: {
    title: "行程中",
    description: "司机正在前往目的地",
  },
};

const statusHero = computed(() => statusCopyByPhase[props.ride.executionPhase]);

const showsCancelAction = computed(() => props.ride.executionPhase === "DISPATCHING");

const showsDispatchingCandidateVehicles = computed(
  () => props.ride.executionPhase === "DISPATCHING" && props.ride.candidateVehicles.length > 0,
);

const orderMapViewModel = computed(() =>
  buildRideHailingOrderMapViewModel({
    executionPhase: props.ride.executionPhase,
    live: props.ride.live,
    route: props.ride.route,
  }),
);

const directImageSrc = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("/")
  ) {
    return normalized;
  }
  return null;
};

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};
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
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-large);
}

.ride-hailing-order-content__status-hero {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.ride-hailing-order-content__status-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 0;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);

  h2,
  p {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  h2 {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(caption);
    color: var(--sys-color-on-surface-variant);
  }
}

.ride-hailing-order-content__status-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xsmall);

  span {
    @include mx.pu-icon(small);
  }
}

.ride-hailing-order-content__candidate-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-medium);
}

.ride-hailing-order-content__facts {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-large);
  margin-top: var(--sys-spacing-xlarge);
}

.ride-hailing-order-content__fact-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);

  h3 {
    @include mx.pu-font(section);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.ride-hailing-order-content__route-list {
  min-width: 0;
}

.ride-hailing-order-content__rider-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.ride-hailing-order-content__rider-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--sys-spacing-small);
  align-items: center;
  padding: var(--sys-spacing-small) 0;
  border-bottom: 1px solid var(--sys-color-outline-variant);

  > span {
    @include mx.pu-icon(medium);
    color: var(--sys-color-on-surface-variant);
  }

  div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
  }

  strong {
    @include mx.pu-font(body);
    color: var(--sys-color-on-surface);
  }

  small {
    @include mx.pu-font(support);
    color: var(--sys-color-on-surface-variant);
  }
}

</style>
