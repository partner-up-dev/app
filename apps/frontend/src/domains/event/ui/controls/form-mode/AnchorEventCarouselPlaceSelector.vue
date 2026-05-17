<template>
  <section class="form-mode-place-control">
    <div class="form-mode-place-control__header">
      <h2 class="form-mode-place-control__title">
        {{ t(placeSelector.labelKey) }}
      </h2>
    </div>

    <PeekRadioCarousel
      v-if="placeCards.length > 0"
      :model-value="activeCardId"
      class="place-carousel"
      :items="placeCards"
      :aria-label="t(placeSelector.ariaLabelKey)"
      @keydown.capture="handleCarouselKeydown"
      @update:model-value="handleUpdatePlace"
    >
      <template #item="{ item, selected }">
        <article
          class="place-card"
          data-testid="anchor-event-form-mode.place.option"
          :data-place-id="String(asPlaceCardViewModel(item).id)"
          :class="{
            'place-card--selected': selected,
            'place-card--create': asPlaceCardViewModel(item).isCreateCard,
            'place-card--with-image': Boolean(
              asPlaceCardViewModel(item).coverImage,
            ),
            'place-card--route': asPlaceCardViewModel(item).kind === 'route',
          }"
          @click="handleCardClick(asPlaceCardViewModel(item))"
        >
          <div
            v-if="asPlaceCardViewModel(item).isCreateCard"
            class="place-card__create"
          >
            <span class="place-card__create-icon i-mdi-plus" aria-hidden="true"></span>
          </div>

          <RouteMap
            v-else-if="asPlaceCardViewModel(item).kind === 'route'"
            :route="asRoutePlaceCardViewModel(item).route"
            :interactive="false"
            :fit-padding="24"
            :max-zoom="15"
            variant="inline"
          />

          <img
            v-else-if="asPlaceCardViewModel(item).coverImage"
            :src="asPlaceCardViewModel(item).coverImage ?? undefined"
            :alt="asPlaceCardViewModel(item).label"
            class="place-card__image"
          />

          <div v-else class="place-card__fallback">
            <span>{{ asPlaceCardViewModel(item).label }}</span>
          </div>
        </article>
      </template>
    </PeekRadioCarousel>

    <Transition name="place-label" mode="out-in">
      <div :key="activeCardId ?? 'none'" class="place-caption">
        <ol
          v-if="selectedRoutePoints.length > 0"
          class="place-caption__route-list"
        >
          <li
            v-for="(point, index) in selectedRoutePoints"
            :key="`${index}-${point.name}`"
            class="place-caption__route-item"
          >
            <span
              class="place-caption__route-dot"
              :class="`place-caption__route-dot--${routePointRole(index)}`"
              aria-hidden="true"
            ></span>
            <span class="place-caption__route-name">
              {{ routePointName(point, index) }}
            </span>
          </li>
        </ol>
        <p v-else class="place-caption__name">
          {{ selectedPlaceLabel }}
        </p>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import PeekRadioCarousel, {
  type PeekRadioCarouselItem,
} from "@/domains/event/ui/composites/PeekRadioCarousel.vue";
import RouteMap from "@/domains/route/ui/RouteMap.vue";
import { pickStableGalleryImage } from "@/domains/event/model/form-mode";
import {
  buildFormModePlaceOptions,
  type AnchorEventPlaceOption,
} from "@/domains/event/model/place-options";
import {
  resolveRoutePointRole,
  type RoutePoint,
  type RoutePointRole,
} from "@/domains/route/model/route";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";

type PlaceSelectorView = AnchorEventFormModeResponse["placeSelector"];

const CREATE_LOCATION_CARD_ID = "__create_location__";
const CREATE_ROUTE_CARD_ID = "__create_route__";

type SelectablePlaceCardViewModel = AnchorEventPlaceOption &
  PeekRadioCarouselItem & {
    coverImage: string | null;
    isCreateCard?: false;
  };
type CreatePlaceCardViewModel = PeekRadioCarouselItem & {
  id: typeof CREATE_LOCATION_CARD_ID | typeof CREATE_ROUTE_CARD_ID;
  kind: "create";
  label: string;
  coverImage: null;
  isCreateCard: true;
  createKind: "location" | "route";
};
type PlaceCardViewModel =
  | SelectablePlaceCardViewModel
  | CreatePlaceCardViewModel;

const props = defineProps<{
  modelValue: string | null;
  placeSelector: PlaceSelectorView;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "createLocation": [];
  "createRoute": [];
}>();

const { t } = useI18n();
const activeCardId = ref<string | null>(props.modelValue);
const usesLocationPool = computed(() => props.placeSelector.kind === "location");
const usesRoutePool = computed(() => props.placeSelector.kind === "route");

const selectablePlaceCards = computed<SelectablePlaceCardViewModel[]>(() =>
  buildFormModePlaceOptions({
    placeSelector: props.placeSelector,
    locations: [],
    routes: [],
  }).map((option) => ({
    ...option,
    coverImage:
      option.kind === "location"
        ? pickStableGalleryImage(option.gallery, option.locationId)
        : null,
  })),
);

const createLocationCard = (): CreatePlaceCardViewModel => ({
  kind: "create",
  id: CREATE_LOCATION_CARD_ID,
  label: t(props.placeSelector.applyActionKey ?? "anchorEvent.placeSelector.applyLocation"),
  coverImage: null,
  isCreateCard: true,
  createKind: "location",
});

