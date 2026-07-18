<template>
  <div
    v-if="resolvedActivePRDiscoveryCard"
    class="card-mode"
    data-region="pr-list"
    data-testid="prd.card.surface"
    data-mode-state="active"
  >
    <div class="card-stage">
      <div class="card-stage__label-rail" aria-hidden="true">
        <span
          class="card-stage__projection-label card-stage__projection-label--skip"
          :style="leftPromptStyle"
        >
          {{ t("prDiscovery.card.swipeSkipHint") }}
        </span>
        <span
          class="card-stage__projection-label card-stage__projection-label--detail"
          :style="rightPromptStyle"
        >
          {{ t("prDiscovery.card.swipeDetailHint") }}
        </span>
      </div>

      <div class="card-stage__deck">
        <div
          class="card-stage__projection-layer card-stage__projection-layer--underlay"
          aria-hidden="true"
        >
          <span
            class="card-stage__projection-side card-stage__projection-side--skip"
            :style="leftProjectionShellStyle"
          >
            <span class="card-stage__projection-light" :style="leftProjectionLightStyle">
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
          <span
            class="card-stage__projection-side card-stage__projection-side--detail"
            :style="rightProjectionShellStyle"
          >
            <span class="card-stage__projection-light" :style="rightProjectionLightStyle">
              <span class="card-stage__projection-source" />
              <span class="card-stage__projection-bloom" />
              <span class="card-stage__projection-rim" />
              <span class="card-stage__projection-spill" />
            </span>
          </span>
        </div>

        <PRDiscoveryDemandCard
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
          :action-available="previewCard.detailPrId !== null || previewCard.createTarget !== null"
          :preview="true"
          :preview-depth="previewIndex + 1"
          aria-hidden="true"
        />

        <div class="card-stage__front-shell" :key="resolvedActivePRDiscoveryCard.cardKey">
          <PRDiscoveryDemandCard
            ref="frontPRDiscoveryCardRef"
            class="card-stage__front"
            :display-location-name="resolvedActivePRDiscoveryCard.displayLocationName"
            :time-label="resolvedActivePRDiscoveryCard.timeLabel"
            :preference-tags="resolvedActivePRDiscoveryCard.preferenceTags"
            :notes="resolvedActivePRDiscoveryCard.notes"
            :cover-image="resolvedActivePRDiscoveryCard.coverImage"
            :detail-pr-id="resolvedActivePRDiscoveryCard.detailPrId"
            :action-available="activeCardActionAvailable"
            :pending="pending"
            @swipe-preview="handleSwipePreview"
            @skip="emitSkipActiveCard"
            @view-detail="emitViewActiveCardDetail"
          />
        </div>
      </div>
    </div>

    <div class="card-mode__actions">
      <PuButton
        class="card-mode__action"
        shape="pill"
        tone="danger"
        variant="outline"
        data-testid="prd.card.skip"
        :disabled="pending"
        @click="handleSkipActionClick"
      >
        {{ t("prDiscovery.card.skipButton") }}
      </PuButton>
      <PuButton
        class="card-mode__action"
        shape="pill"
        data-testid="prd.card.detail"
        :disabled="pending || !activeCardActionAvailable"
        @click="handleViewActionClick"
      >
        {{ activeCardPrimaryActionLabel }}
      </PuButton>
    </div>

    <p v-if="errorMessage" class="card-mode__error">
      {{ errorMessage }}
    </p>
  </div>

  <div v-else class="card-empty-stack" data-testid="prd.card.surface" data-mode-state="empty">
    <div class="card-empty">
      <p class="card-empty__title">
        {{ cardEmptyTitle }}
      </p>
      <p class="card-empty__subtitle">
        {{ cardEmptySubtitle }}
      </p>

      <div v-if="showCreate" class="card-empty__create" data-region="create-pr">
        <PRDiscoveryTimeWindowInlineEditor
          :type="type"
          :model-value="cardCreateTimeWindow"
          :allow-edit-after-ready="cardCreateAllowEditAfterReady"
          @update:model-value="handleCardCreateTimeWindowChange"
          @update:allow-edit-after-ready="handleCardCreateAllowEditAfterReadyChange"
        />

        <PRDiscoveryInlinePlaceSelector
          v-if="cardCreatePlaceOptions.length > 0"
          :model-value="cardCreatePlaceId"
          :options="cardCreatePlaceOptions"
          :label="cardCreatePlaceLabel"
          :placeholder="cardCreatePlacePlaceholder"
          @update:model-value="handleCardCreatePlaceChange"
        />

        <p v-if="cardCreateErrorMessage" class="card-empty__error">
          {{ cardCreateErrorMessage }}
        </p>

        <PuButton
          shape="pill"
          size="sm"
          data-testid="prd.card.empty-create"
          :disabled="isCardCreateDisabled"
          @click="emitCreateFromCardEmpty"
        >
          {{
            pending
              ? t("prDiscovery.createCard.creatingAction")
              : t("prDiscovery.createCard.createAction")
          }}
        </PuButton>
      </div>

      <OtherPRTypesSection
        :current-type="type"
        variant="embedded"
        data-region="discover-other-types"
      />
    </div>

    <PRDiscoveryCommunityCard
      v-if="resolvedCommunityQrCode !== null"
      :type="type"
      :type-title="resolvedTypeTitle"
      :qr-code-url="resolvedCommunityQrCode"
      :default-expanded="true"
      variant="card"
    />
  </div>
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend/contracts";
import { PuButton } from "@partner-up-dev/design-web";
import { computed, onActivated, onDeactivated, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  sortPRDiscoveryCardViewModels,
  toPRDiscoveryCardItems,
} from "@/domains/pr/model/pr-discovery-card";
import {
  clampPRDiscoveryCardSwipePreviewIntensity,
  createIdlePRDiscoveryCardSwipePreviewState,
  PR_DISCOVERY_CARD_EXIT_TIMING,
  PR_DISCOVERY_CARD_REBOUND_TIMING,
  type PRDiscoveryCardSwipePreviewState,
} from "@/domains/pr/model/pr-discovery-card-swipe-feedback";
import {
  buildPRDiscoveryCreationSuggestions,
  type PRDiscoveryBrowseTimeWindow,
  type PRDiscoveryCreateTimeWindow,
} from "@/domains/pr/model/pr-discovery-creation-suggestion";
import {
  clonePRDiscoveryRoute,
  findPRDiscoveryPlaceOptionById,
  getFirstEnabledPRDiscoveryPlaceOption,
  type PRDiscoveryPlaceOption,
  toPRDiscoverySelectedPlace,
} from "@/domains/pr/model/pr-discovery-place-options";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/pr/model/pr-discovery-poi-gallery";
import {
  hasPRDiscoveryTimeWindowStarted,
  resolvePRDiscoveryTimeWindowStartTimestamp,
  type TimeWindow,
  timeWindowsEqual,
} from "@/domains/pr/model/pr-discovery-time-window";
import PRDiscoveryDemandCard from "@/domains/pr/ui/discovery/card/PRDiscoveryDemandCard.vue";
import PRDiscoveryInlinePlaceSelector from "@/domains/pr/ui/discovery/card/PRDiscoveryInlinePlaceSelector.vue";
import PRDiscoveryTimeWindowInlineEditor from "@/domains/pr/ui/discovery/card/PRDiscoveryTimeWindowInlineEditor.vue";
import OtherPRTypesSection from "@/domains/pr/ui/discovery/list/OtherPRTypesSection.vue";
import PRDiscoveryCommunityCard from "@/domains/pr/ui/discovery/list/PRDiscoveryCommunityCard.vue";
import {
  buildPRDiscoveryDirectCreateCommand,
  buildPRDiscoverySuggestionCreateCommand,
} from "@/domains/pr/use-cases/usePRDiscoveryCreation";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import {
  type FrontPRDiscoveryCardHandle,
  PR_DISCOVERY_CARD_DRAG_HINT_DELAY_MS,
  PR_DISCOVERY_CARD_OVERFLOW_GUARD_CLASS,
  type PRDiscoveryCardStackEmits,
  type PRDiscoveryCardStackProps,
  prDiscoveryCardStackDefaults,
} from "./PRDiscoveryCardStack";

