<template>
  <section ref="contentRoot" class="ride-hailing-order-content" data-testid="order-detail.ride-hailing.page"
    :data-map-mode="orderMapViewModel.mode">
    <RouteMap class="ride-hailing-order-content__route-map" data-testid="order-detail.ride-hailing.route-map"
      :data-map-mode="orderMapViewModel.mode" :route="routeForMap" :planned-polyline="orderMapViewModel.plannedPolyline"
      :extra-markers="orderMapViewModel.extraMarkers" :extra-polylines="orderMapViewModel.extraPolylines"
      :plan-route="orderMapViewModel.planRoute" :show-fallback-polyline="orderMapViewModel.showFallbackPolyline"
      :active-geometry="orderMapViewModel.activeGeometry" :overview-geometry="orderMapViewModel.overviewGeometry"
      :viewport-follow-mode="routeMapViewportFollowMode" :follow-reset-key="orderMapViewModel.mode" :follow-zoom="15"
      :show-viewport-follow-controls="routeMapViewportFollowMode !== 'none'" :fit-padding="routeMapFitPadding"
      :interactive="true" variant="immersive" hide-bottom-attribution />

    <PuFloatPanel v-model="panelStop" class="ride-hailing-order-content__panel" :stops="panelStops" position="absolute"
      :content-padding="false" aria-label="网约车订单状态面板" :z-index="20">
      <div class="ride-hailing-order-content__panel-body">
        <header class="ride-hailing-order-content__status-hero" data-testid="order-detail.ride-hailing.status-hero">
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
              tone="danger"
              variant="outline"
              :loading="cancelActionPending"
              :disabled="!canRequestCancellation || cancelActionPending"
              data-testid="order-detail.ride-hailing.cancel"
              @click="previewRideHailingCancellationFee"
            >
              取消订单
            </PuButton>
            <PuButton type="button" size="sm" shape="circle" tone="neutral" variant="ghost" disabled aria-label="更多操作"
              title="更多操作待接入" data-testid="order-detail.ride-hailing.more">
              <span class="i-mdi-dots-horizontal" aria-hidden="true"></span>
            </PuButton>
          </div>
        </header>

        <PuInlineNotice
          v-if="cancelErrorMessage"
          tone="error"
          title="取消失败"
          :message="cancelErrorMessage"
          data-testid="order-detail.ride-hailing.cancel-error"
        />

        <PuCard v-if="showsDriverCard" as="section" class="ride-hailing-order-content__driver-card" variant="soft"
          tone="neutral" padding="sm" gap="sm" data-testid="order-detail.ride-hailing.driver-card">
          <div class="ride-hailing-order-content__driver-layout">
            <div class="ride-hailing-order-content__driver-profile">
              <PuImg src="" :alt="driverName" :name="driverName" :fallback-initial="driverAvatarInitial" size="medium"
                shape="circle" :show-loading="false" bordered />
              <strong data-testid="order-detail.ride-hailing.driver-name">
                {{ driverName }}
              </strong>
            </div>

            <div class="ride-hailing-order-content__vehicle-copy">
              <strong data-testid="order-detail.ride-hailing.vehicle-plate">
                {{ vehiclePlate }}
              </strong>
              <span data-testid="order-detail.ride-hailing.vehicle-description">
                {{ vehicleDescription }}
              </span>
            </div>

            <PuButton type="button" size="sm" shape="rect" tone="primary" variant="outline" :disabled="!driverCallHref"
              :action="driverCallHref ? { href: driverCallHref } : undefined" aria-label="联系司机" title="联系司机"
              data-testid="order-detail.ride-hailing.driver-call">
              <template #leading>
                <span class="i-mdi-phone" aria-hidden="true"></span>
              </template>
            </PuButton>
          </div>
        </PuCard>

        <section v-if="showsDispatchingCandidateVehicles" class="ride-hailing-order-content__candidate-section"
          data-testid="order-detail.ride-hailing.dispatching-skus">
          <RideHailingSkuCard v-for="candidate in props.ride.candidateVehicles" :key="candidate.skuId" readonly
            :display-name="candidate.displayName" :price-label="formatFen(candidate.quoteAmountFen)"
            :preview-src="directImageSrc(candidate.previewImageAssetId)" :selectable="false" :selected="false" />
        </section>

        <div class="ride-hailing-order-content__facts">
          <section v-if="billId" class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.bill-section">
            <h3>账单</h3>
            <BillCard :bill-id="billId" :order-id="props.detail.order.id" :route-order-id="props.routeOrderId" />
          </section>

          <section v-if="resolvedServiceVehicles.length > 0" class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.resolved-vehicle-section">
            <h3>服务车型</h3>
            <div class="ride-hailing-order-content__resolved-vehicle-list">
              <RideHailingSkuCard v-for="vehicle in resolvedServiceVehicles" :key="vehicle.itemId" readonly
                :display-name="vehicle.displayName" :price-label="vehicle.priceLabel" :preview-src="vehicle.previewSrc"
                :selectable="false" :selected="false" />
            </div>
          </section>

          <section class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.route-section">
            <h3>路线</h3>
            <RoutePointList class="ride-hailing-order-content__route-list" :route="routeForMap" variant="detail"
              show-address />
          </section>

          <section class="ride-hailing-order-content__fact-section"
            data-testid="order-detail.ride-hailing.riders-section">
            <h3>乘车人</h3>
            <div class="ride-hailing-order-content__rider-list">
              <div v-for="rider in props.ride.riders" :key="rider.userId" class="ride-hailing-order-content__rider-row">
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

    <PuDialog
      :open="showCancelConfirmDialog"
      tone="error"
      title="确认取消订单"
      :description="cancelConfirmDescription"
      :show-cancel="false"
      :show-confirm="false"
      :close-on-overlay="!cancelMutation.isPending.value"
      :close-on-escape="!cancelMutation.isPending.value"
      @close="closeCancelConfirmDialog"
      @cancel="closeCancelConfirmDialog"
      @confirm="confirmRideHailingCancellation"
    >
      <div
        class="ride-hailing-order-content__cancel-confirm"
        data-testid="order-detail.ride-hailing.cancel-confirm"
      >
        <div data-testid="order-detail.ride-hailing.cancel-fee">
          <PuInlineNotice
            :tone="cancelFeeFen > 0 ? 'warning' : 'info'"
            :title="cancelFeeFen > 0 ? '将产生取消费' : '本次取消无取消费'"
            :message="cancelFeeMessage"
          />
        </div>
      </div>

      <template #actions>
        <PuButton
          type="button"
          tone="neutral"
          variant="ghost"
          :disabled="cancelMutation.isPending.value"
          data-testid="order-detail.ride-hailing.cancel-confirm.dismiss"
          @click="closeCancelConfirmDialog"
        >
          再想想
        </PuButton>
        <PuButton
          type="button"
          tone="danger"
          variant="solid"
          :loading="cancelMutation.isPending.value"
          :disabled="cancelMutation.isPending.value"
          data-testid="order-detail.ride-hailing.cancel-confirm.confirm"
          @click="confirmRideHailingCancellation"
        >
          确认取消
        </PuButton>
      </template>
    </PuDialog>
  </section>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuCard,
  PuDialog,
  PuFloatPanel,
  type PuFloatPanelStop,
  PuImg,
  PuInlineNotice,
} from "@partner-up-dev/design-web";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import {
  type CommerceOrderDetailResponse,
  useCancelOrder,
  useRideHailingCancellationFeePreview,
} from "@/domains/commerce/queries/useCommerce";
import BillCard from "@/domains/commerce/ui/order-detail/BillCard.vue";
import RideHailingSkuCard from "@/domains/commerce/ui/ordering/RideHailingSkuCard.vue";
import { logCommerceOrderDetailDebug } from "@/domains/commerce/use-cases/order-detail-debug";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import RoutePointList from "@/domains/route/ui/RoutePointList.vue";
import type { MapFitPadding, MapViewportFollowMode } from "@/shared/map/types";
import { buildRideHailingOrderMapViewModel } from "./ride-hailing-order-map-view-model";

