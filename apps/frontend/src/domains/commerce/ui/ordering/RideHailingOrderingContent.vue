<template>
  <template v-if="rideOffer">
    <div class="ride-hailing-ordering-content">
      <RouteMap
        class="ride-hailing-ordering-content__route-map"
        data-testid="ordering.ride-hailing.route-map"
        :route="routeForMap"
        :fit-padding="routeMapFitPadding"
        :interactive="true"
        :route-points-editable="routeEditable"
        variant="immersive"
        hide-bottom-attribution
        @route-point-click="openRoutePointDrawer"
      />

      <div
        class="ride-hailing-ordering-content__sheet"
        data-testid="ordering.ride-hailing.bottom-sheet"
      >
        <div class="ride-hailing-ordering-content__handle" aria-hidden="true"></div>

        <div class="ride-hailing-ordering-content__vehicles">
          <RideHailingSkuCard
            v-for="option in visibleRideQuoteOptions"
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

      <div
        class="ride-hailing-ordering-content__controls"
        data-testid="ordering.ride-hailing.drawer-control-row"
      >
        <button
          type="button"
          class="ride-hailing-ordering-content__control"
          data-testid="ordering.ride-hailing.riders.open"
          @click="ridersDrawerOpen = true"
        >
          <span data-testid="ordering.ride-hailing.riders">同乘人</span>
          <strong>{{ riderSummary }}</strong>
          <i class="i-mdi-chevron-right" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          class="ride-hailing-ordering-content__control"
          data-testid="ordering.ride-hailing.departure-time.open"
          @click="departureDrawerOpen = true"
        >
          <span>出发时间</span>
          <strong data-testid="ordering.ride-hailing.departure-time">
            {{ rideDepartureLabel }}
          </strong>
          <i class="i-mdi-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <PuDrawer
        :visible="routePointDrawerOpen"
        :title="routePointDrawerTitle"
        max-width="44rem"
        @close="closeRoutePointDrawer"
      >
        <LocationPickerPanel
          v-if="selectedRoutePoint"
          :initial-location="selectedRoutePointInitialLocation"
          data-testid="ordering.ride-hailing.route-point.drawer"
          @pick="handleRoutePointPicked"
          @cancel="closeRoutePointDrawer"
        />
      </PuDrawer>

      <PuDrawer
        v-model:visible="ridersDrawerOpen"
        title="同乘人"
        max-width="44rem"
      >
        <div class="ride-hailing-ordering-content__drawer-content">
          <PuInlineNotice
            v-if="ridersLocked"
            tone="info"
            message="同乘人由当前搭子请求锁定。"
          />
          <div
            v-for="rider in rideRiders"
            :key="rider.userId"
            class="ride-hailing-ordering-content__rider-row"
          >
            <span class="i-mdi-account-circle" aria-hidden="true"></span>
            <div>
              <strong>{{ rider.displayName }}</strong>
              <small>{{ rider.phoneMasked ?? "暂无手机号" }}</small>
            </div>
          </div>
        </div>
      </PuDrawer>

      <PuDrawer
        v-model:visible="departureDrawerOpen"
        title="出发时间"
        max-width="44rem"
      >
        <div class="ride-hailing-ordering-content__drawer-content">
          <PuInlineNotice
            v-if="departureLocked"
            tone="info"
            message="出发时间由当前搭子请求锁定。"
          />
          <PuFormItem
            label="出发时间"
            for-id="ride-hailing-departure-at"
            required
          >
            <PuInput
              id="ride-hailing-departure-at"
              :model-value="editableDepartureInput"
              native-type="datetime-local"
              :disabled="departureLocked"
              data-testid="ordering.ride-hailing.departure-time.input"
              @update:model-value="handleDepartureInput"
            />
          </PuFormItem>
        </div>
      </PuDrawer>
    </div>
  </template>
</template>