const props = withDefaults(defineProps<PRDiscoveryCardStackProps>(), prDiscoveryCardStackDefaults);
const emit = defineEmits<PRDiscoveryCardStackEmits>();
const { t } = useI18n();
const { prefersReducedMotion } = useReducedMotion();
const frontPRDiscoveryCardRef = ref<FrontPRDiscoveryCardHandle | null>(null);
const swipePreviewState = ref<PRDiscoveryCardSwipePreviewState>(
  createIdlePRDiscoveryCardSwipePreviewState(),
);
const hasConsumedDragHintWindow = ref(false);
const processedCardKeys = ref<string[]>([]);
const cardCreateTimeWindow = ref<TimeWindow | null>(null);
const cardCreateAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);
const cardCreatePlaceId = ref<string | null>(null);
const internalDragHintToken = ref(0);
const resolvedDragHintToken = computed(() => internalDragHintToken.value);
let internalCardDragHintTimerId: number | null = null;

const type = computed(() => props.type);
const resolvedTypeTitle = computed(() => props.typeDetail?.title?.trim() || "");
const resolvedCommunityQrCode = computed(() => props.typeDetail?.communityQrCode ?? null);
const showCreate = computed(() => props.showCreate);
const pending = computed(() => props.pending);
const errorMessage = computed(() => props.errorMessage);