type RideHailingDetail = NonNullable<CommerceOrderDetailResponse["rideHailing"]>;
type OrderItemSnapshot = CommerceOrderDetailResponse["order"]["items"][number];
type RideHailingChoiceSetItemSnapshot = Extract<
  OrderItemSnapshot,
  { kind: "CHOICE_SET"; productType: "RIDE_HAILING" }
>;
type ResolvedRideHailingSkuSnapshot = NonNullable<
  NonNullable<RideHailingChoiceSetItemSnapshot["resolution"]>["sku"]
>;
type RidePanelStopValue = "peek" | "normal" | "expanded";
type ResolvedRideHailingVehicleCard = {
  itemId: string;
  displayName: string;
  previewSrc: string | null;
  priceLabel: string;
};

const props = defineProps<{
  detail: CommerceOrderDetailResponse;
  ride: RideHailingDetail;
  routeOrderId: string | null;
}>();

const cancelMutation = useCancelOrder();
const cancelFeePreviewMutation = useRideHailingCancellationFeePreview();

const DEFAULT_CONTENT_HEIGHT = 720;

const contentRoot = ref<HTMLElement | null>(null);
const contentHeight = ref(DEFAULT_CONTENT_HEIGHT);
const panelStop = ref<RidePanelStopValue>("normal");
const showCancelConfirmDialog = ref(false);

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
    title: "接客中",
    description: "司机正在前往上车点，请提前到达约定地点",
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