<script setup lang="ts">
import { PuDrawer, PuFormItem, PuInlineNotice, PuInput } from "@partner-up-dev/design-web";
import { computed, ref, watch } from "vue";
import type {
  BoundOrderParticipant,
  OrderingContentInput,
  OrderingContentOutput,
  OrderingContentSummary,
} from "@/domains/commerce/model/ordering-content";
import {
  isBindingLocked,
  readBindingValue,
  readBoundOrderParticipants,
} from "@/domains/commerce/model/ordering-content";
import {
  type CreateOrderInput,
  type RideHailingQuoteOptionsInput,
  type RideHailingQuoteOptionsResponse,
  useRideHailingQuoteOptions,
} from "@/domains/commerce/queries/useCommerce";
import type { PickedLocation } from "@/domains/location/model/location-picker";
import LocationPickerPanel from "@/domains/location/ui/LocationPickerPanel.vue";
import {
  applyPickedLocationToRoutePoint,
  cloneRoute,
  pickRoutePointCoordinate,
  type Route,
  type RoutePoint,
  replaceRoutePointAt,
  resolveRoutePointRole,
} from "@/domains/route/model/route";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import type { MapFitPadding } from "@/shared/map/types";
import RideHailingSkuCard from "./RideHailingSkuCard.vue";

export type RideVehicleOption = RideHailingQuoteOptionsResponse["options"][number];

type RideRouteSnapshot = Extract<
  CreateOrderInput["productTypedExtraProperties"],
  { route: unknown }
>["route"];
type RideOffer = OrderingContentInput["offerDetail"];

const props = defineProps<{
  input: OrderingContentInput;
}>();

const emit = defineEmits<{
  "update:output": [value: OrderingContentOutput | null];
  "update:summary": [value: OrderingContentSummary];
}>();

const selectedRideSkuId = ref<number | null>(null);
const rideContactPhone = ref("");
const editableRoute = ref<Route | null>(null);
const routePointDrawerOpen = ref(false);
const selectedRoutePointIndex = ref<number | null>(null);
const ridersDrawerOpen = ref(false);
const departureDrawerOpen = ref(false);
const editableDepartureAt = ref<string | null>(null);

const rideOffer = computed<RideOffer | null>(() =>
  props.input.offerDetail.productType === "RIDE_HAILING" ? props.input.offerDetail : null,
);

const bindingValue = (key: string): unknown | null => readBindingValue(props.input.bindings, key);

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

