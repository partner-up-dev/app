<template>
  <div v-if="isLoading" class="loading-state">
    {{ t("common.loading") }}
  </div>

  <div v-else-if="isError" class="error-state">
    {{ t("anchorEvent.loadFailed") }}
    <router-link :to="{ name: 'event-plaza' }" class="back-link">
      {{ t("anchorEvent.backToPlaza") }}
    </router-link>
  </div>

  <div
    v-else-if="resolvedActiveDemandCard"
    class="card-mode"
    data-region="pr-list"
    data-testid="anchor-event-card-mode.surface"
    data-mode-state="active"
  >
    <div class="card-stage">
      <div class="card-stage__label-rail" aria-hidden="true">
        <span
          class="card-stage__projection-label card-stage__projection-label--left"
          :style="leftPromptStyle"
        >
          {{ t("anchorEvent.card.swipeSkipHint") }}
        </span>
        <span
          class="card-stage__projection-label card-stage__projection-label--right"
          :style="rightPromptStyle"
        >
          {{ t("anchorEvent.card.swipeDetailHint") }}
        </span>
      </div>

      <div class="card-stage__inner">
        <div
          class="card-stage__projection-layer card-stage__projection-layer--underlay"
          aria-hidden="true"
        >
          <span
            class="card-stage__projection-side card-stage__projection-side--left"
            :style="leftProjectionShellStyle"
          >
            <span
              class="card-stage__projection-light"
              :style="leftProjectionLightStyle"
            >
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
          <span
            class="card-stage__projection-side card-stage__projection-side--right"
            :style="rightProjectionShellStyle"
          >
            <span
              class="card-stage__projection-light"
              :style="rightProjectionLightStyle"
            >
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
        </div>

        <AnchorEventDemandCard
          v-for="(previewCard, previewIndex) in resolvedStackPreviewCards"
          :key="`preview-${previewCard.cardKey}`"
          class="card-stack-preview"
          :style="{
            zIndex: 2 - previewIndex,
            animationDelay: `${70 + previewIndex * 40}ms`,
          }"
          :display-location-name="previewCard.displayLocationName"
          :time-label="previewCard.timeLabel"
          :preference-tags="previewCard.preferenceTags"
          :notes="previewCard.notes"
          :cover-image="previewCard.coverImage"
          :detail-pr-id="previewCard.detailPrId"
          :action-available="
            previewCard.detailPrId !== null || previewCard.createTarget !== null
          "
          :preview="true"
          :preview-depth="previewIndex + 1"
          aria-hidden="true"
        />

        <div
          class="card-stage__front-shell"
          :key="resolvedActiveDemandCard.cardKey"
        >
          <AnchorEventDemandCard
            ref="frontDemandCardRef"
            class="card-stage__front"
            :display-location-name="resolvedActiveDemandCard.displayLocationName"
            :time-label="resolvedActiveDemandCard.timeLabel"
            :preference-tags="resolvedActiveDemandCard.preferenceTags"
            :notes="resolvedActiveDemandCard.notes"
            :cover-image="resolvedActiveDemandCard.coverImage"
            :detail-pr-id="resolvedActiveDemandCard.detailPrId"
            :action-available="activeCardActionAvailable"
            :pending="resolvedIsCardRouting"
            @swipe-preview="handleSwipePreview"
            @skip="emitSkipActiveCard"
            @view-detail="emitViewActiveCardDetail"
          />
        </div>
      </div>
    </div>

    <div class="card-mode__actions">
      <Button
        type="button"
        class="card-mode__action"
        appearance="pill"
        tone="danger"
        :disabled="resolvedIsCardRouting"
        @click="handleSkipActionClick"
      >
        {{ t("anchorEvent.card.skipButton") }}
      </Button>
      <Button
        type="button"
        class="card-mode__action"
        appearance="pill"
        :disabled="resolvedIsCardRouting || !activeCardActionAvailable"
        @click="handleViewActionClick"
      >
        {{ activeCardPrimaryActionLabel }}
      </Button>
    </div>

    <p v-if="resolvedCardActionError" class="card-mode__error">
      {{ resolvedCardActionError }}
    </p>
  </div>

  <div
    v-else
    class="card-empty-stack"
    data-testid="anchor-event-card-mode.surface"
    data-mode-state="empty"
  >
    <div class="card-empty">
      <p class="card-empty__title">
        {{ cardEmptyTitle }}
      </p>
      <p class="card-empty__subtitle">
        {{ cardEmptySubtitle }}
      </p>

      <div
        v-if="resolvedCanUserCreatePR"
        class="card-empty__create"
        data-region="create-pr"
      >
        <AnchorEventAssistedPRTimeWindowInlineEditor
          :anchor-event-id="eventIdValue"
          :model-value="resolvedCardCreateTimeWindow"
          :allow-edit-after-ready="resolvedCardCreateAllowEditAfterReady"
          @update:model-value="handleCardCreateTimeWindowChange"
          @update:allow-edit-after-ready="
            handleCardCreateAllowEditAfterReadyChange
          "
        />

        <AnchorEventInlinePlaceSelector
          v-if="resolvedCardCreatePlaceOptions.length > 0"
          :model-value="resolvedCardCreatePlaceId"
          :options="resolvedCardCreatePlaceOptions"
          :label="resolvedCardCreatePlaceLabel"
          :placeholder="resolvedCardCreatePlacePlaceholder"
          @update:model-value="handleCardCreatePlaceChange"
        />

        <p v-if="resolvedCardCreateErrorMessage" class="card-empty__error">
          {{ resolvedCardCreateErrorMessage }}
        </p>

        <Button
          type="button"
          appearance="pill"
          size="sm"
          data-testid="anchor-event-card-mode.empty-create"
          :disabled="isCardCreateDisabled"
          @click="emitCreateFromCardEmpty"
        >
          {{
            resolvedIsCreatePending
              ? t("anchorEvent.createCard.creatingAction")
              : t("anchorEvent.createCard.createAction")
          }}
        </Button>
      </div>

      <OtherAnchorEventsSection
        :current-event-id="eventIdValue"
        variant="embedded"
        data-region="discover-other-events"
      />
    </div>

    <AnchorEventBetaGroupCard
      v-if="resolvedEventBetaGroupQrCode !== null"
      :event-id="eventIdValue"
      :event-title="resolvedEventTitle"
      :qr-code-url="resolvedEventBetaGroupQrCode"
      :default-expanded="true"
      variant="card"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onActivated,
  onDeactivated,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import AnchorEventDemandCard from "@/domains/event/ui/primitives/AnchorEventDemandCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import AnchorEventInlinePlaceSelector from "@/domains/event/ui/controls/AnchorEventInlinePlaceSelector.vue";
