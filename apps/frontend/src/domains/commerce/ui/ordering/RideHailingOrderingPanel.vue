<template>
  <template v-if="rideOffer">
    <div class="ride-hailing-ordering-panel">
      <RouteMap
        class="ride-hailing-ordering-panel__route-map"
        data-testid="ordering.ride-hailing.route-map"
        :route="routeForMap"
        :planned-polyline="plannedPolyline"
        :fit-padding="routeMapFitPadding"
        :interactive="false"
        variant="immersive"
        hide-bottom-attribution
      />

      <div
        class="ride-hailing-ordering-panel__sheet"
        data-testid="ordering.ride-hailing.bottom-sheet"
      >
        <div class="ride-hailing-ordering-panel__handle" aria-hidden="true"></div>

        <div
          class="ride-hailing-ordering-panel__passengers"
          data-testid="ordering.ride-hailing.riders"
        >
          <div>
            <span>同乘人</span>
            <strong>{{ riderSummary }}</strong>
          </div>
          <small data-testid="ordering.ride-hailing.departure-time">
            {{ rideDepartureLabel }}
          </small>
        </div>

        <div class="ride-hailing-ordering-panel__vehicles">
          <RideHailingSkuCard
            v-for="option in rideQuoteOptions"
            :key="option.skuId"
            :display-name="option.displayName"
            :price-label="formatFen(option.quoteAmountFen)"
            :selectable="option.selectable"
            :selected="option.skuId === selectedRideSkuId"
            :disabled-reason="option.disabledReason"
            @select="selectedRideSkuId = option.skuId"
          />
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import type { Route, RoutePoint } from "@/domains/route/model/route";
import type { MapCoordinate, MapFitPadding } from "@/shared/map/types";
import RideHailingSkuCard from "./RideHailingSkuCard.vue";
import type {
  BoundOrderParticipant,
  OrderingContentInput,
  OrderingContentOutput,
} from "@/domains/commerce/model/ordering-content";
import {
  readBindingValue,
  readBoundOrderParticipants,
} from "@/domains/commerce/model/ordering-content";
import type { CreateOrderInput } from "@/domains/commerce/queries/useCommerce";

export type RideVehicleOption = {
  skuId: number;
  spuId: number;
  name: string;
  displayName: string;
  selectable: boolean;
  selected: boolean;
  disabledReason: string | null;
  estimateAmountFen: number | null;
  quoteAmountFen: number | null;
};

type RideRouteSnapshot = Extract<
  CreateOrderInput["productTypedExtraProperties"],
  { route: unknown }
>["route"];
type RideOffer = OrderingContentInput["offerDetail"];

const props = defineProps<{
  input: OrderingContentInput;
  evaluatedOptions: RideVehicleOption[];
}>();

const emit = defineEmits<{
  "update:output": [value: OrderingContentOutput | null];
  "evaluation-output-change": [value: OrderingContentOutput | null];
}>();

const selectedRideSkuId = ref<number | null>(null);
const rideContactPhone = ref("");

const rideOffer = computed<RideOffer | null>(() =>
  props.input.offerDetail.productType === "RIDE_HAILING"
    ? props.input.offerDetail
    : null,
);

const bindingValue = (key: string): unknown | null =>
  readBindingValue(props.input.bindings, key);

const isRideRouteSnapshot = (value: unknown): value is RideRouteSnapshot => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.origin === "object" &&
    record.origin !== null &&
    typeof record.destination === "object" &&
    record.destination !== null
  );
};

const rideRoute = computed<RideRouteSnapshot | null>(() => {
  const value = bindingValue("route");
  return isRideRouteSnapshot(value) ? value : null;
});

const rideDepartureAt = computed(() => {
  const value = bindingValue("departureAt");
  return typeof value === "string" ? value : null;
});

const boundContactPhone = computed(() => {
  const value = bindingValue("contactPhone");
  return typeof value === "string" ? value.trim() : "";
});

const rideRiders = computed<BoundOrderParticipant[]>(() =>
  readBoundOrderParticipants(props.input.bindings),
);

const riderSummary = computed(() => {
  if (rideRiders.value.length === 0) return "待确认";
  return rideRiders.value.map((rider) => rider.displayName).join("、");
});

const toRoutePoint = (place: unknown): RoutePoint | null => {
  if (typeof place !== "object" || place === null || Array.isArray(place)) {
    return null;
  }
  const record = place as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name : "";
  const fullAddress =
    typeof record.full_address === "string"
      ? record.full_address
      : typeof record.address === "string"
        ? record.address
        : null;

  if (
    typeof record.latitude === "number" &&
    typeof record.longitude === "number"
  ) {
    return {
      name,
      full_address: fullAddress,
      gcj02: [record.latitude, record.longitude],
      bd09: null,
      wgs84: null,
    };
  }

  const gcj02 = Array.isArray(record.gcj02) ? record.gcj02 : null;
  if (typeof gcj02?.[0] === "number" && typeof gcj02[1] === "number") {
    return {
      name,
      full_address: fullAddress,
      gcj02: [gcj02[0], gcj02[1]],
      bd09: null,
      wgs84: null,
    };
  }

  return null;
};

