<template>
  <section class="form-mode-location-control">
    <div class="form-mode-location-control__header">
      <h2 class="form-mode-location-control__title">
        {{ t("anchorEvent.formMode.locationTitle") }}
      </h2>
    </div>

    <PeekRadioCarousel
      v-if="locationCards.length > 0"
      :model-value="activeCardId"
      class="location-carousel"
      :items="locationCards"
      :aria-label="t('anchorEvent.formMode.locationAriaLabel')"
      @keydown.capture="handleCarouselKeydown"
      @update:model-value="handleUpdateLocation"
    >
      <template #item="{ item, selected }">
        <article
          class="location-card"
          data-testid="anchor-event-form-mode.location.option"
          :data-location-id="String(asLocationCardViewModel(item).id)"
          :class="{
            'location-card--selected': selected,
            'location-card--create': asLocationCardViewModel(item).isCreateCard,
            'location-card--with-image': Boolean(
              asLocationCardViewModel(item).coverImage,
            ),
          }"
          @click="handleCardClick(asLocationCardViewModel(item))"
        >
          <div
            v-if="asLocationCardViewModel(item).isCreateCard"
            class="location-card__create"
          >
            <span class="location-card__create-icon i-mdi-plus" aria-hidden="true"></span>
          </div>
          <img
            v-else-if="asLocationCardViewModel(item).coverImage"
            :src="asLocationCardViewModel(item).coverImage ?? undefined"
            :alt="String(asLocationCardViewModel(item).id)"
            class="location-card__image"
          />
          <div v-else class="location-card__fallback">
            <span>{{ asLocationCardViewModel(item).id }}</span>
          </div>
        </article>
      </template>
    </PeekRadioCarousel>

    <Transition name="location-label" mode="out-in">
      <div :key="activeCardId ?? 'none'" class="location-caption">
        <p class="location-caption__name">
          {{ selectedLocationLabel }}
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
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import { pickStableGalleryImage } from "@/domains/event/model/form-mode";

type LocationEntry = AnchorEventFormModeResponse["locations"][number];

const CREATE_LOCATION_CARD_ID = "__create_location__";

type LocationCardViewModel = LocationEntry &
  PeekRadioCarouselItem & {
    coverImage: string | null;
    isCreateCard?: boolean;
  };

const props = defineProps<{
  modelValue: string | null;
  locations: readonly LocationEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "createLocation": [];
}>();

const { t } = useI18n();
const activeCardId = ref<string | null>(props.modelValue);

const locationCards = computed<LocationCardViewModel[]>(() => [
  ...props.locations.map((location) => ({
    ...location,
    coverImage: pickStableGalleryImage(location.gallery, location.id),
  })),
  {
    id: CREATE_LOCATION_CARD_ID,
    gallery: [],
    availableStartKeys: [],
    coverImage: null,
    isCreateCard: true,
  },
]);

const selectedLocationLabel = computed(() => {
  const selected = locationCards.value.find(
    (location) => location.id === activeCardId.value,
  );
  if (selected?.isCreateCard) {
    return t("anchorEvent.formMode.locationCreateLabel");
  }
  return selected?.id ?? t("anchorEvent.formMode.locationPlaceholder");
});

const asLocationCardViewModel = (value: PeekRadioCarouselItem) =>
  value as LocationCardViewModel;

const handleUpdateLocation = (value: string | number | null) => {
  if (value === CREATE_LOCATION_CARD_ID) {
    activeCardId.value = CREATE_LOCATION_CARD_ID;
    return;
  }

  const nextValue = typeof value === "string" ? value : null;
  activeCardId.value = nextValue;
  emit("update:modelValue", nextValue);
};

const handleCardClick = (card: LocationCardViewModel) => {
  if (!card.isCreateCard) {
    activeCardId.value = String(card.id);
    emit("update:modelValue", String(card.id));
    return;
  }

  if (card.isCreateCard && activeCardId.value === CREATE_LOCATION_CARD_ID) {
    emit("createLocation");
    return;
  }

  activeCardId.value = CREATE_LOCATION_CARD_ID;
};

const handleCarouselKeydown = (event: KeyboardEvent) => {
  if (
    activeCardId.value !== CREATE_LOCATION_CARD_ID ||
    (event.key !== "Enter" && event.key !== " ")
  ) {
    return;
  }

  event.preventDefault();
  emit("createLocation");
};

watch(
  () => props.modelValue,
  (value) => {
    if (value !== activeCardId.value && activeCardId.value !== CREATE_LOCATION_CARD_ID) {
      activeCardId.value = value;
    }
  },
);

watch(
  locationCards,
  (locations) => {
    const selectableLocations = locations.filter((location) => !location.isCreateCard);
    if (
      props.modelValue &&
      selectableLocations.some((location) => location.id === props.modelValue)
    ) {
      return;
    }
    const fallbackLocationId = selectableLocations[0]?.id ?? null;
    activeCardId.value = fallbackLocationId;
    emit("update:modelValue", fallbackLocationId);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-location-control {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.form-mode-location-control__header {
  display: flex;
  flex-direction: column;
}

.form-mode-location-control__title {
  margin: 0;
  @include mx.pu-font(section);
}

.location-card {
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

.location-card--selected {
  transform: translateY(-6px);
  @include mx.pu-elevation(3);
}

.location-card--create {
  background: var(--sys-color-secondary-container);
}

.location-card__image,
.location-card__fallback,
.location-card__create {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.location-card__image {
  display: block;
  object-fit: cover;
}

.location-card__fallback {
  display: flex;
  box-sizing: border-box;
  align-items: flex-end;
  justify-content: flex-start;
  padding: var(--sys-spacing-medium);
  color: var(--sys-color-on-primary-container);
  @include mx.pu-font(section);
}

.location-card__create {
  display: grid;
  place-items: center;
  color: var(--sys-color-on-secondary-container);
}

.location-card__create-icon {
  @include mx.pu-icon(large);
  transform: scale(1.35);
}

.location-caption {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.location-caption__name {
  margin: 0;
  @include mx.pu-font(body);
}

.location-label-enter-active,
.location-label-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.location-label-enter-from,
.location-label-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