const routeEditable = computed(() => !isBindingLocked(props.input, "route"));
const ridersLocked = computed(() => isBindingLocked(props.input, "orderParticipants"));
const departureLocked = computed(() => isBindingLocked(props.input, "departureAt"));

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

  if (typeof record.latitude === "number" && typeof record.longitude === "number") {
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

const routeFromBinding = computed<Route | null>(() => {
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

const routeForMap = computed<Route | null>(() => editableRoute.value ?? routeFromBinding.value);

const selectedRoutePoint = computed<RoutePoint | null>(() => {
  const index = selectedRoutePointIndex.value;
  if (index === null) return null;
  return routeForMap.value?.[index] ?? null;
});

const selectedRoutePointInitialLocation = computed<PickedLocation | null>(() => {
  const point = selectedRoutePoint.value;
  if (!point?.gcj02) return null;
  return {
    name: point.name,
    address: point.full_address,
    cityName: null,
    gcj02: [point.gcj02[0], point.gcj02[1]],
  };
});

const routePointDrawerTitle = computed(() => {
  const index = selectedRoutePointIndex.value;
  const route = routeForMap.value;
  if (index === null || !route) return "修改地点";
  const role = resolveRoutePointRole(index, route.length);
  if (role === "departure") return "修改上车点";
  if (role === "arrival") return "修改目的地";
  return "修改途经点";
});

type RidePlaceSnapshot = {
  name: string;
  address?: string | null;
  latitude: number;
  longitude: number;
};

const toRidePlaceSnapshot = (point: RoutePoint): RidePlaceSnapshot | null => {
  const coordinate = pickRoutePointCoordinate(point);
  const name = point.name.trim();
  if (!coordinate || name.length === 0) return null;
  return {
    name,
    address: point.full_address,
    latitude: coordinate.lat,
    longitude: coordinate.lng,
  };
};

const rideRouteForSubmit = computed<RideRouteSnapshot | null>(() => {
  const route = routeForMap.value;
  if (!route || route.length < 2) return rideRoute.value;
  const places = route.map(toRidePlaceSnapshot);
  if (places.some((place) => place === null)) return rideRoute.value;
  const resolvedPlaces = places as RidePlaceSnapshot[];
  const origin = resolvedPlaces[0];
  const destination = resolvedPlaces[resolvedPlaces.length - 1];
  if (!origin || !destination) return rideRoute.value;
  return {
    origin,
    waypoints: resolvedPlaces.slice(1, -1),
    destination,
    drivingPlan: null,
  };
});

const routeMapFitPadding: MapFitPadding = {
  top: 48,
  right: 32,
  bottom: 260,
  left: 32,
};

const rideBaseOptions = computed<RideVehicleOption[]>(
  () =>
    rideOffer.value?.spus.flatMap((spu) =>
      spu.skuOptions.map((sku) => ({
        skuId: sku.skuId,
        spuId: sku.spuId,
        name: sku.name,
        providerName: "服务商",
        carTypeName: sku.name,
        displayName: sku.name,
        providerVehicleTypeCode: "",
        providerInstanceId: "",
        selectable: true,
        selected: false,
        disabledReason: null,
        estimateAmountFen: null,
        quoteAmountFen: null,
        priceExplanations: [],
      })),
    ) ?? [],
);

const quoteOptionsInput = computed<RideHailingQuoteOptionsInput | null>(() => {
  const route = rideRouteForSubmit.value;
  if (!rideOffer.value || !route) return null;
  return {
    source: {
      offerId: props.input.source.offerId,
    },
    route,
  };
});

const quoteOptionsQuery = useRideHailingQuoteOptions(quoteOptionsInput);

const rideQuoteOptions = computed<RideVehicleOption[]>(() =>
  quoteOptionsQuery.data.value?.options ?? rideBaseOptions.value,
);

const hasQuotedOptions = computed(
  () => (quoteOptionsQuery.data.value?.options.length ?? 0) > 0,
);

const visibleRideQuoteOptions = computed<RideVehicleOption[]>(() =>
  hasQuotedOptions.value
    ? rideQuoteOptions.value.filter((option) => option.selectable)
    : rideQuoteOptions.value,
);

const selectedRideQuoteOption = computed<RideVehicleOption | null>(() => {
  if (selectedRideSkuId.value === null) return null;
  return (
    rideQuoteOptions.value.find((option) => option.skuId === selectedRideSkuId.value) ??
    null
  );
});

const rideDepartureLabel = computed(() => {
  const departureAt = editableDepartureAt.value;
  if (!departureAt) return "现在出发";
  return `${formatTime(departureAt)}出发`;
});

const editableDepartureInput = computed(() =>
  editableDepartureAt.value ? toDateTimeLocalValue(editableDepartureAt.value) : "",
);

const output = computed<OrderingContentOutput | null>(() => {
  if (!rideOffer.value || selectedRideSkuId.value === null || !rideRouteForSubmit.value) {
    return null;
  }
  const selectedOption = selectedRideQuoteOption.value;
  if (
    !selectedOption?.selectable ||
    typeof selectedOption.quoteAmountFen !== "number"
  ) {
    return null;
  }
  const phone = rideContactPhone.value.trim();
  if (!phone) return null;
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
      route: rideRouteForSubmit.value,
      departureAt: editableDepartureAt.value,
      riders: rideRiders.value.map((rider) => rider.userId),
      contactPhone: phone,
    },
  };
});

const summary = computed<OrderingContentSummary>(() => {
  const selectedOption = selectedRideQuoteOption.value;
  const selectablePrices = rideQuoteOptions.value
    .filter((option) => option.selectable)
    .map((option) => option.quoteAmountFen)
    .filter((value): value is number => typeof value === "number");
  const range =
    selectablePrices.length > 0
      ? {
          minFen: Math.min(...selectablePrices),
          maxFen: Math.max(...selectablePrices),
        }
      : null;
  return {
    price: {
      currency: "CNY",
      totalFen:
        typeof selectedOption?.quoteAmountFen === "number"
          ? selectedOption.quoteAmountFen
          : null,
      range,
      explanations: selectedOption?.priceExplanations ?? [],
    },
  };
});

const formatFen = (amountFen: number | null | undefined): string => {
  if (typeof amountFen !== "number") return "待确认";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amountFen / 100);
};