const allPlaceOptions = computed<PRDiscoveryPlaceOption[]>(() => {
  const options = props.authoringOptions;
  if (!options) return [];
  return [
    ...options.locationOptions.map((option) => ({
      ...option,
      gallery: [...option.gallery],
      availableStartKeys: [...option.availableStartKeys],
    })),
    ...options.routeOptions.map((option) => ({
      ...option,
      route: clonePRDiscoveryRoute(option.route),
      availableStartKeys: [...option.availableStartKeys],
    })),
  ];
});
const browseTimeWindows = computed<PRDiscoveryBrowseTimeWindow[]>(() => {
  const groups = new Map<string, PRDiscoveryBrowseTimeWindow>();
  for (const candidate of props.items) {
    const key = [candidate.time[0] ?? "_", candidate.time[1] ?? "_"].join("::");
    const current = groups.get(key);
    if (current) current.candidates = [...current.candidates, candidate];
    else groups.set(key, { key, timeWindow: candidate.time, candidates: [candidate] });
  }
  return [...groups.values()];
});
const createTimeWindows = computed<PRDiscoveryCreateTimeWindow[]>(() =>
  (props.authoringOptions?.startOptions ?? [])
    .map((entry) => ({
      key: entry.key,
      timeWindow: [entry.startAt, entry.endAt] satisfies TimeWindow,
      placeOptions: [
        ...entry.locationOptions.map((option) => ({
          ...option,
          gallery: [...option.gallery],
          availableStartKeys: [...option.availableStartKeys],
        })),
        ...entry.routeOptions.map((option) => ({
          ...option,
          route: clonePRDiscoveryRoute(option.route),
          availableStartKeys: [...option.availableStartKeys],
        })),
      ],
    }))
    .filter((entry) => !hasPRDiscoveryTimeWindowStarted(entry.timeWindow))
    .sort(
      (left, right) =>
        resolvePRDiscoveryTimeWindowStartTimestamp(left.timeWindow) -
        resolvePRDiscoveryTimeWindowStartTimestamp(right.timeWindow),
    ),
);
const generatedSuggestions = computed(() =>
  buildPRDiscoveryCreationSuggestions({
    browseTimeWindows: browseTimeWindows.value,
    createTimeWindows: createTimeWindows.value,
    presetTags: props.authoringOptions?.preferenceTags ?? [],
  }),
);
const suggestions = computed(() =>
  props.suggestions.length > 0 ? props.suggestions : generatedSuggestions.value,
);
const poiGalleryById = computed(() =>
  toPoiGalleryMap(
    (props.authoringOptions?.locationOptions ?? []).map((option) => ({
      name: option.locationId,
      gallery: option.gallery,
    })),
  ),
);
const resolveCoverImage = (location: string | null): string | null => {
  const normalized = location?.trim();
  if (!normalized) return null;
  return pickRandomPoiGalleryImage(poiGalleryById.value.get(normalized) ?? []);
};
const internalCards = computed(() =>
  sortPRDiscoveryCardViewModels(
    toPRDiscoveryCardItems({
      candidates: props.items,
      cardGroups: props.cardGroups,
      suggestions: suggestions.value,
      typeCoverImage: props.typeDetail?.coverImage ?? null,
      resolveCoverImage,
    }),
  ),
);
const processedCardKeySet = computed(() => new Set(processedCardKeys.value));
const remainingCards = computed(() =>
  internalCards.value.filter((card) => !processedCardKeySet.value.has(card.cardKey)),
);
const resolvedActivePRDiscoveryCard = computed(() => remainingCards.value[0] ?? null);
const resolvedStackPreviewCards = computed(() => remainingCards.value.slice(1, 3));
const isCardStageActive = computed(() => resolvedActivePRDiscoveryCard.value !== null);
const activeCardActionAvailable = computed(() => {
  const card = resolvedActivePRDiscoveryCard.value;
  return card !== null && (card.detailPrId !== null || card.createTarget !== null);
});
const activeCardPrimaryActionLabel = computed(() => t("prDiscovery.card.detailButton"));
const cardEmptyTitle = computed(() => t("prDiscovery.card.emptyTitle"));
const cardEmptySubtitle = computed(() => t("prDiscovery.card.emptySubtitle"));