const canRequestCancellation = computed(() => props.detail.cancellation.canRequest);

const showsCancelAction = computed(
  () =>
    ["DISPATCHING", "ACCEPTED", "ARRIVED_AT_PICKUP"].includes(props.ride.executionPhase) &&
    canRequestCancellation.value,
);

const cancelErrorMessage = computed(() =>
  cancelFeePreviewMutation.error.value instanceof Error
    ? cancelFeePreviewMutation.error.value.message
    : cancelMutation.error.value instanceof Error
      ? cancelMutation.error.value.message
      : null,
);

const cancelActionPending = computed(
  () => cancelFeePreviewMutation.isPending.value || cancelMutation.isPending.value,
);

const firstPresentString = (values: readonly (string | null | undefined)[]): string | null => {
  for (const value of values) {
    const normalized = value?.trim() ?? "";
    if (normalized.length > 0) return normalized;
  }
  return null;
};

const showsDriverCard = computed(() => Boolean(props.ride.driver || props.ride.vehicle));

const driverName = computed(() => firstPresentString([props.ride.driver?.driverName]) ?? "司机");

const driverAvatarInitial = computed(() => driverName.value.trim().slice(0, 1) || "司");

const driverCallHref = computed(() => {
  const phone = firstPresentString([props.ride.driver?.driverPhone]);
  if (!phone) return null;
  return `tel:${phone.replace(/\s+/g, "")}`;
});

const vehiclePlate = computed(
  () => firstPresentString([props.ride.vehicle?.plate]) ?? "车牌待确认",
);

const vehicleDescription = computed(() => {
  const description = [props.ride.vehicle?.brand, props.ride.vehicle?.color]
    .map((item) => item?.trim() ?? "")
    .filter((item) => item.length > 0)
    .join(" · ");
  return description || "车辆信息待确认";
});

const showsDispatchingCandidateVehicles = computed(
  () => props.ride.executionPhase === "DISPATCHING" && props.ride.candidateVehicles.length > 0,
);

const isRideHailingChoiceSetItem = (
  item: OrderItemSnapshot,
): item is RideHailingChoiceSetItemSnapshot =>
  item.kind === "CHOICE_SET" && item.productType === "RIDE_HAILING";

const readResolvedSkuPreviewSrc = (sku: ResolvedRideHailingSkuSnapshot): string | null =>
  directImageSrc(
    firstPresentString([
      sku?.presentationSnapshot.heroImageAssetIds[0],
      sku?.presentationSnapshot.detailImageAssetIds[0],
    ]),
  );

const resolvedServiceVehicles = computed<ResolvedRideHailingVehicleCard[]>(() =>
  props.detail.order.items.flatMap((item) => {
    if (!isRideHailingChoiceSetItem(item)) return [];
    const resolvedSku = item.resolution?.sku;
    if (!resolvedSku) return [];
    return [
      {
        itemId: item.itemId,
        displayName:
          firstPresentString([item.resolution?.quoteSnapshot?.displayName, resolvedSku.name]) ??
          "服务车型",
        previewSrc: readResolvedSkuPreviewSrc(resolvedSku),
        priceLabel: formatFen(item.resolution?.quoteSnapshot?.amountFen),
      },
    ];
  }),
);

const billId = computed(() => {
  const value = props.detail.bill?.id?.trim() ?? "";
  return value.length > 0 ? value : null;
});