import AnchorEventAssistedPRTimeWindowInlineEditor from "@/domains/event/ui/controls/AnchorEventAssistedPRTimeWindowInlineEditor.vue";
import Button from "@/shared/ui/actions/Button.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import { useAnchorEventDemandCards } from "@/domains/event/queries/useAnchorEventDemandCards";
import {
  sortDemandCardViewModels,
  toDemandCardViewModels,
  toDummyDemandCardViewModels,
} from "@/domains/event/model/demand-cards";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/event/model/poi-gallery";
import {
  buildCreateTimeWindowPlaceOptions,
  findAnchorEventPlaceOption,
  getExclusiveCreateTimeWindowLocationOptions,
  getFirstEnabledPlaceOption,
  hasEnabledCreateTimeWindowPlaceOption,
  toAnchorEventSelectedPlace,
  type AnchorEventPlaceOption,
} from "@/domains/event/model/place-options";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import {
  hasTimeWindowStarted,
  resolveTimeWindowStartTimestamp,
  type TimeWindow,
} from "@/domains/event/model/time-window-view";
import { buildAnchorEventDummyPRs } from "@/domains/event/model/dummy-prs";
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import { useEventAssistedPRCreateFlow } from "@/domains/event/use-cases/useEventAssistedPRCreateFlow";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import {
  DEMAND_CARD_EXIT_TIMING,
  DEMAND_CARD_REBOUND_TIMING,
  clampDemandCardSwipePreviewIntensity,
  createIdleDemandCardSwipePreviewState,
  type DemandCardSwipePreviewState,
} from "@/domains/event/ui/demand-card-swipe-feedback";
import { prDetailPath } from "@/domains/pr/routing/routes";
import {
  CARD_MODE_DRAG_HINT_DELAY_MS,
  CARD_OVERFLOW_GUARD_CLASS,
  anchorEventCardModeSurfaceDefaults,
  type AnchorEventCardModeSurfaceEmits,
  type AnchorEventCardModeSurfaceProps,
  type FrontDemandCardHandle,
} from "./AnchorEventCardModeSurface";

