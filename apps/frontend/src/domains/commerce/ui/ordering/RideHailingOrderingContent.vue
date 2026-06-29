<template>
  <div ref="contentRoot" class="ride-hailing-ordering-content">
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

    <PuFloatPanel
      v-model="ridePanelStop"
      class="ride-hailing-ordering-content__sheet"
      data-testid="ordering.ride-hailing.bottom-sheet"
      :stops="ridePanelStops"
      position="absolute"
      :content-padding="false"
      aria-label="车型面板"
      :z-index="20"
    >
      <div class="ride-hailing-ordering-content__vehicles">
        <div
          v-if="listingBlocker"
          class="ride-hailing-ordering-content__listing-state"
          data-testid="ordering.ride-hailing.listing-blocker"
          :data-reason="listingBlocker.reason"
        >
          <PuInlineNotice
            tone="error"
            :title="listingBlocker.title"
            :message="listingBlocker.message"
          >
            <template v-if="listingBlocker.actionLabel" #actions>
              <PuButton
                size="sm"
                tone="primary"
                variant="soft"
                data-testid="ordering.ride-hailing.listing-blocker.action"
                @click="emit('resolve:blocker', listingBlocker)"
              >
                {{ listingBlocker.actionLabel }}
              </PuButton>
            </template>
          </PuInlineNotice>
          <PuFormItem
            v-if="listingBlocker.reason === 'missing-contact-phone'"
            label="联系人电话"
            for-id="ride-hailing-contact-phone"
            :hint="rideContactPhoneHint"
            :error="rideContactPhoneDraftError ?? undefined"
            required
          >
            <PuInput
              id="ride-hailing-contact-phone"
              v-model="rideContactPhoneDraft"
              native-type="tel"
              inputmode="numeric"
              autocomplete="tel"
              :maxlength="11"
              clearable
              placeholder="请输入联系人手机号"
              data-testid="ordering.ride-hailing.contact-phone"
            />
            <template #labelTrailing>
              <PuButton
                size="sm"
                tone="primary"
                variant="soft"
                :disabled="!canCommitRideContactPhone"
                data-testid="ordering.ride-hailing.contact-phone.confirm"
                @click="commitRideContactPhone"
              >
                确认并加载
              </PuButton>
            </template>
          </PuFormItem>
        </div>
        <div
          v-else-if="showsRideListingError"
          class="ride-hailing-ordering-content__listing-state"
          data-testid="ordering.ride-hailing.listing-error"
        >
          <PuInlineNotice
            tone="error"
            title="车型报价加载失败"
            :message="rideListingErrorMessage"
          >
            <template #actions>
              <PuButton
                size="sm"
                tone="primary"
                variant="soft"
                data-testid="ordering.ride-hailing.listing.retry"
                @click="refetchRideListing"
              >
                重新加载
              </PuButton>
            </template>
          </PuInlineNotice>
        </div>
        <div
          v-else-if="showsEmptyRideListing"
          class="ride-hailing-ordering-content__listing-state"
          data-testid="ordering.ride-hailing.listing-empty"
        >
          <PuInlineNotice
            tone="error"
            title="未加载到可下单车型"
            message="当前路线没有返回可下单车型，请重新加载或联系支持。"
          >
            <template #actions>
              <PuButton
                size="sm"
                tone="primary"
                variant="soft"
                data-testid="ordering.ride-hailing.listing.retry"
                @click="refetchRideListing"
              >
                重新加载
              </PuButton>
            </template>
          </PuInlineNotice>
        </div>
        <template v-else-if="showsRideQuoteSkeleton">
          <div
            v-for="index in 2"
            :key="index"
            class="ride-hailing-ordering-content__vehicle-skeleton"
            data-testid="ordering.ride-hailing.vehicle-card.skeleton"
          >
            <div class="ride-hailing-ordering-content__vehicle-skeleton-meta">
              <div class="ride-hailing-ordering-content__vehicle-skeleton-name">
                <PuSkeleton width="1.25rem" height="1.25rem" radius="sm" />
                <PuSkeleton width="8.5rem" height="1.125rem" radius="pill" />
              </div>
              <PuSkeleton
                class="ride-hailing-ordering-content__vehicle-skeleton-preview"
                width="min(13.5rem, 100%)"
                height="5rem"
                radius="sm"
                block
              />
            </div>
            <div class="ride-hailing-ordering-content__vehicle-skeleton-price">
              <PuSkeleton width="2.5rem" height="0.875rem" radius="pill" />
              <div class="ride-hailing-ordering-content__vehicle-skeleton-amount">
                <PuSkeleton width="4.25rem" height="1.25rem" radius="pill" />
                <PuSkeleton width="1.25rem" height="1.25rem" radius="sm" />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <RideHailingSkuCard
            v-for="option in visibleRideQuoteOptions"
            :key="option.quoteId"
            :display-name="option.displayName"
            :price-label="formatFen(option.price.totalFen)"
            :selectable="true"
            :selected="rideSkuSelection.isSelected(option.skuId)"
            :preview-src="skuPreviewSrc(option.skuId)"
            @select="rideSkuSelection.toggle(option.skuId)"
          />
        </template>
      </div>
    </PuFloatPanel>

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
      <div
        class="ride-hailing-ordering-content__control ride-hailing-ordering-content__control--static"
        data-testid="ordering.ride-hailing.departure-time.row"
      >
        <span>出发时间</span>
        <strong data-testid="ordering.ride-hailing.departure-time">
          {{ rideDepartureLabel }}
        </strong>
      </div>
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
  </div>