const createRouteCard = (): CreatePlaceCardViewModel => ({
  kind: "create",
  id: CREATE_ROUTE_CARD_ID,
  label: t(props.placeSelector.applyActionKey ?? "anchorEvent.placeSelector.applyRoute"),
  coverImage: null,
  isCreateCard: true,
  createKind: "route",
});

const placeCards = computed<PlaceCardViewModel[]>(() => [
  ...selectablePlaceCards.value,
  ...(usesLocationPool.value && props.placeSelector.applyActionKey !== null
    ? [createLocationCard()]
    : []),
  ...(usesRoutePool.value && props.placeSelector.applyActionKey !== null
    ? [createRouteCard()]
    : []),
]);

const selectedPlaceCard = computed<PlaceCardViewModel | null>(
  () => placeCards.value.find((place) => place.id === activeCardId.value) ?? null,
);

const selectedRoutePoints = computed<RoutePoint[]>(() =>
  selectedPlaceCard.value?.kind === "route" ? selectedPlaceCard.value.route : [],
);

const selectedPlaceLabel = computed(() => {
  const selected = selectedPlaceCard.value;
  if (selected?.isCreateCard) {
    return selected.label;
  }
  return selected?.label ?? t(props.placeSelector.placeholderKey);
});

const asPlaceCardViewModel = (value: PeekRadioCarouselItem) =>
  value as PlaceCardViewModel;

const asRoutePlaceCardViewModel = (value: PeekRadioCarouselItem) =>
  value as Extract<PlaceCardViewModel, { kind: "route" }>;

const routePointRole = (index: number): RoutePointRole =>
  resolveRoutePointRole(index, selectedRoutePoints.value.length);

const routePointName = (point: RoutePoint, index: number): string =>
  point.name.trim() ||
  t("route.pointFallback", {
    index: index + 1,
  });

const isCreateCardId = (value: string | null): boolean =>
  value === CREATE_LOCATION_CARD_ID || value === CREATE_ROUTE_CARD_ID;

const emitCreateAction = (card: CreatePlaceCardViewModel) => {
  if (card.createKind === "location") {
    emit("createLocation");
    return;
  }
  emit("createRoute");
};

const handleUpdatePlace = (value: string | number | null) => {
  if (value === CREATE_LOCATION_CARD_ID || value === CREATE_ROUTE_CARD_ID) {
    activeCardId.value = value;
    return;
  }

  const nextValue = typeof value === "string" ? value : null;
  activeCardId.value = nextValue;
  emit("update:modelValue", nextValue);
};

const handleCardClick = (card: PlaceCardViewModel) => {
  if (card.kind !== "create") {
    activeCardId.value = card.id;
    emit("update:modelValue", card.id);
    return;
  }

  if (activeCardId.value === card.id) {
    emitCreateAction(card);
    return;
  }

  activeCardId.value = card.id;
};

const handleCarouselKeydown = (event: KeyboardEvent) => {
  if (
    !isCreateCardId(activeCardId.value) ||
    (event.key !== "Enter" && event.key !== " ")
  ) {
    return;
  }

  const activeCard = placeCards.value.find(
    (place) => place.id === activeCardId.value,
  );
  if (!activeCard?.isCreateCard) {
    return;
  }

  event.preventDefault();
  emitCreateAction(activeCard);
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== activeCardId.value && !isCreateCardId(activeCardId.value)) {
      activeCardId.value = value;
    }
  },
);

watch(
  selectablePlaceCards,
  (places) => {
    if (props.modelValue && places.some((place) => place.id === props.modelValue)) {
      return;
    }
    const fallbackPlaceId = places[0]?.id ?? null;
    activeCardId.value = fallbackPlaceId;
    emit("update:modelValue", fallbackPlaceId);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-place-control {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.form-mode-place-control__header {
  display: flex;
  flex-direction: column;
}

.form-mode-place-control__title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.place-card {
  position: relative;
  overflow: hidden;
  height: var(--dcs-event-form-mode-location-card-height);
  border-radius: var(--sys-radius-small);
  background: linear-gradient(
    160deg,
    var(--sys-color-primary-container),
    var(--sys-color-surface-container-high)
  );
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}

.place-card--selected {
  transform: translateY(-6px);
  @include mx.pu-elevation(3);
}

.place-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.place-card--route :deep(.route-map--inline) {
  height: 100%;
  min-height: 100%;
  pointer-events: none;
}

.place-card :deep(.map-shell--inline),
.place-card :deep(.route-map__fallback) {
  height: 100%;
  min-height: 100%;
  border: 0;
  border-radius: 0;
  aspect-ratio: auto;
}

.place-card__fallback,
.place-card__create {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-primary-container);
  text-align: center;
}

.place-card__fallback span {
  @include mx.pu-font(title-medium);
  overflow-wrap: anywhere;
}

.place-card__create-icon {
  @include mx.pu-icon(large);
}

.place-caption {
  min-height: 1.5rem;
}

.place-caption__name {
  margin: 0;
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface);
  text-align: center;
}

.place-caption__route-list {
  display: flex;
  width: min(100%, 28rem);
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.place-caption__route-item {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--sys-spacing-small);
}

.place-caption__route-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.place-caption__route-dot--departure {
  background: var(--sys-color-primary);
}

.place-caption__route-dot--waypoint {
  background: var(--sys-color-tertiary);
}

.place-caption__route-dot--arrival {
  background: var(--sys-color-error);
}

.place-caption__route-name {
  @include mx.pu-font(label-large);
  min-width: 0;
  color: var(--sys-color-on-surface);
  overflow-wrap: anywhere;
}

.place-label-enter-active,
.place-label-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.place-label-enter-from,
.place-label-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