const selectedCreateEntry = computed(
  () =>
    createTimeWindows.value.find((entry) =>
      timeWindowsEqual(entry.timeWindow, cardCreateTimeWindow.value),
    ) ?? null,
);
const cardCreatePlaceOptions = computed(
  () => selectedCreateEntry.value?.placeOptions ?? allPlaceOptions.value,
);
const cardCreatePlaceLabel = computed(() => t("prDiscovery.createCard.placeLabel"));
const cardCreatePlacePlaceholder = computed(() => t("prDiscovery.createCard.placePlaceholder"));
const cardCreateSelectedPlace = computed(() =>
  toPRDiscoverySelectedPlace(
    findPRDiscoveryPlaceOptionById(cardCreatePlaceOptions.value, cardCreatePlaceId.value),
  ),
);
const cardCreateValidationMessage = computed(() => {
  if (!cardCreateTimeWindow.value?.[0] || !cardCreateTimeWindow.value?.[1]) {
    return t("prDiscovery.createCard.errors.missingTimeWindow");
  }
  if (!cardCreateSelectedPlace.value) return t("prDiscovery.createCard.errors.missingPlace");
  return null;
});
const cardCreateErrorMessage = computed(
  () => props.errorMessage ?? cardCreateValidationMessage.value,
);
const isCardCreateDisabled = computed(
  () => props.pending || cardCreateValidationMessage.value !== null,
);

watch(
  createTimeWindows,
  (entries) => {
    const selection = props.authoringOptions?.defaultSelection;
    const preferred = selection
      ? entries.find((entry) => entry.timeWindow[0] === selection.startAt)
      : null;
    if (!entries.some((entry) => timeWindowsEqual(entry.timeWindow, cardCreateTimeWindow.value))) {
      cardCreateTimeWindow.value = preferred?.timeWindow ?? entries[0]?.timeWindow ?? null;
    }
  },
  { immediate: true },
);
watch(
  [cardCreatePlaceOptions, () => props.authoringOptions?.defaultSelection ?? null],
  ([options, selection]) => {
    const preferred = selection
      ? options.find(
          (option) =>
            option.kind === "location" &&
            option.locationId === selection.locationId &&
            !option.disabled,
        )
      : null;
    if (!options.some((option) => option.id === cardCreatePlaceId.value && !option.disabled)) {
      cardCreatePlaceId.value =
        preferred?.id ?? getFirstEnabledPRDiscoveryPlaceOption(options)?.id ?? null;
    }
  },
  { immediate: true, deep: true },
);

