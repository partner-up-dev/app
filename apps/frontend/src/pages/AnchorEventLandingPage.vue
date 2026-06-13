<template>
  <PuPageScaffold
    footer-placement="reveal"
    :class="[
      'anchor-event-landing-page',
      { 'anchor-event-landing-page--card-rich': resolvedMode === 'CARD_RICH' },
    ]"
    data-page="event-landing"
    data-testid="anchor-event-landing.page"
    :content-placement="pageStatePlacement"
  >
    <template #header>
      <PageHeader
        v-if="detail"
        class="anchor-event-landing-page__header"
        :title="detail.title"
        :subtitle="detail.description ?? undefined"
        :back-fallback-to="{ name: 'event-plaza' }"
        @back="handleLandingBack"
      >
        <template #top-actions>
          <Button
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            data-testid="anchor-event-landing.other-events.open"
            @click="showOtherEventsDrawer = true"
          >
            {{ t("anchorEvent.otherEvents.action") }}
          </Button>
        </template>
      </PageHeader>
    </template>

    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <div v-else-if="isError" class="error-state">
      {{ t("anchorEvent.loadFailed") }}
      <router-link :to="{ name: 'event-plaza' }" class="back-link">
        {{ t("anchorEvent.backToPlaza") }}
      </router-link>
    </div>

    <AnchorEventFormModeSurface
      v-else-if="resolvedMode === 'FORM' && eventId !== null"
      ref="formModeSurfaceRef"
      :event-id="eventId"
      @result-state-change="formModeResultState = $event"
    />

    <AnchorEventListModeSurface
      v-else-if="resolvedMode === 'LIST' && eventId !== null"
      :event-id="eventId"
    />

    <template v-else-if="resolvedMode === 'CARD_RICH' && detail">
      <AnchorEventCardModeSurface
        :active-demand-card="activeDemandCard"
        :stack-preview-cards="stackPreviewCards"
        :is-card-routing="isCardRouting"
        :card-action-error="cardActionError"
        :drag-hint-token="0"
        :card-create-time-window="cardCreateTimeWindow"
        :card-create-allow-edit-after-ready="cardCreateAllowEditAfterReady"
        :card-create-place-id="cardCreatePlaceId"
        :card-create-place-options="cardCreatePlaceOptions"
        :card-create-place-label="cardCreatePlaceLabel"
        :card-create-place-placeholder="cardCreatePlacePlaceholder"
        :create-action-error-message="createActionErrorMessage"
        :is-create-pending="isCreatePending"
        :can-user-create-p-r="detail.canUserCreatePR"
        :event-id="detail.id"
        :event-title="detail.title"
        :event-beta-group-qr-code="detail.betaGroupQrCode"
        @consume-drag-hint-window="noop"
        @skip-active-card="handleSkipActiveCard"
        @view-active-card-detail="handleViewActiveCardDetail"
        @update:card-create-time-window="cardCreateTimeWindow = $event"
        @update:card-create-allow-edit-after-ready="
          cardCreateAllowEditAfterReady = $event
        "
        @update:card-create-place-id="cardCreatePlaceId = $event"
        @create-from-card-empty="handleCreateFromCardEmpty"
      />
    </template>

    <template #footer>
      <div class="anchor-event-landing-page__footer">
        <div
          v-if="detail && resolvedMode !== null"
          class="anchor-event-landing-page__mode-switch-shell"
          data-testid="anchor-event-landing.mode-switch"
        >
          <PuSegmented
            class="anchor-event-landing-page__mode-switch"
            :model-value="resolvedMode"
            :aria-label="t('anchorEvent.viewMode.ariaLabel')"
            full-width
            equal-width
            @update:model-value="handleModeControlChange"
          >
            <PuSegmentedItem
              v-for="option in modeOptions"
              :key="String(option.value)"
              :value="option.value"
              :label="option.label"
              :disabled="option.disabled"
              :data-testid="option.testId"
            >
              <template v-if="option.icon" #leading>
                <span :class="option.icon" aria-hidden="true" />
              </template>
            </PuSegmentedItem>
          </PuSegmented>
        </div>
        <PageFooter variant="brand" data-region="footer" />
      </div>
    </template>
  </PuPageScaffold>

  <PuDrawer
    v-model:visible="showOtherEventsDrawer"
    :title="t('anchorEvent.otherEvents.title')"
  >
    <PuLoadingState
      v-if="otherEventsQuery.isLoading.value"
      :message="t('common.loading')"
    />
    <div v-else-if="otherEventsQuery.error.value" class="error-state">
      {{ t("anchorEvent.formMode.otherEventsLoadFailed") }}
    </div>
    <AnchorEventRadioCardCarousel
      v-else
      :model-value="selectedOtherEventId"
      :events="otherEventCandidates"
      :aria-label="t('anchorEvent.otherEvents.title')"
      activate-on-card-click
      @update:model-value="selectedOtherEventId = $event"
      @activate="handleSelectOtherEvent"
    />
  </PuDrawer>

  <OfficialAccountFollowNudge
    :open="officialAccountFollowPrompt.isVisible.value"
    @dismiss="officialAccountFollowPrompt.dismissPrompt"
    @complete="officialAccountFollowPrompt.markPromptCompleted"
  />