</template>

<script setup lang="ts">
import {
  PuButton,
  PuDrawer,
  PuFloatPanel,
  type PuFloatPanelStop,
  PuFormItem,
  PuInlineNotice,
  PuInput,
  PuSkeleton,
  usePuSelect,
} from "@partner-up-dev/design-web";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
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
  type OfferListingInput,
  type OfferListingResponse,
  useOfferListing,
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
import {
  isRideHailingContactPhoneComplete,
  type RideHailingListingBlocker,
  resolveRideHailingListingBlocker,
  resolveRideHailingListingSurfaceState,
} from "./ride-hailing-listing-state";

export type RideVehicleOption = Extract<
  OfferListingResponse["items"][number],
  { kind: "CHOICE_CANDIDATE" }
>;

type RideRouteSnapshot = Extract<OfferListingInput, { productType: "RIDE_HAILING" }>["route"];
type RideOffer = OrderingContentInput["offerDetail"];
type RideSkuOption = RideOffer["spus"][number]["skuOptions"][number];
type RidePanelStopValue = "minimized" | "normal" | "expanded";

const props = defineProps<{
  input: OrderingContentInput;
  listingRefreshKey: number;
}>();

const emit = defineEmits<{
  "update:output": [value: OrderingContentOutput | null];
  "update:summary": [value: OrderingContentSummary];
  "resolve:blocker": [value: RideHailingListingBlocker];
}>();

const CONTROL_ROW_HEIGHT = 44;
const DEFAULT_CONTENT_HEIGHT = 720;

const contentRoot = ref<HTMLElement | null>(null);
const contentHeight = ref(DEFAULT_CONTENT_HEIGHT);
const ridePanelStop = ref<RidePanelStopValue>("normal");
const rideContactPhone = ref("");
const rideContactPhoneDraft = ref("");
const editableRoute = ref<Route | null>(null);
const routePointDrawerOpen = ref(false);
const selectedRoutePointIndex = ref<number | null>(null);
const ridersDrawerOpen = ref(false);

const rideOffer = computed<RideOffer | null>(() =>
  props.input.offerDetail.productType === "RIDE_HAILING" ? props.input.offerDetail : null,
);

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

const boundContactPhone = computed(() => {
  const value = bindingValue("contactPhone");
  return typeof value === "string" ? value.trim() : "";
});

const routeEditable = computed(() => !isBindingLocked(props.input, "route"));
const ridersLocked = computed(() => isBindingLocked(props.input, "orderParticipants"));

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

const ridePanelStops = computed<PuFloatPanelStop[]>(() => {
  const rootHeight = contentHeight.value || DEFAULT_CONTENT_HEIGHT;
  const maxPanelHeight = Math.max(120, rootHeight - CONTROL_ROW_HEIGHT);
  const minimized = Math.min(132, maxPanelHeight);
  const normal = Math.min(Math.max(264, minimized + 96), maxPanelHeight);
  const expanded = Math.min(Math.max(Math.round(rootHeight * 0.68), normal + 96), maxPanelHeight);
  return [
    { value: "minimized", label: "最小化", height: minimized },
    { value: "normal", label: "正常", height: normal },
    { value: "expanded", label: "展开", height: expanded },
  ];
});