const cancelFeeFen = computed(() => cancelFeePreviewMutation.data.value?.cancelFeeFen ?? 0);

const cancelFeeMessage = computed(() => {
  if (cancelFeeFen.value > 0) {
    return `服务商预估本次取消将收取 ${formatFen(cancelFeeFen.value)}，确认后将提交取消请求。`;
  }
  return "服务商预估本次取消不收取取消费，确认后将提交取消请求。";
});

const cancelConfirmDescription = computed(() =>
  cancelFeeFen.value > 0 ? "取消后仍需承担取消费。" : "取消后订单将结束。",
);

const closeCancelConfirmDialog = (): void => {
  if (cancelMutation.isPending.value) return;
  showCancelConfirmDialog.value = false;
};

const previewRideHailingCancellationFee = async (): Promise<void> => {
  logCommerceOrderDetailDebug("ride-content.cancel-preview.click", {
    routeOrderId: props.routeOrderId,
    detailOrderId: props.detail.order.id,
    providerOrderId: props.ride.provider.providerOrderId,
    executionPhase: props.ride.executionPhase,
  });
  const preview = await cancelFeePreviewMutation.mutateAsync(props.detail.order.id);
  if (preview.cancelFeeFen <= 0) {
    await executeRideHailingCancellation("no-fee-preview");
    return;
  }
  showCancelConfirmDialog.value = true;
};

const executeRideHailingCancellation = async (
  source: "fee-confirm" | "no-fee-preview",
): Promise<void> => {
  logCommerceOrderDetailDebug("ride-content.cancel.execute", {
    source,
    routeOrderId: props.routeOrderId,
    detailOrderId: props.detail.order.id,
    providerOrderId: props.ride.provider.providerOrderId,
    executionPhase: props.ride.executionPhase,
    cancelFeeFen: cancelFeeFen.value,
  });
  await cancelMutation.mutateAsync(props.detail.order.id);
  showCancelConfirmDialog.value = false;
};

const confirmRideHailingCancellation = async (): Promise<void> => {
  await executeRideHailingCancellation("fee-confirm");
};

const orderMapViewModel = computed(() =>
  buildRideHailingOrderMapViewModel({
    executionPhase: props.ride.executionPhase,
    live: props.ride.live,
    route: props.ride.route,
  }),
);

const routeMapViewportFollowMode = computed<MapViewportFollowMode>(() =>
  orderMapViewModel.value.activeGeometry?.kind === "marker" &&
  (orderMapViewModel.value.mode === "PICKING_UP" || orderMapViewModel.value.mode === "IN_TRIP")
    ? "active-marker"
    : "none",
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

watch(
  () => ({
    routeOrderId: props.routeOrderId,
    detailOrderId: props.detail.order.id,
    detailOrderStatus: props.detail.order.status,
    providerOrderId: props.ride.provider.providerOrderId,
    executionPhase: props.ride.executionPhase,
    driverName: props.ride.driver?.driverName ?? null,
    vehiclePlate: props.ride.vehicle?.plate ?? null,
    billId: billId.value,
    mapMode: orderMapViewModel.value.mode,
    viewportFollowMode: routeMapViewportFollowMode.value,
    panelStop: panelStop.value,
  }),
  (snapshot) => {
    logCommerceOrderDetailDebug("ride-content.snapshot", snapshot);
  },
  { immediate: true },
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

.ride-hailing-order-content__driver-card {
  margin-top: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-small);
}

.ride-hailing-order-content__driver-layout {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-medium);
}

.ride-hailing-order-content__driver-profile {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: var(--sys-spacing-xsmall);

  strong {
    @include mx.pu-font(caption);
    max-width: 4.5rem;
    overflow: hidden;
    color: var(--sys-color-on-surface);
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ride-hailing-order-content__vehicle-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);

  strong,
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  strong {
    @include mx.pu-font(title);
    color: var(--sys-color-on-surface);
  }

  span {
    @include mx.pu-font(caption);
    color: var(--sys-color-on-surface-variant);
  }
}

.ride-hailing-order-content__driver-layout :deep(.pu-button) {
  flex: 0 0 auto;

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
  gap: var(--sys-spacing-medium);
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

.ride-hailing-order-content__resolved-vehicle-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
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

  >span {
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