</template>

<script setup lang="ts">
import type { PRAllowEditAfterReady } from "@partner-up-dev/backend";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import PageFooter from "@/shared/ui/sections/PageFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import AnchorEventCardModeSurface from "@/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue";
import AnchorEventFormModeSurface from "@/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue";
import AnchorEventListModeSurface from "@/domains/event/ui/surfaces/AnchorEventListModeSurface.vue";
import OfficialAccountFollowNudge from "@/domains/marketing/ui/OfficialAccountFollowNudge.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import { useAnchorEventDemandCards } from "@/domains/event/queries/useAnchorEventDemandCards";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import { useResolvedAnchorEventLandingMode } from "@/domains/event/use-cases/useResolvedAnchorEventLandingMode";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import {
  useMaterializeDummyPR,
  type MaterializeDummyPRError,
} from "@/domains/event/queries/useMaterializeDummyPR";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
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
  type AnchorEventSelectedPlace,
} from "@/domains/event/model/place-options";
import { buildAnchorEventDummyPRs } from "@/domains/event/model/dummy-prs";
import { prDetailPath } from "@/domains/pr/routing/routes";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import Button from "@/shared/ui/actions/Button.vue";
import AnchorEventRadioCardCarousel from "@/domains/event/ui/composites/AnchorEventRadioCardCarousel.vue";
import { useOfficialAccountFollowPrompt } from "@/domains/marketing/use-cases/useOfficialAccountFollowPrompt";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import {
  PuLoadingState,
  PuPageScaffold,
  PuSegmented,
  PuSegmentedItem,
  type PuSegmentedValue,
  PuDrawer,
} from "@partner-up-dev/design-web";
import {
  buildAnchorEventFunnelPayload,
  type AnchorEventFunnelContext,
} from "@/domains/event/telemetry/anchor-event-funnel";
import {
  normalizeAnchorEventLandingMode,
  type AnchorEventLandingMode,
} from "@/domains/event/model/anchorEventLandingModeStorage";

type TimeWindow = [string | null, string | null];
type SegmentedOption = {
  value: PuSegmentedValue;
  label: string;
  icon?: string;
  testId?: string;
  disabled?: boolean;
};