const openRoutePointDrawer = (index: number) => {
  if (!routeEditable.value) return;
  selectedRoutePointIndex.value = index;
  routePointDrawerOpen.value = true;
};

const closeRoutePointDrawer = () => {
  routePointDrawerOpen.value = false;
};

const handleRoutePointPicked = (location: PickedLocation) => {
  if (!routeEditable.value) return;
  const index = selectedRoutePointIndex.value;
  const currentRoute = routeForMap.value;
  const point = selectedRoutePoint.value;
  if (index === null || !currentRoute || !point) return;
  editableRoute.value = replaceRoutePointAt({
    route: currentRoute,
    index,
    point: applyPickedLocationToRoutePoint({
      point,
      location,
    }),
  });
  closeRoutePointDrawer();
};

const formatTime = (value: string): string =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const toDateTimeLocalValue = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => input.toString().padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
};

const handleDepartureInput = (value: string) => {
  if (departureLocked.value) return;
  editableDepartureAt.value = value.length > 0 ? new Date(value).toISOString() : null;
};

watch(
  visibleRideQuoteOptions,
  (next) => {
    const currentOption = next.find((option) => option.skuId === selectedRideSkuId.value);
    if (currentOption?.selectable) return;
    const defaultOption =
      next.find((option) => option.selected && option.selectable) ??
      next.find((option) => option.selectable) ??
      null;
    selectedRideSkuId.value = defaultOption?.skuId ?? null;
  },
  { immediate: true },
);

watch(
  routeFromBinding,
  (next) => {
    editableRoute.value = cloneRoute(next);
  },
  { immediate: true },
);

watch(
  rideDepartureAt,
  (next) => {
    editableDepartureAt.value = next;
  },
  { immediate: true },
);

watch(output, (next) => emit("update:output", next), {
  immediate: true,
  deep: true,
});

watch(summary, (next) => emit("update:summary", next), {
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
.ride-hailing-ordering-content {
  --ride-hailing-ordering-content-control-row-height: 2.75rem;
  position: relative;
  width: 100%;
  min-height: 0;
}

.ride-hailing-ordering-content,
.ride-hailing-ordering-content__route-map {
  height: 100%;
}

.ride-hailing-ordering-content__route-map :deep(.route-map),
.ride-hailing-ordering-content__route-map :deep(.map-shell) {
  height: 100%;
  border: 0;
  border-radius: 0;
}

.ride-hailing-ordering-content__sheet {
  position: absolute;
  right: 0;
  bottom: var(--ride-hailing-ordering-content-control-row-height);
  left: 0;
  z-index: 20;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 55%;
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
  background: var(--sys-color-surface);
  box-shadow: var(--sys-shadow-3);
}

.ride-hailing-ordering-content__handle {
  width: 2rem;
  height: 0.25rem;
  margin: var(--sys-spacing-small) auto 0;
  border-radius: 999px;
  background: var(--sys-color-on-surface-variant);
}

.ride-hailing-ordering-content__vehicles {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  min-height: 0;
  overflow: auto;
}

.ride-hailing-ordering-content__controls {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  min-height: var(--ride-hailing-ordering-content-control-row-height);
  border-top: 1px solid var(--sys-color-outline-variant);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-medium);
  background: var(--sys-color-surface-container);
}

.ride-hailing-ordering-content__control {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  border: 0;
  padding: var(--sys-spacing-xsmall);
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  span {
    @include mx.pu-font(control);
    flex: 0 0 auto;
    color: var(--sys-color-on-surface-variant);
  }

  strong {
    @include mx.pu-font(control);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i {
    @include mx.pu-icon(small);
    flex: 0 0 auto;
    color: var(--sys-color-on-surface-variant);
  }
}

.ride-hailing-ordering-content__drawer-content {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ride-hailing-ordering-content__rider-row {
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
  }

  small {
    @include mx.pu-font(support);
    color: var(--sys-color-on-surface-variant);
  }
}
</style>