const props = withDefaults(
  defineProps<AnchorEventCardModeSurfaceProps>(),
  anchorEventCardModeSurfaceDefaults,
);

const emit = defineEmits<AnchorEventCardModeSurfaceEmits>();

const { t } = useI18n();
const router = useRouter();
const { prefersReducedMotion } = useReducedMotion();
const frontDemandCardRef = ref<FrontDemandCardHandle | null>(null);
const swipePreviewState = ref<DemandCardSwipePreviewState>(
  createIdleDemandCardSwipePreviewState(),
);
const hasConsumedDragHintWindow = ref(false);
const processedCardKeys = ref<string[]>([]);
const internalCardActionError = ref<string | null>(null);
const internalIsCardRouting = ref(false);
const internalCardCreateTimeWindow = ref<TimeWindow | null>(null);
const internalCardCreateAllowEditAfterReady =
  ref<PRAllowEditAfterReady | null>(null);
const internalCardCreatePlaceId = ref<string | null>(null);
const internalDragHintToken = ref(0);
let internalCardDragHintTimerId: number | null = null;

const isControlled = computed(() => props.activeDemandCard !== undefined);
const internalQueriesEnabled = computed(() => !isControlled.value);
const eventId = computed<number | null>(() => props.eventId);
const eventIdValue = computed(() => props.eventId);

const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
} = useAnchorEventDetail(eventId, internalQueriesEnabled);
const {
  data: demandCards,
  isLoading: isDemandCardsLoading,
  isError: isDemandCardsError,
} = useAnchorEventDemandCards(eventId, internalQueriesEnabled);
const eventDetail = computed(() => detail.value ?? null);
const {
  createEventAssistedPR,
  materializeDummyPR,
  createActionErrorMessage: internalCreateActionErrorMessage,
  isCreatePending: internalIsCreatePending,
  replayErrorMessage,
} = useEventAssistedPRCreateFlow(eventDetail);

const isLoading = computed(
  () =>
    !isControlled.value &&
    (isDetailLoading.value || isDemandCardsLoading.value),
);
const isError = computed(
  () =>
    !isControlled.value &&
    (isDetailError.value || isDemandCardsError.value),
);

const sortedCreateTimeWindows = computed(() => {
  const timeWindows = detail.value?.createTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const upcomingSortedCreateTimeWindows = computed(() =>
  sortedCreateTimeWindows.value.filter(
    (entry) => !hasTimeWindowStarted(entry.timeWindow),
  ),
);

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const card of demandCards.value ?? []) {
    const location = card.displayLocationName.trim();
    if (location.length > 0) {
      uniqueLocationIds.add(location);
    }
  }
  for (const entry of sortedCreateTimeWindows.value) {
    for (const option of getExclusiveCreateTimeWindowLocationOptions(entry)) {
      const locationId = option.locationId.trim();
      if (locationId.length > 0) {
        uniqueLocationIds.add(locationId);
      }
    }
  }
  for (const option of detail.value?.placeSelector.options ?? []) {
    if (option.kind !== "location") {
      continue;
    }

    const locationId = option.locationId.trim();
    if (locationId.length > 0) {
      uniqueLocationIds.add(locationId);
    }
  }

  if (uniqueLocationIds.size === 0) {
    return null;
  }

  return Array.from(uniqueLocationIds).join(",");
});

const { data: eventPois } = usePoisByIds(allPoiIdsCsv);
const poiGalleryById = computed(() => toPoiGalleryMap(eventPois.value ?? []));
const poiByName = computed(
  () => new Map((eventPois.value ?? []).map((poi) => [poi.name, poi])),
);

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) {
    return null;
  }

  const normalized = location.trim();
  if (!normalized) {
    return null;
  }

  return pickRandomPoiGalleryImage(poiGalleryById.value.get(normalized) ?? []);
};