const routeForMap = computed<Route | null>(() => {
  const route = rideRoute.value;
  if (!route) return null;
  const record = route as Record<string, unknown>;
  const origin = toRoutePoint(record.origin);
  const destination = toRoutePoint(record.destination);
  if (!origin || !destination) return null;
  const waypoints = Array.isArray(record.waypoints)
    ? record.waypoints.flatMap((point) => {
        const routePoint = toRoutePoint(point);
        return routePoint ? [routePoint] : [];
      })
    : [];
  return [origin, ...waypoints, destination];
});

const plannedPolyline = computed<MapCoordinate[] | null>(() => {
  const route = rideRoute.value as Record<string, unknown> | null;
  const drivingPlan =
    typeof route?.drivingPlan === "object" && route.drivingPlan !== null
      ? (route.drivingPlan as Record<string, unknown>)
      : null;
  const rawPolyline = Array.isArray(drivingPlan?.polyline)
    ? drivingPlan.polyline
    : null;
  const polyline =
    rawPolyline?.flatMap((point): MapCoordinate[] => {
      if (typeof point !== "object" || point === null || Array.isArray(point)) {
        return [];
      }
      const record = point as Record<string, unknown>;
      if (
        typeof record.latitude === "number" &&
        typeof record.longitude === "number"
      ) {
        return [{ lat: record.latitude, lng: record.longitude }];
      }
      return [];
    }) ?? [];
  return polyline.length >= 2 ? polyline : null;
});

const routeMapFitPadding: MapFitPadding = {
  top: 48,
  right: 32,
  bottom: 260,
  left: 32,
};

const rideBaseOptions = computed<RideVehicleOption[]>(() =>
  rideOffer.value?.spus.flatMap((spu) =>
    spu.skuOptions.map((sku) => ({
      skuId: sku.skuId,
      spuId: sku.spuId,
      name: sku.name,
      displayName: sku.name,
      selectable: true,
      selected: false,
      disabledReason: null,
      estimateAmountFen: null,
      quoteAmountFen: null,
    })),
  ) ?? [],
);

const rideQuoteOptions = computed<RideVehicleOption[]>(() =>
  props.evaluatedOptions.length > 0
    ? props.evaluatedOptions
    : rideBaseOptions.value,
);

const rideDepartureLabel = computed(() => {
  const departureAt = rideDepartureAt.value;
  if (!departureAt) return "现在出发";
  return `${formatTime(departureAt)}出发`;
});

const evaluationOutput = computed<OrderingContentOutput | null>(() => {
  if (!rideOffer.value || selectedRideSkuId.value === null || !rideRoute.value) {
    return null;
  }
  const phone = rideContactPhone.value.trim();
  if (rideRiders.value.length === 0) return null;
  return {
    participants: rideRiders.value.map((rider) => ({
      userId: rider.userId,
    })),
    items: [
      {
        skuId: selectedRideSkuId.value,
        quantity: 1,
      },
    ],
    productTypedExtraProperties: {
      route: rideRoute.value,
      departureAt: rideDepartureAt.value,
      riders: rideRiders.value.map((rider) => rider.userId),
      contactPhone: phone,
    },
  };
});

const output = computed<OrderingContentOutput | null>(() => {
  const next = evaluationOutput.value;
  if (!next) return null;
  if (
    "contactPhone" in next.productTypedExtraProperties &&
    next.productTypedExtraProperties.contactPhone.trim().length > 0
  ) {
    return next;
  }
  return null;
});

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};

const formatTime = (value: string): string =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

watch(
  rideQuoteOptions,
  (next) => {
    const currentOption = next.find(
      (option) => option.skuId === selectedRideSkuId.value,
    );
    if (currentOption?.selectable) return;
    const defaultOption =
      next.find((option) => option.selected && option.selectable) ??
      next.find((option) => option.selectable) ??
      null;
    selectedRideSkuId.value = defaultOption?.skuId ?? null;
  },
  { immediate: true },
);

watch(output, (next) => emit("update:output", next), {
  immediate: true,
  deep: true,
});

watch(evaluationOutput, (next) => emit("evaluation-output-change", next), {
  immediate: true,
  deep: true,
});

watch(
  boundContactPhone,
  (next) => {
    if (rideContactPhone.value.trim().length === 0) {
      rideContactPhone.value = next;
    }
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.ride-hailing-ordering-panel {
  position: relative;
  width: 100%;
  min-height: 0;
}

.ride-hailing-ordering-panel,
.ride-hailing-ordering-panel__route-map {
  height: 100%;
}

.ride-hailing-ordering-panel__route-map :deep(.route-map),
.ride-hailing-ordering-panel__route-map :deep(.map-shell) {
  height: 100%;
  border: 0;
  border-radius: 0;
}

.ride-hailing-ordering-panel__route-map {
  pointer-events: none;
}

.ride-hailing-ordering-panel__sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  max-height: 55%;
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-medium);
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
  background: var(--sys-color-surface);
  box-shadow: var(--sys-shadow-3);
}

.ride-hailing-ordering-panel__handle {
  width: 2rem;
  height: 0.25rem;
  margin: var(--sys-spacing-small) auto 0;
  border-radius: 999px;
  background: var(--sys-color-on-surface-variant);
}

.ride-hailing-ordering-panel__passengers {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  min-width: 0;

  div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: calc(var(--sys-spacing-xsmall) / 2);
  }

  span,
  small {
    @include mx.pu-font(control);
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(body);
    overflow-wrap: anywhere;
  }
}

.ride-hailing-ordering-panel__vehicles {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  min-height: 0;
  overflow: auto;
  padding-bottom: calc(var(--sys-spacing-xsmall) / 2);
}
</style>