const handleCardCreateTimeWindowChange = (value: TimeWindow | null) => {
  cardCreateTimeWindow.value = value;
};
const handleCardCreateAllowEditAfterReadyChange = (value: PRAllowEditAfterReady | null) => {
  cardCreateAllowEditAfterReady.value = value;
};
const handleCardCreatePlaceChange = (value: string | null) => {
  cardCreatePlaceId.value = value;
};
const syncCardOverflowGuard = (enabled: boolean) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle(PR_DISCOVERY_CARD_OVERFLOW_GUARD_CLASS, enabled);
  document.body.classList.toggle(PR_DISCOVERY_CARD_OVERFLOW_GUARD_CLASS, enabled);
};

const clearInternalCardDragHintTimer = () => {
  if (typeof window === "undefined" || internalCardDragHintTimerId === null) {
    return;
  }

  window.clearTimeout(internalCardDragHintTimerId);
  internalCardDragHintTimerId = null;
};

const scheduleInternalCardDragHint = () => {
  clearInternalCardDragHintTimer();

  if (typeof window === "undefined" || prefersReducedMotion.value || !isCardStageActive.value) {
    return;
  }

  internalCardDragHintTimerId = window.setTimeout(() => {
    internalCardDragHintTimerId = null;

    if (!isCardStageActive.value || prefersReducedMotion.value) {
      return;
    }

    internalDragHintToken.value += 1;
  }, PR_DISCOVERY_CARD_DRAG_HINT_DELAY_MS);
};

const consumeCardDragHintWindow = () => {
  clearInternalCardDragHintTimer();
};

const swipePreviewIntensity = computed(() =>
  clampPRDiscoveryCardSwipePreviewIntensity(swipePreviewState.value.intensity),
);
const swipePreviewPhase = computed(() => swipePreviewState.value.phase);
const swipePreviewPivotCorner = computed(() => swipePreviewState.value.pivotCorner);
const swipePreviewMagnitude = computed(() => Math.min(Math.abs(swipePreviewIntensity.value), 1));
const easeOutCurve = (value: number, power: number) => {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - Math.pow(1 - clamped, power);
};
const promptStrength = computed(() => easeOutCurve(swipePreviewMagnitude.value, 2.18));
const projectionActivation = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.02) {
    return 0;
  }

  return easeOutCurve((magnitude - 0.02) / 0.98, 2.26);
});
const projectionSpread = computed(() => easeOutCurve(swipePreviewMagnitude.value, 1.72));
const projectionThresholdTension = computed(() => {
  const magnitude = swipePreviewMagnitude.value;
  if (magnitude <= 0.72) {
    return 0;
  }

  return Math.pow((magnitude - 0.72) / 0.28, 1.55);
});
const projectionCornerSlot = computed<"top" | "bottom">(() => {
  return swipePreviewPivotCorner.value ?? "top";
});

