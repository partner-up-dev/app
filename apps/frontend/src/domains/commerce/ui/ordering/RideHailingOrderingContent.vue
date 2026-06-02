<template>
  <template v-if="rideOffer">
    <section class="ride-content__map" data-testid="ordering.ride-hailing.route-map">
      <div
        class="ride-content__polyline"
        data-testid="ordering.ride-hailing.route-polyline"
      ></div>
      <button
        type="button"
        class="ride-content__route-callout ride-content__route-callout--origin"
        data-testid="ordering.ride-hailing.route-point.origin"
      >
        {{ rideRoute?.origin.name ?? "起点" }}
        <span class="i-mdi-chevron-right"></span>
      </button>
      <button
        type="button"
        class="ride-content__route-callout ride-content__route-callout--destination"
        data-testid="ordering.ride-hailing.route-point.destination"
      >
        {{ rideRoute?.destination.name ?? "终点" }}
        <span class="i-mdi-chevron-right"></span>
      </button>
    </section>

    <SurfaceCard gap="sm">
      <div class="ride-content__row">
        <button
          type="button"
          data-testid="ordering.ride-hailing.departure-time"
          @click="activeDrawer = 'departure'"
        >
          {{ rideDepartureLabel }}
          <span class="i-mdi-chevron-right"></span>
        </button>
        <button
          type="button"
          data-testid="ordering.ride-hailing.riders"
          @click="activeDrawer = 'riders'"
        >
          同乘人
          <span class="i-mdi-chevron-right"></span>
        </button>
        <button
          type="button"
          data-testid="ordering.ride-hailing.contact"
          @click="activeDrawer = 'contact'"
        >
          联系方式
          <span class="i-mdi-chevron-right"></span>
        </button>
      </div>
    </SurfaceCard>

    <div
      v-if="activeDrawer === 'departure'"
      class="ride-content__drawer"
      data-testid="ordering.ride-hailing.departure-drawer"
    >
      <strong>{{ rideDepartureLabel }}</strong>
    </div>
    <div
      v-if="activeDrawer === 'riders'"
      class="ride-content__drawer"
      data-testid="ordering.ride-hailing.riders-drawer"
    >
      <div
        v-for="rider in rideRiders"
        :key="rider.userId"
      >
        {{ rider.displayName }}
      </div>
    </div>
    <div
      v-if="activeDrawer === 'contact'"
      class="ride-content__drawer"
      data-testid="ordering.ride-hailing.contact-drawer"
    >
      <input v-model.trim="rideContactPhone" class="ride-content__input" />
    </div>

    <div class="ride-content__vehicles">
      <ChoiceCard
        v-for="option in rideQuoteOptions"
        :key="option.skuId"
        :active="option.skuId === selectedRideSkuId"
        :disabled="!option.selectable"
        data-testid="ordering.ride-hailing.vehicle-card"
        @click="selectedRideSkuId = option.skuId"
      >
        <div class="ride-content__card">
          <div>
            <strong>{{ option.displayName }}</strong>
            <span>{{ option.disabledReason ?? "实时预估" }}</span>
            <i
              v-if="option.skuId === selectedRideSkuId"
              data-testid="ordering.ride-hailing.vehicle-card.selected"
            ></i>
          </div>
          <b>{{ formatFen(option.quoteAmountFen) }}</b>
        </div>
      </ChoiceCard>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
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
const activeDrawer = ref<"departure" | "riders" | "contact" | null>(null);
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
.ride-content__map {
  position: relative;
  min-height: 18rem;
  overflow: hidden;
  border-radius: var(--sys-radius-medium);
  background:
    linear-gradient(135deg, rgb(229 236 226 / 0.9), rgb(225 233 241 / 0.95)),
    repeating-linear-gradient(
      45deg,
      rgb(255 255 255 / 0.34) 0,
      rgb(255 255 255 / 0.34) 0.5rem,
      transparent 0.5rem,
      transparent 2rem
    );
}

.ride-content__polyline {
  position: absolute;
  inset: 26% 18% 30% 18%;
  border-bottom: 0.28rem solid var(--sys-color-primary);
  border-left: 0.28rem solid var(--sys-color-primary);
  border-radius: 0 0 0 5rem;
}

.ride-content__route-callout {
  position: absolute;
  display: inline-flex;
  align-items: center;
  max-width: min(72%, 18rem);
  min-height: 2.75rem;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: 0 var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-elevation-level2);
  cursor: pointer;
  font: inherit;
  text-align: left;

  span {
    flex: 0 0 auto;
    margin-left: var(--sys-spacing-xsmall);
  }
}

.ride-content__route-callout--origin {
  top: 16%;
  left: 10%;
}

.ride-content__route-callout--destination {
  right: 10%;
  bottom: 15%;
}

.ride-content__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sys-spacing-small);

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--sys-size-large);
    min-width: 0;
    border: none;
    border-radius: var(--sys-radius-small);
    padding: 0 var(--sys-spacing-small);
    background: var(--sys-color-surface-container-high);
    color: var(--sys-color-on-surface);
    cursor: pointer;
    font: inherit;
  }
}

.ride-content__drawer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium) var(--sys-radius-medium) 0 0;
  background: var(--sys-color-surface);
  box-shadow: var(--sys-elevation-level3);
}

.ride-content__input {
  width: 100%;
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-small);
  padding: 0 var(--sys-spacing-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font: inherit;
}

.ride-content__vehicles {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ride-content__card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-medium);
  align-items: center;
  width: 100%;

  div {
    display: flex;
    flex-direction: column;
    gap: var(--sys-spacing-xxsmall);
    min-width: 0;
  }

  span {
    color: var(--sys-color-on-surface-variant);
  }

  i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: var(--sys-color-primary);
  }

  b {
    color: var(--sys-color-primary);
    white-space: nowrap;
  }
}

@media (max-width: 42rem) {
  .ride-content__row {
    grid-template-columns: 1fr;
  }
}
</style>