const internalDummyPRs = computed(() =>
  detail.value
    ? buildAnchorEventDummyPRs({
        browseTimeWindows: detail.value.browseTimeWindows,
        createTimeWindows: detail.value.createTimeWindows,
        presetTags: detail.value.presetTags,
        poiByName: poiByName.value,
      })
    : [],
);

const internalDemandCards = computed(() => {
  const realCards = toDemandCardViewModels({
    cards: demandCards.value ?? [],
    eventCoverImage: detail.value?.coverImage ?? null,
    resolveCoverImage,
  });
  const dummyCards = toDummyDemandCardViewModels({
    dummies: internalDummyPRs.value,
    eventCoverImage: detail.value?.coverImage ?? null,
    resolveCoverImage,
  });

  return sortDemandCardViewModels([...realCards, ...dummyCards]);
});

const processedCardKeySet = computed(() => new Set(processedCardKeys.value));
const remainingDemandCards = computed(() =>
  internalDemandCards.value.filter(
    (card) => !processedCardKeySet.value.has(card.cardKey),
  ),
);
const internalActiveDemandCard = computed(
  () => remainingDemandCards.value[0] ?? null,
);
const internalStackPreviewCards = computed(() =>
  remainingDemandCards.value.slice(1, 3),
);
const resolvedActiveDemandCard = computed(() =>
  isControlled.value ? (props.activeDemandCard ?? null) : internalActiveDemandCard.value,
);
const resolvedStackPreviewCards = computed(() =>
  isControlled.value ? props.stackPreviewCards : internalStackPreviewCards.value,
);
const isCardStageActive = computed(() => resolvedActiveDemandCard.value !== null);
const activeCardActionAvailable = computed(() => {
  const card = resolvedActiveDemandCard.value;
  return card !== null && (card.detailPrId !== null || card.createTarget !== null);
});
const activeCardPrimaryActionLabel = computed(() =>
  t("anchorEvent.card.detailButton"),
);
const resolvedIsCardRouting = computed(() =>
  isControlled.value ? props.isCardRouting : internalIsCardRouting.value,
);
const resolvedCardActionError = computed(() => {
  if (isControlled.value) {
    return props.cardActionError;
  }

  return internalCardActionError.value ?? replayErrorMessage.value;
});
const resolvedDragHintToken = computed(() =>
  isControlled.value ? props.dragHintToken : internalDragHintToken.value,
);
const resolvedEventTitle = computed(() =>
  isControlled.value ? props.eventTitle : (detail.value?.title ?? ""),
);
const resolvedEventBetaGroupQrCode = computed(() =>
  isControlled.value
    ? props.eventBetaGroupQrCode
    : (detail.value?.betaGroupQrCode ?? null),
);
const resolvedCreateActionErrorMessage = computed(() =>
  isControlled.value
    ? props.createActionErrorMessage
    : internalCreateActionErrorMessage.value,
);
const resolvedIsCreatePending = computed(() =>
  isControlled.value ? props.isCreatePending : internalIsCreatePending.value,
);
const resolvedCanUserCreatePR = computed(() =>
  isControlled.value ? props.canUserCreatePR : detail.value?.canUserCreatePR === true,
);
const isCardExhausted = computed(
  () => !isControlled.value && detail.value?.exhausted === true,
);
const cardEmptyTitle = computed(() =>
  isCardExhausted.value
    ? t("anchorEvent.exhausted")
    : t("anchorEvent.card.emptyTitle"),
);
const cardEmptySubtitle = computed(() =>
  isCardExhausted.value
    ? t("anchorEvent.subscribeHint")
    : t("anchorEvent.card.emptySubtitle"),
);

const timeWindowsEqual = (
  left: TimeWindow | null | undefined,
  right: TimeWindow | null | undefined,
): boolean =>
  (left?.[0] ?? null) === (right?.[0] ?? null) &&
  (left?.[1] ?? null) === (right?.[1] ?? null);