const feedbackTransition = computed(() => {
  switch (swipePreviewPhase.value) {
    case "dragging":
      return "none";
    case "exiting":
      return `opacity ${PR_DISCOVERY_CARD_EXIT_TIMING}, transform ${PR_DISCOVERY_CARD_EXIT_TIMING}`;
    case "rebounding":
      return `opacity ${PR_DISCOVERY_CARD_REBOUND_TIMING}, transform ${PR_DISCOVERY_CARD_REBOUND_TIMING}`;
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
    direction === "left" ? swipePreviewIntensity.value < 0 : swipePreviewIntensity.value > 0;
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
    direction === "left" ? swipePreviewIntensity.value < 0 : swipePreviewIntensity.value > 0;
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
const leftProjectionShellStyle = computed(() => buildProjectionShellStyle("left"));
const rightProjectionShellStyle = computed(() => buildProjectionShellStyle("right"));
const leftProjectionLightStyle = computed(() => buildProjectionLightStyle("left"));
const rightProjectionLightStyle = computed(() => buildProjectionLightStyle("right"));

const handleSwipePreview = (previewState: PRDiscoveryCardSwipePreviewState) => {
  if (
    !hasConsumedDragHintWindow.value &&
    previewState.phase !== "idle" &&
    previewState.phase !== "hinting"
  ) {
    hasConsumedDragHintWindow.value = true;
    consumeCardDragHintWindow();
  }

  swipePreviewState.value = {
    intensity: clampPRDiscoveryCardSwipePreviewIntensity(previewState.intensity),
    phase: previewState.phase,
    pivotViewportY: previewState.pivotViewportY,
    pivotCorner: previewState.pivotCorner,
  };
};

const emitSkipActiveCard = () => {
  const card = resolvedActivePRDiscoveryCard.value;
  if (!card) return;
  consumeCardDragHintWindow();
  if (!processedCardKeySet.value.has(card.cardKey)) {
    processedCardKeys.value = [...processedCardKeys.value, card.cardKey];
  }
  const candidate =
    card.detailPrId === null
      ? null
      : (props.items.find((item) => item.prId === card.detailPrId) ?? null);
  emit("skip", candidate);
};

const emitViewActiveCardDetail = () => {
  const card = resolvedActivePRDiscoveryCard.value;
  if (!card || !activeCardActionAvailable.value || props.pending) return;
  consumeCardDragHintWindow();
  if (card.createTarget) {
    const suggestion = suggestions.value.find((item) => item.key === card.cardKey);
    const command = suggestion
      ? buildPRDiscoverySuggestionCreateCommand(suggestion)
      : buildPRDiscoveryDirectCreateCommand({
          timeWindow: card.createTarget.timeWindow,
          place: card.createTarget.place,
          preferences: card.createTarget.preferences,
          allowEditAfterReady: null,
        });
    if (command) emit("create-direct", command);
    return;
  }
  const candidate = props.items.find((item) => item.prId === card.detailPrId);
  if (candidate) emit("detail", candidate);
};

const handleSkipActionClick = () => {
  if (frontPRDiscoveryCardRef.value) {
    frontPRDiscoveryCardRef.value.triggerAction("skip");
    return;
  }
  emitSkipActiveCard();
};
const handleViewActionClick = () => {
  if (frontPRDiscoveryCardRef.value) {
    frontPRDiscoveryCardRef.value.triggerAction("view-detail");
    return;
  }
  emitViewActiveCardDetail();
};
const emitCreateFromCardEmpty = () => {
  if (!props.showCreate || cardCreateValidationMessage.value !== null) return;
  const command = buildPRDiscoveryDirectCreateCommand({
    timeWindow: cardCreateTimeWindow.value,
    place: cardCreateSelectedPlace.value,
    preferences: [],
    allowEditAfterReady: cardCreateAllowEditAfterReady.value,
  });
  if (command) emit("create-direct", command);
};

watch(
  () => resolvedActivePRDiscoveryCard.value?.cardKey ?? null,
  () => {
    swipePreviewState.value = createIdlePRDiscoveryCardSwipePreviewState();
  },
);
watch(resolvedDragHintToken, (token, previousToken) => {
  if (token !== previousToken && token > 0) {
    frontPRDiscoveryCardRef.value?.playHintWobble();
  }
});
watch(
  isCardStageActive,
  (isActive, wasActive) => {
    emit("card-stage-active-change", isActive);
    syncCardOverflowGuard(isActive);
    if (!isActive) consumeCardDragHintWindow();
    else if (!wasActive) scheduleInternalCardDragHint();
  },
  { immediate: true },
);
watch(prefersReducedMotion, (reduced) => {
  if (reduced) consumeCardDragHintWindow();
  else if (isCardStageActive.value) scheduleInternalCardDragHint();
});
watch(
  () => [props.items, props.cardGroups, props.suggestions, props.type] as const,
  () => {
    processedCardKeys.value = [];
  },
);

onActivated(() => {
  if (isCardStageActive.value) {
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

<style lang="scss" scoped src="./PRDiscoveryCardStack.scss"></style>