type FormModeResultState = "selection" | "no-match";
type FormModeSurfaceExposed = {
  returnToSelection: () => void;
};
type RouterHistoryState = {
  back?: string | null;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const showOtherEventsDrawer = ref(false);
const formModeSurfaceRef = ref<FormModeSurfaceExposed | null>(null);
const formModeResultState = ref<FormModeResultState>("selection");
const lastTrackedLandingKey = ref<string | null>(null);
const activeCardTelemetryContextKey = ref<string | null>(null);
const trackedCardStackKeys = ref<Set<string>>(new Set());
const trackedCardSeenKeys = ref<Set<string>>(new Set());
const officialAccountFollowPrompt =
  useOfficialAccountFollowPrompt("anchor_event");
const OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS = 3000;

const noop = () => undefined;

const modeOptions = computed<SegmentedOption[]>(() => [
  {
    value: "LIST",
    label: t("anchorEvent.viewMode.list"),
    icon: "i-mdi:view-list",
    testId: "anchor-event-landing.mode.list",
  },
  {
    value: "CARD_RICH",
    label: t("anchorEvent.viewMode.card"),
    icon: "i-mdi:cards-outline",
    testId: "anchor-event-landing.mode.card",
  },
  {
    value: "FORM",
    label: t("anchorEvent.viewMode.form"),
    icon: "i-mdi:form-select",
    testId: "anchor-event-landing.mode.form",
  },
]);

const toModeQueryValue = (mode: AnchorEventLandingMode): string => {
  if (mode === "CARD_RICH") {
    return "card";
  }
  return mode.toLowerCase();
};

const eventId = computed(() => {
  const raw = route.params.eventId;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const requestedMode = computed(() => route.query.mode);
const { assignmentQuery, resolvedMode, setResolvedMode, isTimeoutFallback } =
  useResolvedAnchorEventLandingMode(eventId, requestedMode);
const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
} = useAnchorEventDetail(eventId);
const otherEventsQuery = useAnchorEvents();
const selectedOtherEventId = ref<number | null>(null);
const otherEventCandidates = computed(() =>
  (otherEventsQuery.data.value ?? []).filter(
    (item) => item.id !== null && item.id !== eventId.value,
  ),
);

const isCardRichMode = computed(() => resolvedMode.value === "CARD_RICH");
const funnelContext = computed<AnchorEventFunnelContext | null>(() => {
  const id = eventId.value;
  const mode = resolvedMode.value;
  if (id === null || mode === null) {
    return null;
  }

  const assignment = assignmentQuery.data.value;
  return {
    eventId: id,
    assignedMode: assignment?.mode ?? mode,
    renderedMode: mode,
    assignmentRevision:
      assignment?.assignmentRevision === undefined
        ? undefined
        : String(assignment.assignmentRevision),
    isTimeoutFallback: isTimeoutFallback.value,
    activityType: detail.value?.type,
  };
});

const buildCurrentFunnelPayload = () => {
  const context = funnelContext.value;
  if (context) {
    return buildAnchorEventFunnelPayload(context);
  }

  const event = detail.value;
  return event
    ? {
        eventId: event.id,
        activityType: event.type,
      }
    : null;
};

const buildFunnelContextKey = (context: AnchorEventFunnelContext): string =>
  [
    context.eventId,
    context.renderedMode,
    context.assignedMode ?? "none",
    context.assignmentRevision ?? "none",
  ].join(":");

const claimTelemetryKey = (store: Set<string>, key: string): boolean => {
  if (store.has(key)) return false;
  store.add(key);
  return true;
};

const claimLatestTelemetryKey = (
  latestKey: { value: string | null },
  key: string,
): boolean => {
  if (latestKey.value === key) return false;
  latestKey.value = key;
  return true;
};

const ensureCardTelemetryContext = (contextKey: string): void => {
  if (activeCardTelemetryContextKey.value === contextKey) return;
  activeCardTelemetryContextKey.value = contextKey;
  trackedCardStackKeys.value = new Set();
  trackedCardSeenKeys.value = new Set();
};

const {
  data: demandCards,
  isLoading: isDemandCardsLoading,
  isError: isDemandCardsError,
} = useAnchorEventDemandCards(eventId, isCardRichMode);

const isModePending = computed(
  () => resolvedMode.value === null && assignmentQuery.isLoading.value,
);

const isLoading = computed(() => {
  if (eventId.value === null) {
    return false;
  }

  if (isModePending.value) {
    return true;
  }

  if (resolvedMode.value === "CARD_RICH") {
    return isDetailLoading.value || isDemandCardsLoading.value;
  }

  if (resolvedMode.value === "LIST") {
    return isDetailLoading.value;
  }

  return false;
});

const isError = computed(() => {
  if (eventId.value === null) {
    return true;
  }

  const assignmentError = assignmentQuery.error.value;
  if (assignmentError && !isTimeoutFallback.value) {
    return true;
  }

  if (isDetailError.value) {
    return true;
  }

  if (resolvedMode.value === "CARD_RICH" && isDemandCardsError.value) {
    return true;
  }

  return false;
});

const pageStatePlacement = computed(() =>
  isLoading.value || isError.value ? "center" : "start",
);

const hasRouterBackEntry = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as RouterHistoryState | null;
  return typeof historyState?.back === "string" && historyState.back.length > 0;
};

const backFallbackTo: RouteLocationRaw = { name: "event-plaza" };

const handleLandingBack = async () => {
  if (
    resolvedMode.value === "FORM" &&
    formModeResultState.value === "no-match"
  ) {
    formModeSurfaceRef.value?.returnToSelection();
    return;
  }

  if (hasRouterBackEntry()) {
    router.back();
    return;
  }

  await router.replace(backFallbackTo);
};

const handleModeControlChange = (value: PuSegmentedValue) => {
  const mode = normalizeAnchorEventLandingMode(value);
  const resolvedEventId = eventId.value;
  if (mode === null || resolvedEventId === null) {
    return;
  }

  setResolvedMode(mode);
  void router.replace({
    name: "anchor-event-landing",
    params: {
      eventId: resolvedEventId.toString(),
    },
    query: {
      ...route.query,
      mode: toModeQueryValue(mode),
    },
  });
};

watch([eventId, resolvedMode], () => {
  formModeResultState.value = "selection";
});

watch(
  funnelContext,
  (context) => {
    if (!context) return;
    const contextKey = buildFunnelContextKey(context);

    if (
      !claimLatestTelemetryKey(
        lastTrackedLandingKey,
        `anchor_event.landing.viewed:${contextKey}`,
      )
    ) {
      return;
    }

    trackEvent("anchor_event_landing_viewed", {
      ...buildAnchorEventFunnelPayload(context),
    });
  },
  { immediate: true },
);

watch(
  otherEventCandidates,
  (candidates) => {
    const selectedId = selectedOtherEventId.value;
    if (
      selectedId !== null &&
      candidates.some((candidate) => candidate.id === selectedId)
    ) {
      return;
    }

    selectedOtherEventId.value = candidates[0]?.id ?? null;
  },
  { immediate: true },
);

const createEventAssistedPRMutation = useCreateEventAssistedPR();
const materializeDummyPRMutation = useMaterializeDummyPR();
const isCreatePending = computed(
  () =>
    createEventAssistedPRMutation.isPending.value ||
    materializeDummyPRMutation.isPending.value,
);

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const createActionErrorMessage = computed(() => {
  const createAnchorError = (createEventAssistedPRMutation.error.value ??
    materializeDummyPRMutation.error.value) as
    | CreateEventAssistedPRError
    | MaterializeDummyPRError
    | null;
  if (createAnchorError) {
    switch (createAnchorError.code) {
      case JOIN_TIME_WINDOW_CONFLICT_CODE:
        return t("anchorEvent.createCard.errors.timeWindowConflict");
      case "AUTHENTICATED_REQUIRED":
      case "WECHAT_AUTH_REQUIRED":
        return t("anchorEvent.createCard.errors.wechatAuthRequired");
      case "LOCATION_CAP_REACHED":
        return t("anchorEvent.createCard.errors.locationCapReached");
      case "ANCHOR_EVENT_NOT_FOUND":
        return t("anchorEvent.createCard.errors.eventUnavailable");
      case "ANCHOR_EVENT_USER_PR_CREATION_DISABLED":
        return t("anchorEvent.createCard.errors.userCreationDisabled");
      default:
        return (
          createAnchorError.message ||
          t("anchorEvent.createCard.errors.createFailed")
        );
    }
  }
  return null;
});

const resolveTimeWindowStartTimestamp = (timeWindow: TimeWindow): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(start).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

const sortedCreateTimeWindows = computed(() => {
  const timeWindows = detail.value?.createTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const hasTimeWindowStarted = (timeWindow: TimeWindow): boolean => {
  const startTimestamp = resolveTimeWindowStartTimestamp(timeWindow);
  if (!Number.isFinite(startTimestamp)) {
    return false;
  }

  return Date.now() >= startTimestamp;
};

const upcomingSortedCreateTimeWindows = computed(() =>
  sortedCreateTimeWindows.value.filter(
    (entry) => !hasTimeWindowStarted(entry.timeWindow),
  ),
);
const canUserCreatePR = computed(() => detail.value?.canUserCreatePR === true);

const cardCreateTimeWindow = ref<TimeWindow | null>(null);
const cardCreateAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);
const cardCreatePlaceId = ref<string | null>(null);

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
    if (timeWindows.length === 0) {
      cardCreateTimeWindow.value = null;
      cardCreateAllowEditAfterReady.value = null;
      return;
    }

    const current = timeWindows.find((entry) =>
      timeWindowsEqual(entry.timeWindow, cardCreateTimeWindow.value),
    );
    if (current) {
      return;
    }

    cardCreateTimeWindow.value = resolveFirstCreatableTimeWindow();
    cardCreateAllowEditAfterReady.value = null;
  },
  { immediate: true },
);