const resolveFirstCreatableTimeWindow = (): TimeWindow | null => {
  for (const entry of upcomingSortedCreateTimeWindows.value) {
    if (hasEnabledCreateTimeWindowPlaceOption(entry)) {
      return entry.timeWindow;
    }
  }

  return upcomingSortedCreateTimeWindows.value[0]?.timeWindow ?? null;
};

watch(
  upcomingSortedCreateTimeWindows,
  (timeWindows) => {
    if (isControlled.value) {
      return;
    }

    if (timeWindows.length === 0) {
      internalCardCreateTimeWindow.value = null;
      return;
    }

    const current = timeWindows.find(
      (entry) => timeWindowsEqual(entry.timeWindow, internalCardCreateTimeWindow.value),
    );
    if (current) {
      return;
    }

    internalCardCreateTimeWindow.value = resolveFirstCreatableTimeWindow();
  },
  { immediate: true },
);

const selectedInternalCardCreateTimeWindow = computed(() => {
  const timeWindow = internalCardCreateTimeWindow.value;
  if (timeWindow === null) {
    return null;
  }

  return (
    upcomingSortedCreateTimeWindows.value.find((entry) =>
      timeWindowsEqual(entry.timeWindow, timeWindow),
    ) ??
    null
  );
});

const internalCardCreatePlaceSelector = computed(
  () =>
    selectedInternalCardCreateTimeWindow.value?.placeSelector ??
    detail.value?.placeSelector ??
    null,
);

const internalCardCreatePlaceOptions = computed<AnchorEventPlaceOption[]>(() =>
  buildCreateTimeWindowPlaceOptions({
    placeSelector: internalCardCreatePlaceSelector.value,
    locationOptions:
      selectedInternalCardCreateTimeWindow.value?.locationOptions ?? [],
    routeOptions: selectedInternalCardCreateTimeWindow.value?.routeOptions ?? [],
    poiByName: poiByName.value,
  }),
);

watch(
  internalCardCreatePlaceOptions,
  (options) => {
    if (isControlled.value) {
      return;
    }

    if (
      internalCardCreatePlaceId.value !== null &&
      options.some(
        (option) =>
          option.id === internalCardCreatePlaceId.value && !option.disabled,
      )
    ) {
      return;
    }

    internalCardCreatePlaceId.value = getFirstEnabledPlaceOption(options)?.id ?? null;
  },
  { immediate: true, deep: true },
);

const resolvedCardCreateTimeWindow = computed(() =>
  isControlled.value
    ? props.cardCreateTimeWindow
    : internalCardCreateTimeWindow.value,
);
const resolvedCardCreateAllowEditAfterReady = computed(() =>
  isControlled.value
    ? props.cardCreateAllowEditAfterReady
    : internalCardCreateAllowEditAfterReady.value,
);
const resolvedCardCreatePlaceId = computed(() =>
  isControlled.value ? props.cardCreatePlaceId : internalCardCreatePlaceId.value,
);
const resolvedCardCreatePlaceOptions = computed(() =>
  isControlled.value
    ? props.cardCreatePlaceOptions
    : internalCardCreatePlaceOptions.value,
);
const internalCardCreatePlaceLabel = computed(() =>
  t(
    internalCardCreatePlaceSelector.value?.labelKey ??
      "anchorEvent.placeSelector.locationLabel",
  ),
);
const internalCardCreatePlacePlaceholder = computed(() =>
  t(
    internalCardCreatePlaceSelector.value?.placeholderKey ??
      "anchorEvent.placeSelector.locationPlaceholder",
  ),
);
const resolvedCardCreatePlaceLabel = computed(() =>
  isControlled.value
    ? (props.cardCreatePlaceLabel ?? t("anchorEvent.placeSelector.locationLabel"))
    : internalCardCreatePlaceLabel.value,
);
const resolvedCardCreatePlacePlaceholder = computed(() =>
  isControlled.value
    ? (props.cardCreatePlacePlaceholder ??
      t("anchorEvent.placeSelector.locationPlaceholder"))
    : internalCardCreatePlacePlaceholder.value,
);
const resolvedCardCreateSelectedPlace = computed(() =>
  toAnchorEventSelectedPlace(
    findAnchorEventPlaceOption(
      resolvedCardCreatePlaceOptions.value,
      resolvedCardCreatePlaceId.value,
    ),
  ),
);
const cardCreateValidationMessage = computed(() => {
  const timeWindow = resolvedCardCreateTimeWindow.value;
  if (
    (timeWindow?.[0] ?? null) === null ||
    (timeWindow?.[1] ?? null) === null
  ) {
    return t("anchorEvent.createCard.errors.missingTimeWindow");
  }

  if (resolvedCardCreateSelectedPlace.value === null) {
    return t("anchorEvent.createCard.errors.missingPlace");
  }

  return null;
});
const resolvedCardCreateErrorMessage = computed(
  () => resolvedCreateActionErrorMessage.value ?? cardCreateValidationMessage.value,
);
const isCardCreateDisabled = computed(
  () => resolvedIsCreatePending.value || cardCreateValidationMessage.value !== null,
);