const activeRidePanelStop = computed(
  () =>
    ridePanelStops.value.find((stop) => stop.value === ridePanelStop.value) ??
    ridePanelStops.value[1] ??
    ridePanelStops.value[0] ??
    null,
);

const routeMapFitPadding = computed<MapFitPadding>(() => ({
  top: 48,
  right: 32,
  bottom: (activeRidePanelStop.value?.height ?? 264) + CONTROL_ROW_HEIGHT + 32,
  left: 32,
}));

const rideSkuOptions = computed<RideSkuOption[]>(
  () => rideOffer.value?.spus.flatMap((spu) => spu.skuOptions) ?? [],
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

const skuPreviewSrc = (skuId: number): string | null => {
  const sku = rideSkuOptions.value.find((option) => option.skuId === skuId);
  return (
    directImageSrc(sku?.presentation.heroImageAssetIds[0]) ??
    directImageSrc(sku?.presentation.detailImageAssetIds[0])
  );
};

const listingBlocker = computed<RideHailingListingBlocker | null>(() => {
  return resolveRideHailingListingBlocker({
    hasRideOffer: rideOffer.value !== null,
    hasRoute: rideRouteForSubmit.value !== null,
    contactPhone: rideContactPhone.value,
    riderCount: rideRiders.value.length,
  });
});

const normalizedRideContactPhoneDraft = computed(() => rideContactPhoneDraft.value.trim());

const rideContactPhoneDraftError = computed(() => {
  const phone = normalizedRideContactPhoneDraft.value;
  if (!phone) return null;
  return isRideHailingContactPhoneComplete(phone) ? null : "请输入 11 位大陆手机号";
});

const rideContactPhoneHint = computed(
  () => rideContactPhoneDraftError.value ?? "输入 11 位大陆手机号后点击确认加载车型。",
);

const canCommitRideContactPhone = computed(
  () =>
    isRideHailingContactPhoneComplete(normalizedRideContactPhoneDraft.value) &&
    normalizedRideContactPhoneDraft.value !== rideContactPhone.value.trim(),
);

const commitRideContactPhone = (): void => {
  if (!canCommitRideContactPhone.value) return;
  rideContactPhone.value = normalizedRideContactPhoneDraft.value;
};

const offerListingInput = computed<OfferListingInput | null>(() => {
  const route = rideRouteForSubmit.value;
  if (listingBlocker.value || !rideOffer.value || !route) return null;
  const phone = rideContactPhone.value.trim();
  return {
    productType: "RIDE_HAILING",
    participants: rideRiders.value,
    route,
    departureAt: null,
    riders: rideRiders.value,
    contactPhone: phone,
  };
});

const offerListingQueryInput = computed(() =>
  offerListingInput.value
    ? {
        offerId: props.input.source.offerId,
        listingInput: offerListingInput.value,
      }
    : null,
);

const offerListingQuery = useOfferListing(offerListingQueryInput);

watch(
  () => props.listingRefreshKey,
  () => {
    if (offerListingQueryInput.value) {
      void offerListingQuery.refetch();
    }
  },
);

const rideQuoteOptions = computed<RideVehicleOption[]>(() =>
  (offerListingQuery.data.value?.items ?? []).filter(
    (item): item is RideVehicleOption => item.kind === "CHOICE_CANDIDATE",
  ),
);

const visibleRideQuoteOptions = computed<RideVehicleOption[]>(() => rideQuoteOptions.value);

const rideListingSurfaceState = computed(() =>
  resolveRideHailingListingSurfaceState({
    blocker: listingBlocker.value,
    hasListingInput: offerListingQueryInput.value !== null,
    isPending: offerListingQuery.isPending.value,
    isError: offerListingQuery.isError.value,
    isSuccess: offerListingQuery.isSuccess.value,
    visibleOptionCount: visibleRideQuoteOptions.value.length,
  }),
);

const showsRideQuoteSkeleton = computed(() => rideListingSurfaceState.value === "loading");

const showsRideListingError = computed(() => rideListingSurfaceState.value === "error");

const showsEmptyRideListing = computed(() => rideListingSurfaceState.value === "empty");

const rideListingErrorMessage = computed(() => {
  const error = offerListingQuery.error.value;
  return error instanceof Error ? error.message : "请稍后重试或联系支持。";
});

const refetchRideListing = (): void => {
  if (!offerListingQueryInput.value) return;
  void offerListingQuery.refetch();
};

const rideSkuSelection = usePuSelect<number>({
  multiple: true,
  isOptionDisabled: (skuId) =>
    !visibleRideQuoteOptions.value.some((option) => option.skuId === skuId),
});

const selectedCandidateSkuIds = computed<number[]>(() =>
  rideSkuSelection.selectedValues.value.filter((skuId) =>
    visibleRideQuoteOptions.value.some((option) => option.skuId === skuId),
  ),
);

const selectedRideQuoteOptions = computed<RideVehicleOption[]>(() =>
  selectedCandidateSkuIds.value.flatMap((skuId) => {
    const option = rideQuoteOptions.value.find((candidate) => candidate.skuId === skuId);
    return option ? [option] : [];
  }),
);

const selectedCandidateQuoteIds = computed<string[]>(() =>
  selectedRideQuoteOptions.value.map((option) => option.quoteId),
);

const rideDepartureLabel = computed(() => "现在出发");

const output = computed<OrderingContentOutput | null>(() => {
  if (
    !rideOffer.value ||
    selectedCandidateQuoteIds.value.length === 0 ||
    !rideRouteForSubmit.value
  ) {
    return null;
  }
  return {
    items: [
      {
        kind: "CHOICE_SET",
        candidateQuoteIds: selectedCandidateQuoteIds.value,
        quantity: 1,
      },
    ],
  };
});

const summary = computed<OrderingContentSummary>(() => {
  const selectablePrices = selectedRideQuoteOptions.value
    .map((option) => option.price.totalFen)
    .filter((value): value is number => typeof value === "number");
  const cheapestSelectedOption = [...selectedRideQuoteOptions.value]
    .filter((option) => typeof option.price.totalFen === "number")
    .sort((left, right) => (left.price.totalFen ?? 0) - (right.price.totalFen ?? 0))[0];
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
        selectablePrices.length > 0 &&
        Math.min(...selectablePrices) === Math.max(...selectablePrices)
          ? (selectablePrices[0] ?? null)
          : null,
      range,
      explanations: cheapestSelectedOption?.price.explanations ?? [],
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

watch(
  visibleRideQuoteOptions,
  (next) => {
    const selectableSkuIds = new Set(next.map((option) => option.skuId));
    const currentSelection = rideSkuSelection.selectedValues.value.filter((skuId) =>
      selectableSkuIds.has(skuId),
    );
    if (currentSelection.length !== rideSkuSelection.selectedValues.value.length) {
      rideSkuSelection.setValue(currentSelection);
    }
    if (currentSelection.length > 0) return;
    const defaultOption =
      [...next].sort(
        (left, right) => (left.price.totalFen ?? 0) - (right.price.totalFen ?? 0),
      )[0] ?? null;
    rideSkuSelection.setValue(defaultOption ? [defaultOption.skuId] : []);
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
    if (rideContactPhoneDraft.value.trim().length === 0) {
      rideContactPhoneDraft.value = next;
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
  bottom: var(--ride-hailing-ordering-content-control-row-height);
  z-index: 20;
  border-radius: var(--sys-radius-large) var(--sys-radius-large) 0 0;
}

.ride-hailing-ordering-content__vehicles {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  min-height: 0;
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-small);
}

.ride-hailing-ordering-content__listing-state {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ride-hailing-ordering-content__vehicle-skeleton {
  display: flex;
  min-width: 0;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  padding: var(--sys-spacing-small);
  background: var(--sys-color-surface-container-low);
}

.ride-hailing-ordering-content__vehicle-skeleton-meta {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.ride-hailing-ordering-content__vehicle-skeleton-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
}

.ride-hailing-ordering-content__vehicle-skeleton-preview {
  min-height: 5rem;
  aspect-ratio: 16 / 9;
}

.ride-hailing-ordering-content__vehicle-skeleton-price {
  display: flex;
  flex: 0 0 auto;
  min-width: 5.25rem;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.ride-hailing-ordering-content__vehicle-skeleton-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sys-spacing-xsmall);
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

.ride-hailing-ordering-content__control--static {
  cursor: default;
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