const selectedCardCreateTimeWindow = computed(() => {
  const timeWindow = cardCreateTimeWindow.value;
  if (timeWindow === null) {
    return null;
  }

  return (
    upcomingSortedCreateTimeWindows.value.find((entry) =>
      timeWindowsEqual(entry.timeWindow, timeWindow),
    ) ?? null
  );
});

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const card of demandCards.value ?? []) {
    const location = card.displayLocationName?.trim() ?? "";
    if (location.length > 0) {
      uniqueLocationIds.add(location);
    }
  }
  for (const entry of detail.value?.createTimeWindows ?? []) {
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

const activeCardCreatePlaceSelector = computed(
  () =>
    selectedCardCreateTimeWindow.value?.placeSelector ??
    detail.value?.placeSelector ??
    null,
);

const cardCreatePlaceOptions = computed<AnchorEventPlaceOption[]>(() =>
  buildCreateTimeWindowPlaceOptions({
    placeSelector: activeCardCreatePlaceSelector.value,
    locationOptions: selectedCardCreateTimeWindow.value?.locationOptions ?? [],
    routeOptions: selectedCardCreateTimeWindow.value?.routeOptions ?? [],
    poiByName: poiByName.value,
  }),
);
const cardCreatePlaceLabel = computed(() =>
  t(
    activeCardCreatePlaceSelector.value?.labelKey ??
      "anchorEvent.placeSelector.locationLabel",
  ),
);
const cardCreatePlacePlaceholder = computed(() =>
  t(
    activeCardCreatePlaceSelector.value?.placeholderKey ??
      "anchorEvent.placeSelector.locationPlaceholder",
  ),
);

watch(
  cardCreatePlaceOptions,
  (options) => {
    if (
      cardCreatePlaceId.value !== null &&
      options.some(
        (option) => option.id === cardCreatePlaceId.value && !option.disabled,
      )
    ) {
      return;
    }

    cardCreatePlaceId.value = getFirstEnabledPlaceOption(options)?.id ?? null;
  },
  { immediate: true, deep: true },
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

const dummyPRs = computed(() =>
  detail.value
    ? buildAnchorEventDummyPRs({
        browseTimeWindows: detail.value.browseTimeWindows,
        createTimeWindows: detail.value.createTimeWindows,
        presetTags: detail.value.presetTags,
        poiByName: poiByName.value,
      })
    : [],
);

const allDemandCards = computed(() => {
  const realCards = toDemandCardViewModels({
    cards: demandCards.value ?? [],
    eventCoverImage: detail.value?.coverImage ?? null,
    resolveCoverImage,
  });
  const dummyCards = toDummyDemandCardViewModels({
    dummies: dummyPRs.value,
    eventCoverImage: detail.value?.coverImage ?? null,
    resolveCoverImage,
  });

  return sortDemandCardViewModels([...realCards, ...dummyCards]);
});

const processedCardKeys = ref<string[]>([]);
const processedCardKeySet = computed(() => new Set(processedCardKeys.value));
const remainingDemandCards = computed(() =>
  allDemandCards.value.filter(
    (card) => !processedCardKeySet.value.has(card.cardKey),
  ),
);
const activeDemandCard = computed(() => remainingDemandCards.value[0] ?? null);
const stackPreviewCards = computed(() =>
  remainingDemandCards.value.slice(1, 3),
);

const cardActionError = ref<string | null>(null);
const isCardRouting = ref(false);

watch(activeDemandCard, () => {
  cardActionError.value = null;
});

const resolveDemandCardRank = (cardKey: string): number => {
  const index = allDemandCards.value.findIndex(
    (card) => card.cardKey === cardKey,
  );
  return index >= 0 ? index + 1 : 1;
};

watch(
  [funnelContext, allDemandCards],
  ([context, cards]) => {
    if (
      !context ||
      context.renderedMode !== "CARD_RICH" ||
      isDemandCardsLoading.value ||
      demandCards.value === undefined
    ) {
      return;
    }
    const contextKey = buildFunnelContextKey(context);
    ensureCardTelemetryContext(contextKey);
    if (
      !claimTelemetryKey(
        trackedCardStackKeys.value,
        `anchor_event.card_stack.loaded:${contextKey}:${cards.length}`,
      )
    ) {
      return;
    }

    trackEvent("anchor_event_card_stack_loaded", {
      ...buildAnchorEventFunnelPayload(context),
      cardCount: cards.length,
    });
  },
  { immediate: true },
);

watch(
  [funnelContext, activeDemandCard],
  ([context, card]) => {
    if (!context || context.renderedMode !== "CARD_RICH" || !card) return;
    const contextKey = buildFunnelContextKey(context);
    ensureCardTelemetryContext(contextKey);
    if (
      !claimTelemetryKey(
        trackedCardSeenKeys.value,
        `anchor_event.card.seen:${contextKey}:${card.cardKey}`,
      )
    ) {
      return;
    }

    trackEvent("anchor_event_card_seen", {
      ...buildAnchorEventFunnelPayload(context),
      cardKey: card.cardKey,
      targetPrId: card.detailPrId,
      rank: resolveDemandCardRank(card.cardKey),
      cardCount: allDemandCards.value.length,
    });
  },
  { immediate: true },
);

const markCardProcessed = (cardKey: string) => {
  if (processedCardKeySet.value.has(cardKey)) {
    return;
  }

  processedCardKeys.value = [...processedCardKeys.value, cardKey];
};

const handleSkipActiveCard = () => {
  const card = activeDemandCard.value;
  if (!card) {
    return;
  }

  const funnelPayload = buildCurrentFunnelPayload();
  if (funnelPayload) {
    trackEvent("anchor_event_card_action_taken", {
      ...funnelPayload,
      action: "skip",
      cardKey: card.cardKey,
      targetPrId: card.detailPrId,
      rank: resolveDemandCardRank(card.cardKey),
    });
  }

  markCardProcessed(card.cardKey);
  cardActionError.value = null;
};

const handleViewActiveCardDetail = async () => {
  const card = activeDemandCard.value;
  if (!card || (card.detailPrId === null && card.createTarget === null)) {
    return;
  }

  const funnelPayload = buildCurrentFunnelPayload();
  if (funnelPayload) {
    trackEvent("anchor_event_card_action_taken", {
      ...funnelPayload,
      action: "detail",
      cardKey: card.cardKey,
      targetPrId: card.detailPrId,
      rank: resolveDemandCardRank(card.cardKey),
      preferenceCount: card.createTarget?.preferences.length,
    });
  }

  cardActionError.value = null;
  isCardRouting.value = true;
  try {
    if (card.createTarget) {
      const event = detail.value;
      if (!event) {
        return;
      }
      materializeDummyPRMutation.reset();
      const created = await materializeDummyPRMutation.mutateAsync({
        eventId: event.id,
        timeWindow: card.createTarget.timeWindow,
        place: card.createTarget.place,
        preferences: card.createTarget.preferences,
      });
      trackEvent("anchor_event_dummy_pr_materialization_result", {
        ...(funnelPayload ?? {
          eventId: event.id,
          activityType: event.type,
        }),
        prId: created.id,
        entrySurface: "card_rich",
        actionResult: "success",
        materialization: created.materialization,
        preferenceCount: card.createTarget.preferences.length,
      });
      trackEvent("pr_entry_reached", {
        ...(funnelPayload ?? {
          eventId: event.id,
          activityType: event.type,
        }),
        prId: created.id,
        entrySurface: "card_rich",
        entryType: "detail",
      });
      await router.push(
        buildEventDetailTarget(created.canonicalPath, event.id),
      );
      return;
    }

    if (card.detailPrId !== null) {
      await router.push(prDetailPath(card.detailPrId));
    }
    if (funnelPayload && card.detailPrId !== null) {
      trackEvent("pr_entry_reached", {
        ...funnelPayload,
        prId: card.detailPrId,
        entrySurface: "card_rich",
        entryType: "detail",
      });
    }
  } catch (error) {
    if (card.createTarget) {
      const event = detail.value;
      const telemetryPayload =
        funnelPayload ??
        (event
          ? {
              eventId: event.id,
              activityType: event.type,
            }
          : null);
      if (telemetryPayload) {
        trackEvent("anchor_event_dummy_pr_materialization_result", {
          ...telemetryPayload,
          entrySurface: "card_rich",
          preferenceCount: card.createTarget.preferences.length,
          ...resolveTelemetryFailurePayload(
            error,
            "ANCHOR_EVENT_DUMMY_PR_MATERIALIZATION_FAILED",
            error instanceof Error
              ? error.message
              : t("anchorEvent.createCard.errors.createFailed"),
          ),
        });
      }
    }
    cardActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    isCardRouting.value = false;
  }
};

const WECHAT_AUTH_BLOCKING_CODES = new Set([
  "AUTHENTICATED_REQUIRED",
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const isWeChatAuthBlockingError = (
  error: unknown,
): error is CreateEventAssistedPRError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as CreateEventAssistedPRError;
  return (
    apiError.status === 401 &&
    typeof apiError.code === "string" &&
    WECHAT_AUTH_BLOCKING_CODES.has(apiError.code)
  );
};

const buildEventAssistedFields = ({
  targetTimeWindow,
  place,
  preferences,
}: {
  targetTimeWindow: TimeWindow | null;
  place: AnchorEventSelectedPlace | null;
  preferences?: readonly string[];
}) => {
  const event = detail.value;
  if (!event) {
    throw new Error(t("common.operationFailed"));
  }

  if (!targetTimeWindow || !place) {
    throw new Error(t("common.operationFailed"));
  }

  return {
    title: undefined,
    type: event.type,
    time: targetTimeWindow,
    location: place.kind === "location" ? place.locationId : null,
    route: place.kind === "route" ? place.route : null,
    minPartners: event.defaultMinPartners ?? 2,
    maxPartners: event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [...(preferences ?? [])],
    notes: null,
  };
};

const buildEventAssistedCreateTarget = (
  canonicalPath: string,
  eventId: number,
  handoff?: "event_assisted_create",
): string => {
  const query = new URLSearchParams({
    entry: "create",
    fromEvent: eventId.toString(),
  });
  if (handoff === "event_assisted_create") {
    query.set("handoff", handoff);
  }
  return `${canonicalPath}?${query.toString()}`;
};

const buildEventDetailTarget = (
  canonicalPath: string,
  eventId: number,
): string => {
  const query = new URLSearchParams({
    fromEvent: eventId.toString(),
  });
  return `${canonicalPath}?${query.toString()}`;
};

const createEventAssistedPR = async ({
  targetTimeWindow,
  allowEditAfterReady,
  place,
  preferences,
}: {
  targetTimeWindow: TimeWindow | null;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
  place: AnchorEventSelectedPlace | null;
  preferences?: readonly string[];
}) => {
  if (!canUserCreatePR.value) {
    return;
  }

  createEventAssistedPRMutation.reset();

  const event = detail.value;
  if (!event) {
    return;
  }

  const fields = buildEventAssistedFields({
    targetTimeWindow,
    place,
    preferences,
  });
  const funnelPayload = buildCurrentFunnelPayload() ?? {
    eventId: event.id,
    activityType: event.type,
  };

  try {
    const created = await createEventAssistedPRMutation.mutateAsync({
      eventId: event.id,
      fields,
      allowEditAfterReady: allowEditAfterReady ?? null,
    });
    trackEvent("pr_commitment_result", {
      ...funnelPayload,
      commitmentType: "create",
      actionResult: "success",
      prId: created.id,
      entrySurface: "card_rich",
    });
    trackEvent("pr_entry_reached", {
      ...funnelPayload,
      prId: created.id,
      entrySurface: "card_rich",
      entryType: "create_handoff",
    });
    await router.push(
      buildEventAssistedCreateTarget(created.canonicalPath, event.id),
    );
  } catch (error) {
    if (isWeChatAuthBlockingError(error)) {
      trackEvent("pr_commitment_result", {
        ...funnelPayload,
        ...resolveTelemetryFailurePayload(
          error,
          "EVENT_ASSISTED_CREATE_BLOCKED",
          t("anchorEvent.createCard.errors.wechatAuthRequired"),
        ),
        commitmentType: "create",
        entrySurface: "card_rich",
      });
      return;
    }
    trackEvent("pr_commitment_result", {
      ...funnelPayload,
      ...resolveTelemetryFailurePayload(
        error,
        "EVENT_ASSISTED_CREATE_FAILED",
        error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed"),
      ),
      commitmentType: "create",
      entrySurface: "card_rich",
    });
    throw error;
  }
};

const pendingCreateReplayRunning = ref(false);

const attemptPendingCreateReplay = async () => {
  if (pendingCreateReplayRunning.value) return;
  const event = detail.value;
  if (!event) return;

  const pending = readPendingWeChatAction();
  if (
    !pending ||
    pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
    pending.eventId !== event.id
  ) {
    return;
  }

  pendingCreateReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    const created = await createEventAssistedPRMutation.mutateAsync({
      eventId: event.id,
      handoff: pending.handoff,
      fields: {
        title: undefined,
        type: pending.fields.type,
        time: pending.fields.time,
        location: pending.fields.location,
        route: pending.fields.route,
        minPartners: pending.fields.minPartners,
        maxPartners: pending.fields.maxPartners,
        partners: [],
        budget: null,
        preferences: pending.fields.preferences,
        notes: null,
      },
      allowEditAfterReady: pending.allowEditAfterReady ?? null,
    });
    await router.push(
      buildEventAssistedCreateTarget(
        created.canonicalPath,
        event.id,
        pending.handoff,
      ),
    );
  } catch (error) {
    if (!isWeChatAuthBlockingError(error)) {
      const apiError = error as ApiError;
      cardActionError.value = apiError.message ?? t("common.operationFailed");
    }
  } finally {
    pendingCreateReplayRunning.value = false;
  }
};

watch(
  () => detail.value?.id ?? null,
  () => {
    void attemptPendingCreateReplay();
  },
  { immediate: true },
);

onMounted(() => {
  void attemptPendingCreateReplay();
  officialAccountFollowPrompt.requestPromptAfterDelay(
    OFFICIAL_ACCOUNT_FOLLOW_PROMPT_DELAY_MS,
  );
});

const handleCreateFromCardEmpty = async () => {
  if (!canUserCreatePR.value) {
    return;
  }

  const place = toAnchorEventSelectedPlace(
    findAnchorEventPlaceOption(
      cardCreatePlaceOptions.value,
      cardCreatePlaceId.value,
    ),
  );
  const targetTimeWindow = cardCreateTimeWindow.value;
  if (!targetTimeWindow?.[0] || !targetTimeWindow?.[1] || !place) {
    return;
  }
  const funnelPayload = buildCurrentFunnelPayload();
  if (funnelPayload) {
    trackEvent("anchor_event_card_empty_create_started", {
      ...funnelPayload,
      locationId: place?.kind === "location" ? place.locationId : null,
      placeKind: place?.kind ?? null,
      timeWindowStart: targetTimeWindow[0],
    });
  }

  await createEventAssistedPR({
    targetTimeWindow,
    allowEditAfterReady: cardCreateAllowEditAfterReady.value,
    place,
  });
};

const handleSelectOtherEvent = async (nextEventId: number | null) => {
  if (nextEventId === null || nextEventId === eventId.value) {
    return;
  }
  showOtherEventsDrawer.value = false;
  await router.push({
    name: "anchor-event-landing",
    params: {
      eventId: nextEventId.toString(),
    },
  });
};
</script>

<style lang="scss" scoped>
.anchor-event-landing-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
  isolation: isolate;
}

.anchor-event-landing-page :deep(.footer-reveal-page-scaffold__viewport) {
  position: relative;
  z-index: 1;
}

.anchor-event-landing-page :deep(.footer-reveal-page-scaffold__footer) {
  position: relative;
  z-index: 30;
}

.anchor-event-landing-page--card-rich
  :deep(.footer-reveal-page-scaffold__viewport) {
  height: var(--pu-vh);
  overflow: hidden;
}

.anchor-event-landing-page__header {
  flex-shrink: 0;
}

.anchor-event-landing-page__footer {
  position: relative;
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--sys-color-surface-container);
}

.anchor-event-landing-page__mode-switch-shell {
  position: sticky;
  top: 0;
  z-index: 40;
  min-width: 0;
  padding-top: var(--sys-spacing-medium);
  padding-left: var(--page-footer-padding-inline-start, 0);
  padding-right: var(--page-footer-padding-inline-end, 0);
  background: var(--sys-color-surface-container);
}

.anchor-event-landing-page__mode-switch {
  width: 100%;
  max-width: var(--dcs-layout-page-max-width);
  margin-inline: auto;
}

.loading-state,
.error-state {
  text-align: center;
  color: var(--sys-color-on-surface-variant);
}

.back-link {
  display: inline-block;
  margin-top: 0.75rem;
  color: var(--sys-color-primary);
}
</style>