const syncCardOverflowGuard = (enabled: boolean) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle(CARD_OVERFLOW_GUARD_CLASS, enabled);
  document.body.classList.toggle(CARD_OVERFLOW_GUARD_CLASS, enabled);
};

const clearInternalCardDragHintTimer = () => {
  if (
    typeof window === "undefined" ||
    internalCardDragHintTimerId === null
  ) {
    return;
  }

  window.clearTimeout(internalCardDragHintTimerId);
  internalCardDragHintTimerId = null;
};

const scheduleInternalCardDragHint = () => {
  clearInternalCardDragHintTimer();

  if (
    isControlled.value ||
    typeof window === "undefined" ||
    prefersReducedMotion.value ||
    !isCardStageActive.value
  ) {
    return;
  }

  internalCardDragHintTimerId = window.setTimeout(() => {
    internalCardDragHintTimerId = null;

    if (!isCardStageActive.value || prefersReducedMotion.value) {
      return;
    }

    internalDragHintToken.value += 1;
  }, CARD_MODE_DRAG_HINT_DELAY_MS);
};

const consumeCardDragHintWindow = () => {
  if (isControlled.value) {
    emit("consume-drag-hint-window");
    return;
  }

  clearInternalCardDragHintTimer();
};

const swipePreviewIntensity = computed(() =>
  clampDemandCardSwipePreviewIntensity(swipePreviewState.value.intensity),
);
const swipePreviewPhase = computed(() => swipePreviewState.value.phase);
const swipePreviewAnchorCorner = computed(
  () => swipePreviewState.value.anchorCorner,
);
const swipePreviewMagnitude = computed(() =>
  Math.min(Math.abs(swipePreviewIntensity.value), 1),
);
const easeOutCurve = (value: number, power: number) => {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - Math.pow(1 - clamped, power);
};
const promptStrength = computed(() =>
  easeOutCurve(swipePreviewMagnitude.value, 2.18),
);
const projectionActivation = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.02) {
    return 0;
  }

  return easeOutCurve((magnitude - 0.02) / 0.98, 2.26);
});
const projectionSpread = computed(() =>
  easeOutCurve(swipePreviewMagnitude.value, 1.72),
);
const projectionThresholdTension = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.72) {
    return 0;
  }

  return Math.pow((magnitude - 0.72) / 0.28, 1.55);
});
const projectionCornerSlot = computed<"top" | "bottom">(() => {
  return swipePreviewAnchorCorner.value ?? "top";
});

const feedbackTransition = computed(() => {
  switch (swipePreviewPhase.value) {
    case "dragging":
      return "none";
    case "exiting":
      return `opacity ${DEMAND_CARD_EXIT_TIMING}, transform ${DEMAND_CARD_EXIT_TIMING}`;
    case "rebounding":
      return `opacity ${DEMAND_CARD_REBOUND_TIMING}, transform ${DEMAND_CARD_REBOUND_TIMING}`;
    default:
      return "opacity 180ms ease-out, transform 180ms ease-out";
  }
});

const buildPromptStyle = (direction: "left" | "right") => {
  if (swipePreviewPhase.value === "hinting") {
    return {
      opacity: 0,
      transform: "translate3d(0, 16px, 0) scale(0.96)",
      transition: feedbackTransition.value,
    };
  }

  const active =
    direction === "left"
      ? swipePreviewIntensity.value < 0
      : swipePreviewIntensity.value > 0;
  const strength = active ? promptStrength.value : 0;

  return {
    opacity: strength * 0.96,
    transform: `translate3d(0, ${16 - strength * 16}px, 0) scale(${0.96 + strength * 0.08})`,
    transition: feedbackTransition.value,
  };
};

const buildProjectionShellStyle = (direction: "left" | "right") => {
  const slotY = projectionCornerSlot.value === "top" ? "23%" : "71%";
  const horizontalOffset = direction === "left" ? "-74%" : "74%";

  return {
    top: slotY,
    transform: `translate3d(${horizontalOffset}, -50%, 0)`,
    transition: feedbackTransition.value,
  };
};

const buildProjectionLightStyle = (direction: "left" | "right") => {
  const active =
    direction === "left"
      ? swipePreviewIntensity.value < 0
      : swipePreviewIntensity.value > 0;
  const activation = active ? projectionActivation.value : 0;
  const spread = active ? projectionSpread.value : 0;
  const thresholdTension = active ? projectionThresholdTension.value : 0;
  const scaleX = 1.2 + spread * 1.28 + thresholdTension * 0.62;
  const scaleY = 0.98 + spread * 0.88 + thresholdTension * 0.36;
  const opacity = activation * 0.84 + thresholdTension * 0.12;
  const sourceOpacity = 0.18 + activation * 0.42 + thresholdTension * 0.18;
  const bloomOpacity = 0.14 + activation * 0.58 + thresholdTension * 0.22;
  const rimOpacity = activation * 0.16 + thresholdTension * 0.44;
  const spillOpacity = activation * 0.24 + thresholdTension * 0.46;
  const tilt = direction === "left" ? "-6deg" : "6deg";

  return {
    opacity,
    transform: `scale(${scaleX}, ${scaleY}) rotate(${tilt})`,
    transition: feedbackTransition.value,
    "--card-stage-projection-source-opacity": sourceOpacity.toString(),
    "--card-stage-projection-bloom-opacity": bloomOpacity.toString(),
    "--card-stage-projection-rim-opacity": rimOpacity.toString(),
    "--card-stage-projection-spill-opacity": spillOpacity.toString(),
  };
};

const leftPromptStyle = computed(() => buildPromptStyle("left"));
const rightPromptStyle = computed(() => buildPromptStyle("right"));
const leftProjectionShellStyle = computed(() =>
  buildProjectionShellStyle("left"),
);
const rightProjectionShellStyle = computed(() =>
  buildProjectionShellStyle("right"),
);
const leftProjectionLightStyle = computed(() =>
  buildProjectionLightStyle("left"),
);
const rightProjectionLightStyle = computed(() =>
  buildProjectionLightStyle("right"),
);

const handleSwipePreview = (previewState: DemandCardSwipePreviewState) => {
  if (
    !hasConsumedDragHintWindow.value &&
    previewState.phase !== "idle" &&
    previewState.phase !== "hinting"
  ) {
    hasConsumedDragHintWindow.value = true;
    consumeCardDragHintWindow();
  }

  swipePreviewState.value = {
    intensity: clampDemandCardSwipePreviewIntensity(previewState.intensity),
    phase: previewState.phase,
    anchorViewportY: previewState.anchorViewportY,
    anchorCorner: previewState.anchorCorner,
  };
};

const emitSkipActiveCard = () => {
  if (isControlled.value) {
    emit("skip-active-card");
    return;
  }

  const card = resolvedActiveDemandCard.value;
  if (!card) {
    return;
  }

  consumeCardDragHintWindow();
  if (!processedCardKeySet.value.has(card.cardKey)) {
    processedCardKeys.value = [...processedCardKeys.value, card.cardKey];
  }
  internalCardActionError.value = null;
};

const emitViewActiveCardDetail = async () => {
  if (isControlled.value) {
    emit("view-active-card-detail");
    return;
  }

  const card = resolvedActiveDemandCard.value;
  if (!card || !activeCardActionAvailable.value) {
    return;
  }

  consumeCardDragHintWindow();
  internalCardActionError.value = null;
  internalIsCardRouting.value = true;
  try {
    if (card.createTarget) {
      await materializeDummyPR({
        targetTimeWindow: card.createTarget.timeWindow,
        place: card.createTarget.place,
        preferences: card.createTarget.preferences,
        entrySurface: "card_rich",
      });
      return;
    }

    if (card.detailPrId !== null) {
      await router.push(prDetailPath(card.detailPrId));
    }
  } catch (error) {
    internalCardActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    internalIsCardRouting.value = false;
  }
};

const handleSkipActionClick = () => {
  if (frontDemandCardRef.value) {
    frontDemandCardRef.value.triggerAction("skip");
    return;
  }

  emitSkipActiveCard();
};

const handleViewActionClick = () => {
  if (frontDemandCardRef.value) {
    frontDemandCardRef.value.triggerAction("view-detail");
    return;
  }

  void emitViewActiveCardDetail();
};

const emitCreateFromCardEmpty = () => {
  if (!resolvedCanUserCreatePR.value) {
    return;
  }
  if (cardCreateValidationMessage.value !== null) {
    return;
  }

  if (isControlled.value) {
    emit("create-from-card-empty");
    return;
  }

  void createEventAssistedPR({
    targetTimeWindow: resolvedCardCreateTimeWindow.value,
    allowEditAfterReady: resolvedCardCreateAllowEditAfterReady.value,
    place: resolvedCardCreateSelectedPlace.value,
    entrySurface: "card_rich",
  });
};

const handleCardCreateTimeWindowChange = (nextValue: TimeWindow | null) => {
  if (isControlled.value) {
    emit("update:cardCreateTimeWindow", nextValue);
    return;
  }
  internalCardCreateTimeWindow.value = nextValue;
};

const handleCardCreateAllowEditAfterReadyChange = (
  nextValue: PRAllowEditAfterReady | null,
) => {
  if (isControlled.value) {
    emit("update:cardCreateAllowEditAfterReady", nextValue);
    return;
  }
  internalCardCreateAllowEditAfterReady.value = nextValue;
};

const handleCardCreatePlaceChange = (value: string | null) => {
  if (isControlled.value) {
    emit("update:cardCreatePlaceId", value);
    return;
  }
  internalCardCreatePlaceId.value = value;
};

watch(
  () => resolvedActiveDemandCard.value?.cardKey ?? null,
  () => {
    swipePreviewState.value = createIdleDemandCardSwipePreviewState();
    internalCardActionError.value = null;
  },
);

watch(
  resolvedDragHintToken,
  (token, previousToken) => {
    if (token === previousToken || token <= 0) {
      return;
    }

    frontDemandCardRef.value?.playHintWobble();
  },
);

watch(
  isCardStageActive,
  (isActive, wasActive) => {
    emit("card-stage-active-change", isActive);

    if (isControlled.value) {
      return;
    }

    syncCardOverflowGuard(isActive);

    if (!isActive) {
      consumeCardDragHintWindow();
      return;
    }

    if (!wasActive) {
      scheduleInternalCardDragHint();
    }
  },
  { immediate: true },
);

watch(
  prefersReducedMotion,
  (reduced) => {
    if (isControlled.value) {
      return;
    }

    if (reduced) {
      consumeCardDragHintWindow();
      return;
    }

    if (isCardStageActive.value) {
      scheduleInternalCardDragHint();
    }
  },
  { immediate: false },
);

onActivated(() => {
  if (!isControlled.value && isCardStageActive.value) {
    syncCardOverflowGuard(true);
    scheduleInternalCardDragHint();
  }
  emit("card-stage-active-change", isCardStageActive.value);
});

onDeactivated(() => {
  consumeCardDragHintWindow();
  syncCardOverflowGuard(false);
  emit("card-stage-active-change", false);
});

onUnmounted(() => {
  consumeCardDragHintWindow();
  syncCardOverflowGuard(false);
  emit("card-stage-active-change", false);
});
</script>

<style lang="scss" scoped src="./AnchorEventCardModeSurface.scss"></style>
