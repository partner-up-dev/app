<template>
  <section class="anchor-event-form-mode" data-testid="anchor-event-form-mode.surface">
    <PuLoadingState
      v-if="formModeQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-else-if="formModeQuery.error.value"
      :message="formModeQuery.error.value.message"
      persistent
    />

    <div v-else-if="formModeData" class="anchor-event-form-mode__stack">
      <FormModeNoMatchResult
        v-if="noMatchRecommendationResult"
        :event-id="props.eventId"
        :candidates="noMatchRecommendationResult.orderedCandidates"
        :create-pending="createMutation.isPending.value"
        :create-disabled="!canCreateFallback"
        :show-create-fallback="canUserCreatePR"
        :create-error-message="createActionErrorMessage"
        :resolve-cover-image="resolveCoverImage"
        @candidate-detail="handleCandidateDetail"
        @join-candidate="handleJoinCandidate"
        @join-candidate-success-closed="handleJoinCandidateSuccessClosed"
        @create-fallback="handleCreateFallback"
      />

      <div v-else class="form-mode-builder">
        <AnchorEventCarouselPlaceSelector
          v-model="selectedPlace"
          :place-selector="formModeData.placeSelector"
          @update:model-value="trackFormStarted('location')"
          @create-location="handleCreateLocationApplication"
          @create-route="handleCreateRouteApplication"
        />

        <FormModeTimeControl
          v-model="selectedTimeSelection"
          v-model:allow-edit-after-ready="selectedAllowEditAfterReady"
          :start-options="selectedPlaceStartOptions"
          :duration-minutes="formModeData.event.durationMinutes"
          :earliest-lead-minutes="formModeData.event.earliestLeadMinutes"
          :default-mode="formModeData.event.prTimeWindowEditorDefaultMode"
          @update:model-value="trackFormStarted('time')"
        />

        <FormModePreferenceControl
          v-model="selectedPreferences"
          :event-id="props.eventId"
          :preset-tags="formModeData.presetTags"
          @update:model-value="trackFormStarted('preference')"
        />

        <p
          v-if="selectionErrorMessage"
          class="inline-message inline-message--error"
        >
          {{ selectionErrorMessage }}
        </p>

        <div class="form-actions">
          <Button
            appearance="rect"
            tone="outline"
            type="button"
            @click="handleViewAllSessions"
          >
            {{ t("anchorEvent.formMode.viewAllSessions") }}
          </Button>

          <FormModeLongPressButton
            :label="primaryCtaLabel"
            :pending="recommendationSubmissionPending"
            :pending-label="t('anchorEvent.formMode.primaryCtaPending')"
            :disabled="!canSubmitRecommendation"
            data-testid="anchor-event-form-mode.primary-action"
            @complete="handleSubmitRecommendation"
          />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="joinSplashPhase !== 'IDLE'"
        class="form-mode-join-splash"
        aria-hidden="true"
      >
        <LiquidWaveSplash
          :duration-ms="joinSplashDurationMs"
          :origin-rect="joinSplashOrigin"
          :phase="joinSplashLiquidPhase"
          @fill-complete="handleJoinSplashFilled"
          @drain-complete="handleJoinSplashDrained"
        />
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
} from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { useAnchorEventFormModeData } from "@/domains/event/queries/useAnchorEventFormModeData";
import {
  useAnchorEventFormModeRecommendation,
  type AnchorEventFormModeRecommendationPlaceInput,
} from "@/domains/event/queries/useAnchorEventFormModeRecommendation";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import {
  useCreateFormModeAutoPR,
  type CreateFormModeAutoPRError,
} from "@/domains/event/queries/useCreateFormModeAutoPR";
import AnchorEventCarouselPlaceSelector from "@/domains/event/ui/controls/form-mode/AnchorEventCarouselPlaceSelector.vue";
import FormModeTimeControl from "@/domains/event/ui/controls/form-mode/FormModeTimeControl.vue";
import FormModePreferenceControl from "@/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue";
import FormModeNoMatchResult from "@/domains/event/ui/composites/FormModeNoMatchResult.vue";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import type { LongPressOriginRect } from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import {
  buildFormModeCreateTimeWindow,
  buildFormModePointTimeWindows,
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
  type FormModeTimeSelection,
  isValidFormModeDateTime,
  pickStableGalleryImage,
} from "@/domains/event/model/form-mode";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import {
  buildFormModePlaceOptions,
  findAnchorEventPlaceOptionBySelectedPlace,
  type AnchorEventPlaceOption,
  type AnchorEventSelectedPlace,
} from "@/domains/event/model/place-options";
import { prDetailPath } from "@/domains/pr/routing/routes";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import LiquidWaveSplash from "@/processes/route-handoff/LiquidWaveSplash.vue";
import type { LiquidSplashPhase } from "@/processes/route-handoff/LiquidWaveSplash.vue";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";
import { PuLoadingState } from "@partner-up-dev/design-web";

const props = defineProps<{
  eventId: number;
}>();

const emit = defineEmits<{
  "result-state-change": [state: "selection" | "no-match"];
}>();

const router = useRouter();
const { t } = useI18n();

const eventId = computed(() => props.eventId);
const formModeQuery = useAnchorEventFormModeData(eventId);
const recommendationMutation = useAnchorEventFormModeRecommendation();
const createMutation = useCreateEventAssistedPR();
const autoCreateMutation = useCreateFormModeAutoPR();
const matchedPRHandoff = useMatchedPRHandoff();

const selectedPlace = ref<AnchorEventSelectedPlace | null>(null);
const selectedTimeSelection = ref<FormModeTimeSelection | null>(null);
const selectedAllowEditAfterReady = ref<PRAllowEditAfterReady | null>(null);
const selectedPreferences = ref<string[]>([]);
const noMatchRecommendationResult =
  ref<AnchorEventFormModeRecommendationResponse | null>(null);
const selectionErrorMessage = ref<string | null>(null);
const createReplayErrorMessage = ref<string | null>(null);
const hasTrackedFormImpression = ref(false);
const hasTrackedFormStart = ref(false);
const formStartTrackingArmed = ref(false);
const defaultSelectionAppliedEventId = ref<number | null>(null);
const pendingCreateReplayRunning = ref(false);
type JoinSplashPhase = "IDLE" | "FILLING" | "HOLDING" | "DRAINING";
const JOIN_SPLASH_FILL_MS = 980;
const JOIN_SPLASH_DRAIN_MS = 980;

const joinSplashPhase = ref<JoinSplashPhase>("IDLE");
const joinSplashOrigin = ref<LongPressOriginRect | null>(null);
const joinSplashTimeoutIds = new Set<number>();
let joinSplashFillResolve: (() => void) | null = null;
let joinSplashDrainResolve: (() => void) | null = null;

const formModeData = computed(() => formModeQuery.data.value ?? null);

const armFormStartTracking = (): void => {
  if (typeof window === "undefined") {
    formStartTrackingArmed.value = true;
    return;
  }

  window.setTimeout(() => {
    formStartTrackingArmed.value = true;
  }, 0);
};

const placeOptions = computed<AnchorEventPlaceOption[]>(() => {
  const data = formModeData.value;
  if (!data) {
    return [];
  }

  return buildFormModePlaceOptions({
    placeSelector: data.placeSelector,
    locations: data.locations,
    routes: data.routes,
  });
});

const selectedPlaceOption = computed(() =>
  findAnchorEventPlaceOptionBySelectedPlace(placeOptions.value, selectedPlace.value),
);
const selectedLocationId = computed(() =>
  selectedPlace.value?.kind === "location" ? selectedPlace.value.locationId : null,
);

const selectedStartAt = computed(() => {
  return selectedTimeSelection.value?.createTimeWindow?.startAt ?? null;
});

const hasValidTimeSelection = computed(() => {
  const selection = selectedTimeSelection.value;
  if (!selection) {
    return false;
  }
  return (
    selection.timeWindows.length > 0 &&
    selection.timeWindows.every(
      (timeWindow) =>
        isValidFormModeDateTime(timeWindow.startAt) &&
        isValidFormModeDateTime(timeWindow.endAt),
    ) &&
    isValidFormModeDateTime(selection.createTimeWindow?.startAt)
  );
});

const selectedPlaceStartOptions = computed(() => {
  const data = formModeData.value;
  if (!data) {
    return [];
  }

  const selected = selectedPlaceOption.value;
  if (!selected) {
    return data.startOptions;
  }

  const availableStartKeys = new Set(selected.availableStartKeys ?? []);
  return data.startOptions.filter((option) => availableStartKeys.has(option.key));
});

const primaryCtaLabel = computed(() => t("anchorEvent.formMode.primaryCta"));

const recommendationSubmissionPending = computed(
  () =>
    recommendationMutation.isPending.value ||
    autoCreateMutation.isPending.value ||
    matchedPRHandoff.isActive.value ||
    joinSplashPhase.value !== "IDLE",
);

const canSubmitRecommendation = computed(() =>
  Boolean(
    selectedPlace.value &&
      hasValidTimeSelection.value &&
      !recommendationSubmissionPending.value,
  ),
);

const canCreateFallback = computed(() =>
  Boolean(
    canUserCreatePR.value &&
    selectedPlace.value &&
      hasValidTimeSelection.value &&
      formModeData.value,
  ),
);

const joinSplashLiquidPhase = computed<LiquidSplashPhase>(() => {
  switch (joinSplashPhase.value) {
    case "FILLING":
      return "FILL";
    case "DRAINING":
      return "DRAIN";
    case "HOLDING":
    case "IDLE":
      return "HOLD";
  }
});

const joinSplashDurationMs = computed(() =>
  joinSplashPhase.value === "DRAINING"
    ? JOIN_SPLASH_DRAIN_MS
    : JOIN_SPLASH_FILL_MS,
);

const waitForJoinSplashFallback = async (durationMs: number): Promise<void> => {
  if (typeof window === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      joinSplashTimeoutIds.delete(timeoutId);
      resolve();
    }, durationMs);
    joinSplashTimeoutIds.add(timeoutId);
  });
};

const clearJoinSplashTimeouts = () => {
  if (typeof window === "undefined") {
    joinSplashTimeoutIds.clear();
    return;
  }

  for (const timeoutId of joinSplashTimeoutIds) {
    window.clearTimeout(timeoutId);
  }
  joinSplashTimeoutIds.clear();
};

const resolveJoinSplashFill = () => {
  if (joinSplashFillResolve === null) {
    return;
  }

  const resolve = joinSplashFillResolve;
  joinSplashFillResolve = null;
  resolve();
};

const resolveJoinSplashDrain = () => {
  if (joinSplashDrainResolve === null) {
    return;
  }

  const resolve = joinSplashDrainResolve;
  joinSplashDrainResolve = null;
  resolve();
};

const startJoinSplash = async (
  originRect: LongPressOriginRect,
): Promise<void> => {
  clearJoinSplashTimeouts();
  resolveJoinSplashFill();
  resolveJoinSplashDrain();
  joinSplashOrigin.value = originRect;
  joinSplashPhase.value = "FILLING";
  const fillPromise = new Promise<void>((resolve) => {
    joinSplashFillResolve = resolve;
  });
  await Promise.race([
    fillPromise,
    waitForJoinSplashFallback(JOIN_SPLASH_FILL_MS + 180),
  ]);
  resolveJoinSplashFill();
  if (joinSplashPhase.value === "FILLING") {
    joinSplashPhase.value = "HOLDING";
  }
};

const drainJoinSplash = async (): Promise<void> => {
  if (joinSplashPhase.value === "IDLE") {
    return;
  }

  joinSplashPhase.value = "DRAINING";
  const drainPromise = new Promise<void>((resolve) => {
    joinSplashDrainResolve = resolve;
  });
  await Promise.race([
    drainPromise,
    waitForJoinSplashFallback(JOIN_SPLASH_DRAIN_MS + 180),
  ]);
  resolveJoinSplashDrain();
  if (joinSplashPhase.value === "DRAINING") {
    joinSplashPhase.value = "IDLE";
    joinSplashOrigin.value = null;
  }
};

const resetJoinSplash = () => {
  clearJoinSplashTimeouts();
  resolveJoinSplashFill();
  resolveJoinSplashDrain();
  joinSplashPhase.value = "IDLE";
  joinSplashOrigin.value = null;
};

const handleJoinSplashFilled = () => {
  if (joinSplashPhase.value === "FILLING") {
    joinSplashPhase.value = "HOLDING";
  }
  resolveJoinSplashFill();
};

const handleJoinSplashDrained = () => {
  if (joinSplashPhase.value === "DRAINING") {
    joinSplashPhase.value = "IDLE";
    joinSplashOrigin.value = null;
  }
  resolveJoinSplashDrain();
};

const createActionErrorMessage = computed(() => {
  if (createReplayErrorMessage.value) {
    return createReplayErrorMessage.value;
  }

  const error = (createMutation.error.value ??
    autoCreateMutation.error.value) as
    | CreateEventAssistedPRError
    | CreateFormModeAutoPRError
    | null;
  if (!error) {
    return null;
  }

  return resolveCreateErrorMessage(error);
});

const resolveCreateErrorMessage = (error: CreateEventAssistedPRError): string => {
  switch (error.code) {
    case "ANCHOR_EVENT_NOT_FOUND":
      return t("anchorEvent.createCard.errors.eventUnavailable");
    case "ANCHOR_EVENT_USER_PR_CREATION_DISABLED":
      return t("anchorEvent.createCard.errors.userCreationDisabled");
    case "PR_START_TIME_PASSED":
      return t("anchorEvent.createCard.errors.timeWindowAlreadyPassed");
    case "AUTHENTICATED_REQUIRED":
    case "WECHAT_AUTH_REQUIRED":
      return t("anchorEvent.createCard.errors.wechatAuthRequired");
    default:
      return error.message || t("anchorEvent.createCard.errors.createFailed");
  }
};

const canUserCreatePR = computed(
  () => formModeData.value?.event.canUserCreatePR === true,
);

watch(
  formModeData,
  (data) => {
    if (!data || defaultSelectionAppliedEventId.value === data.event.id) {
      return;
    }

    defaultSelectionAppliedEventId.value = data.event.id;
    hasTrackedFormStart.value = false;
    formStartTrackingArmed.value = false;
    if (data.placeSelector.kind === "route") {
      armFormStartTracking();
      return;
    }

    const defaultSelection = data.defaultSelection;
    if (!defaultSelection) {
      armFormStartTracking();
      return;
    }

    const hasDefaultLocation = data.locations.some(
      (location) => location.id === defaultSelection.locationId,
    );
    if (!hasDefaultLocation) {
      return;
    }

    selectedPlace.value = {
      kind: "location",
      locationId: defaultSelection.locationId,
    };
    const defaultStartOption = data.startOptions.find(
      (option) => option.startAt === defaultSelection.startAt,
    );
    selectedTimeSelection.value = {
      mode: "NORMAL",
      label: `${formatFormModeDateLabel(defaultSelection.startAt)} ${formatFormModeTimeLabel(
        defaultSelection.startAt,
      )}`,
      timeWindows: buildFormModePointTimeWindows(defaultSelection.startAt),
      createTimeWindow: defaultStartOption
        ? {
            startAt: defaultStartOption.startAt,
            endAt: defaultStartOption.endAt,
          }
        : buildFormModeCreateTimeWindow(
            defaultSelection.startAt,
            data.event.durationMinutes,
          ),
    };
    armFormStartTracking();
  },
  { immediate: true },
);

watch(
  formModeData,
  (data) => {
    if (!data || hasTrackedFormImpression.value) {
      return;
    }

    trackEvent("anchor_event_form_impression", {
      eventId: props.eventId,
      activityType: data.event.type,
    });
    hasTrackedFormImpression.value = true;
  },
  { immediate: true },
);

const returnToSelection = () => {
  noMatchRecommendationResult.value = null;
  selectionErrorMessage.value = null;
};

defineExpose({
  returnToSelection,
});

watch([selectedPlace, selectedTimeSelection, selectedPreferences], () => {
  returnToSelection();
});

watch(
  noMatchRecommendationResult,
  (result) => {
    emit("result-state-change", result ? "no-match" : "selection");
  },
  { immediate: true },
);

const handleViewAllSessions = async () => {
  await router.push({
    name: "anchor-event-landing",
    params: {
      eventId: props.eventId.toString(),
    },
    query: {
      mode: "list",
    },
  });
};

const handleCreateLocationApplication = async () => {
  await router.push({
    name: "poi-location-apply",
    query: {
      fromEvent: props.eventId.toString(),
    },
  });
};

const handleCreateRouteApplication = async () => {
  await router.push({
    name: "anchor-event-route-apply",
    query: {
      fromEvent: props.eventId.toString(),
    },
  });
};

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) {
    return null;
  }

  const matchedLocation = formModeData.value?.locations.find(
    (item) => item.id === location,
  );
  return pickStableGalleryImage(matchedLocation?.gallery ?? [], location);
};

const isAdvancedStartValue = (startAt: string): boolean => {
  const options = formModeData.value?.startOptions ?? [];
  return !options.some((option) => option.startAt === startAt);
};

const resolveFormModeActivityType = (): string | undefined =>
  formModeData.value?.event.type ?? undefined;

const buildFormFunnelPayload = () => ({
  eventId: props.eventId,
  activityType: resolveFormModeActivityType(),
});

const buildSelectedConditionPayload = () => {
  const place = selectedPlace.value;
  const startAt = selectedStartAt.value;
  if (!place || !isValidFormModeDateTime(startAt)) {
    return null;
  }

  return {
    ...buildFormFunnelPayload(),
    locationId: place.kind === "location" ? place.locationId : null,
    placeKind: place.kind,
    locationType:
      place.kind === "location"
        ? resolveFormModeLocationType(place.locationId)
        : undefined,
    startAt,
    timeType: resolveFormModeTimeType(startAt),
    preferenceCount: selectedPreferences.value.length,
  };
};

const buildRecommendationPlaceInput = (
  place: AnchorEventSelectedPlace,
): AnchorEventFormModeRecommendationPlaceInput =>
  place.kind === "route"
    ? {
        kind: "route",
        route: place.route,
      }
    : {
        kind: "location",
        locationId: place.locationId,
      };

const buildRecommendationTimeWindows = () => {
  const selection = selectedTimeSelection.value;
  if (!selection) {
    return null;
  }
  if (
    selection.timeWindows.length === 0 ||
    !selection.timeWindows.every(
      (timeWindow) =>
        isValidFormModeDateTime(timeWindow.startAt) &&
        isValidFormModeDateTime(timeWindow.endAt),
    )
  ) {
    return null;
  }
  return selection.timeWindows.map((timeWindow) => ({ ...timeWindow }));
};

const resolveFormModeLocationType = (
  locationId: string | null,
): "preset" | "user_submitted" => {
  const locations = formModeData.value?.locations ?? [];
  return locationId && locations.some((location) => location.id === locationId)
    ? "preset"
    : "user_submitted";
};

const resolveFormModeTimeType = (
  startAt: string,
): "preset" | "user_submitted" =>
  selectedTimeSelection.value?.mode === "FUZZY" || !isAdvancedStartValue(startAt)
    ? "preset"
    : "user_submitted";

const trackFormStarted = (
  trigger: "location" | "time" | "preference" | "primary_cta",
): void => {
  if (
    hasTrackedFormStart.value ||
    !formStartTrackingArmed.value ||
    !formModeData.value
  ) {
    return;
  }

  trackEvent("anchor_event_form_started", {
    eventId: props.eventId,
    activityType: resolveFormModeActivityType(),
    trigger,
    hasDefaultSelection:
      formModeData.value.defaultSelection !== null &&
      formModeData.value.defaultSelection !== undefined,
    locationId: selectedLocationId.value ?? undefined,
    placeKind: selectedPlace.value?.kind,
    locationType:
      selectedLocationId.value === null
        ? undefined
        : resolveFormModeLocationType(selectedLocationId.value),
    startAt: isValidFormModeDateTime(selectedStartAt.value)
      ? selectedStartAt.value
      : undefined,
    timeType: isValidFormModeDateTime(selectedStartAt.value)
      ? resolveFormModeTimeType(selectedStartAt.value)
      : undefined,
    preferenceCount: selectedPreferences.value.length,
  });
  hasTrackedFormStart.value = true;
};

const trackRecommendationExposure = (
  result: AnchorEventFormModeRecommendationResponse,
) => {
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (!selectedConditionPayload) {
    return;
  }

  trackEvent("anchor_event_form_recommendation_impression", {
    ...selectedConditionPayload,
    hasMatchedRecommendation: Boolean(result.matchedRecommendation),
    candidateCount:
      result.orderedCandidates.length + (result.matchedRecommendation ? 1 : 0),
    advancedMode: isAdvancedStartValue(selectedConditionPayload.startAt),
  });
};

const trackFormModeJoinAction = (
  prId: number,
  action: "MATCHED_JOIN" | "CANDIDATE_JOIN",
  candidateRank: number | null = null,
): void => {
  trackEvent("anchor_event_form_result_action_click", {
    eventId: props.eventId,
    activityType: resolveFormModeActivityType(),
    action,
    prId,
    candidateRank,
  });
  trackEvent("anchor_event_candidate_engaged", {
    ...buildFormFunnelPayload(),
    action: "join",
    targetPrId: prId,
    candidateRank,
    entrySurface:
      action === "MATCHED_JOIN" ? "form_mode_matched" : "form_mode_candidate",
  });
  trackEvent("pr_entry_reached", {
    ...buildFormFunnelPayload(),
    prId,
    entrySurface:
      action === "MATCHED_JOIN" ? "form_mode_matched" : "form_mode_candidate",
    entryType: "join",
    candidateRank,
  });
};

const trackRecommendationResult = (
  payload: {
    actionResult: "success" | "failure" | "blocked";
    failureCode?: string;
    failureReason?: string;
    outcome?: "matched" | "no_match";
    matchedPrId?: number | null;
    candidateCount?: number;
  },
): void => {
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (!selectedConditionPayload) {
    return;
  }

  trackEvent("anchor_event_recommendation_result", {
    ...selectedConditionPayload,
    ...payload,
  });

  if (
    payload.actionResult === "success" &&
    payload.outcome &&
    typeof payload.candidateCount === "number"
  ) {
    trackEvent("anchor_event_recommendation_returned", {
      ...selectedConditionPayload,
      outcome: payload.outcome,
      matchedPrId: payload.matchedPrId,
      candidateCount: payload.candidateCount,
    });
  }
};

const trackEventAssistedCreateResult = (
  payload: {
    actionResult: "success" | "failure" | "blocked";
    failureCode?: string;
    failureReason?: string;
    prId?: number;
  },
  source: {
    place: AnchorEventSelectedPlace;
    startAt: string;
    preferenceCount: number;
  },
): void => {
  trackEvent("event_assisted_create_result", {
    eventId: props.eventId,
    prId: payload.prId,
    activityType: resolveFormModeActivityType(),
    locationId:
      source.place.kind === "location" ? source.place.locationId : null,
    placeKind: source.place.kind,
    locationType:
      source.place.kind === "location"
        ? resolveFormModeLocationType(source.place.locationId)
        : undefined,
    startAt: source.startAt,
    timeType: resolveFormModeTimeType(source.startAt),
    preferenceCount: source.preferenceCount,
    actionResult: payload.actionResult,
    failureCode: payload.failureCode,
    failureReason: payload.failureReason,
  });
  trackEvent("pr_commitment_result", {
    ...buildFormFunnelPayload(),
    commitmentType: "create",
    prId: payload.prId,
    entrySurface: "form_mode",
    actionResult: payload.actionResult,
    failureCode: payload.failureCode,
    failureReason: payload.failureReason,
  });
};

type EventAssistedCreateTrigger = "manual_fallback";

const buildCreatedPRTarget = (
  canonicalPath: string,
  handoff?: "event_assisted_create",
): string => {
  const query = new URLSearchParams({
    entry: "create",
    fromEvent: props.eventId.toString(),
  });
  if (handoff) {
    query.set("handoff", handoff);
  }
  return `${canonicalPath}?${query.toString()}`;
};

const createEventAssistedPR = async (
  trigger: EventAssistedCreateTrigger,
): Promise<boolean> => {
  if (!canUserCreatePR.value) {
    return false;
  }

  const place = selectedPlace.value;
  const startAt = selectedStartAt.value;
  if (!place || !isValidFormModeDateTime(startAt)) {
    return false;
  }

  const fields = buildCreateFields();
  if (!fields) {
    return false;
  }

  trackEvent("anchor_event_form_create_fallback_click", {
    eventId: props.eventId,
    activityType: resolveFormModeActivityType(),
    locationId: place.kind === "location" ? place.locationId : null,
    placeKind: place.kind,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  });

  const createTelemetrySource = {
    place,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  };
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (selectedConditionPayload) {
    trackEvent("anchor_event_assisted_create_started", {
      ...selectedConditionPayload,
      trigger,
    });
  }

  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      fields,
      allowEditAfterReady: selectedAllowEditAfterReady.value,
    });

    trackEventAssistedCreateResult(
      {
        actionResult: "success",
        prId: created.id,
      },
      createTelemetrySource,
    );
    trackEvent("pr_entry_reached", {
      ...buildFormFunnelPayload(),
      prId: created.id,
      entrySurface: "form_mode",
      entryType: "create_handoff",
    });
    await router.push(buildCreatedPRTarget(created.canonicalPath));
    return true;
  } catch (error) {
    if (isWeChatAuthBlockingError(error)) {
      trackEventAssistedCreateResult(
        {
          ...resolveTelemetryFailurePayload(
            error,
            "EVENT_ASSISTED_CREATE_BLOCKED",
            t("anchorEvent.createCard.errors.wechatAuthRequired"),
          ),
        },
        createTelemetrySource,
      );
      return true;
    }
    trackEventAssistedCreateResult(
      {
        ...resolveTelemetryFailurePayload(
          error,
          "EVENT_ASSISTED_CREATE_FAILED",
          error instanceof Error
            ? error.message
            : t("anchorEvent.createCard.errors.createFailed"),
        ),
      },
      createTelemetrySource,
    );
    return false;
  }
};

const createFormModeAutoPR = async (): Promise<boolean> => {
  if (!canUserCreatePR.value) {
    return false;
  }

  const place = selectedPlace.value;
  const [startAt, endAt] = resolveSelectedTimeWindow();
  if (!place || !startAt || !endAt) {
    selectionErrorMessage.value = t("anchorEvent.createCard.errors.createFailed");
    return false;
  }

  const createTelemetrySource = {
    place,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  };
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (selectedConditionPayload) {
    trackEvent("anchor_event_assisted_create_started", {
      ...selectedConditionPayload,
      trigger: "auto_no_candidates",
    });
  }

  autoCreateMutation.reset();
  try {
    const created = await autoCreateMutation.mutateAsync({
      eventId: props.eventId,
      timeWindow: [startAt, endAt],
      place,
      preferences: [...selectedPreferences.value],
      allowEditAfterReady: selectedAllowEditAfterReady.value,
    });
    trackEventAssistedCreateResult(
      {
        actionResult: "success",
        prId: created.id,
      },
      createTelemetrySource,
    );
    trackEvent("pr_entry_reached", {
      ...buildFormFunnelPayload(),
      prId: created.id,
      entrySurface: "form_mode",
      entryType: "create_handoff",
    });
    await router.push(buildCreatedPRTarget(created.canonicalPath));
    return true;
  } catch (error) {
    trackEventAssistedCreateResult(
      {
        ...resolveTelemetryFailurePayload(
          error,
          "FORM_MODE_AUTO_CREATE_FAILED",
          error instanceof Error
            ? error.message
            : t("anchorEvent.createCard.errors.createFailed"),
        ),
      },
      createTelemetrySource,
    );
    selectionErrorMessage.value =
      isCreateEventAssistedPRError(error)
        ? resolveCreateErrorMessage(error)
        : error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed");
    return false;
  }
};

const handleSubmitRecommendation = async (originRect: LongPressOriginRect) => {
  const place = selectedPlace.value;
  const startAt = selectedStartAt.value;
  const timeWindows = buildRecommendationTimeWindows();
  if (!place || !isValidFormModeDateTime(startAt) || !timeWindows) {
    return;
  }

  trackFormStarted("primary_cta");
  returnToSelection();
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (!selectedConditionPayload) {
    return;
  }
  const splashFill = startJoinSplash(originRect);
  trackEvent("anchor_event_recommendation_requested", {
    ...selectedConditionPayload,
  });

  try {
    const result = await recommendationMutation.mutateAsync({
      eventId: props.eventId,
      place: buildRecommendationPlaceInput(place),
      timeWindows,
      preferences: [...selectedPreferences.value],
    });
    trackRecommendationExposure(result);

    const matchedPRId = result.matchedRecommendation?.pr.id ?? null;
    trackRecommendationResult({
      actionResult: "success",
      outcome: matchedPRId === null ? "no_match" : "matched",
      matchedPrId: matchedPRId,
      candidateCount:
        result.orderedCandidates.length + (matchedPRId === null ? 0 : 1),
    });

    if (matchedPRId !== null) {
      trackEvent("anchor_event_candidate_engaged", {
        ...buildFormFunnelPayload(),
        action: "detail",
        targetPrId: matchedPRId,
        candidateRank: 1,
        entrySurface: "form_mode_matched",
      });
      trackEvent("pr_entry_reached", {
        ...buildFormFunnelPayload(),
        prId: matchedPRId,
        entrySurface: "form_mode_matched",
        entryType: "detail",
        candidateRank: 1,
      });
      await splashFill;
      await waitForJoinSplashFallback(140);
      matchedPRHandoff.begin({
        prId: matchedPRId,
        eventId: props.eventId,
        originRect,
      });
      resetJoinSplash();
      return;
    }

    await splashFill;
    if (result.orderedCandidates.length === 0) {
      if (!canUserCreatePR.value) {
        noMatchRecommendationResult.value = result;
        await drainJoinSplash();
        return;
      }

      const createStarted = await createFormModeAutoPR();
      if (createStarted) {
        resetJoinSplash();
        return;
      }
      await drainJoinSplash();
      return;
    }

    noMatchRecommendationResult.value = result;
    await drainJoinSplash();
  } catch (error) {
    selectionErrorMessage.value =
      error instanceof Error
        ? error.message
        : t("anchorEvent.formMode.recommendationFailed");
    trackRecommendationResult(
      {
        ...resolveTelemetryFailurePayload(
          error,
          "ANCHOR_EVENT_RECOMMENDATION_FAILED",
        selectionErrorMessage.value,
      ),
    },
  );
    await splashFill;
    await drainJoinSplash();
  }
};

const resolveSelectedTimeWindow = (): [string | null, string | null] => {
  const createTimeWindow = selectedTimeSelection.value?.createTimeWindow ?? null;
  if (!isValidFormModeDateTime(createTimeWindow?.startAt)) {
    return [null, null];
  }

  return [createTimeWindow.startAt, createTimeWindow.endAt];
};

const buildCreateFields = (): PartnerRequestFields | null => {
  const timeWindow = resolveSelectedTimeWindow();
  const place = selectedPlace.value;
  if (!place || !timeWindow[0]) {
    return null;
  }
  if (!formModeData.value) {
    return null;
  }

  return {
    title: undefined,
    type: formModeData.value.event.type,
    time: timeWindow,
    location: place.kind === "location" ? place.locationId : null,
    route: place.kind === "route" ? place.route : null,
    minPartners: formModeData.value.event.defaultMinPartners ?? 2,
    maxPartners: formModeData.value.event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [...selectedPreferences.value],
    notes: null,
    meetingPoint: null,
  };
};

const handleCreateFallback = async () => {
  if (!canUserCreatePR.value) {
    return;
  }

  await createEventAssistedPR("manual_fallback");
};

const handleCandidateDetail = (prId: number, rank: number): void => {
  trackEvent("anchor_event_candidate_engaged", {
    ...buildFormFunnelPayload(),
    action: "detail",
    targetPrId: prId,
    candidateRank: rank,
    entrySurface: "form_mode_candidate",
  });
  trackEvent("pr_entry_reached", {
    ...buildFormFunnelPayload(),
    prId,
    entrySurface: "form_mode_candidate",
    entryType: "detail",
    candidateRank: rank,
  });
};

const handleJoinCandidate = (prId: number, rank: number): void => {
  trackFormModeJoinAction(prId, "CANDIDATE_JOIN", rank);
};

const handleJoinCandidateSuccessClosed = async (prId: number) => {
  await router.push(`${prDetailPath(prId)}?entry=join&fromEvent=${props.eventId}`);
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

const isCreateEventAssistedPRError = (
  error: unknown,
): error is CreateEventAssistedPRError => error instanceof Error;

const attemptPendingCreateReplay = async () => {
  if (pendingCreateReplayRunning.value) {
    return;
  }

  const pending = readPendingWeChatAction();
  if (pending?.kind === "PR_JOIN") {
    await router.push(
      `${prDetailPath(pending.prId)}?entry=join&fromEvent=${props.eventId}`,
    );
    return;
  }

  if (
    !pending ||
    pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
    pending.eventId !== props.eventId
  ) {
    return;
  }

  if (!canUserCreatePR.value) {
    clearPendingWeChatAction();
    return;
  }

  pendingCreateReplayRunning.value = true;
  clearPendingWeChatAction();
  const pendingStartAt = pending.fields.time[0];
  const pendingCreateTelemetrySource =
    typeof pendingStartAt === "string" && isValidFormModeDateTime(pendingStartAt)
      ? {
          place:
            pending.fields.route !== null
              ? ({
                  kind: "route",
                  route: pending.fields.route,
                } satisfies AnchorEventSelectedPlace)
              : ({
                  kind: "location",
                  locationId: pending.fields.location ?? "",
                } satisfies AnchorEventSelectedPlace),
          startAt: pendingStartAt,
          preferenceCount: pending.fields.preferences.length,
        }
      : null;
  if (pending.handoff === "event_assisted_create") {
    const [startAt, endAt] = pending.fields.time;
    const pendingAutoCreatePlace =
      pending.fields.route !== null
        ? ({
            kind: "route",
            route: pending.fields.route,
          } satisfies AnchorEventSelectedPlace)
        : pending.fields.location
          ? ({
              kind: "location",
              locationId: pending.fields.location,
            } satisfies AnchorEventSelectedPlace)
          : null;

    try {
      if (
        typeof startAt !== "string" ||
        typeof endAt !== "string" ||
        !pendingAutoCreatePlace
      ) {
        throw new Error(t("anchorEvent.createCard.errors.createFailed"));
      }

      const created = await autoCreateMutation.mutateAsync({
        eventId: props.eventId,
        timeWindow: [startAt, endAt],
        place: pendingAutoCreatePlace,
        preferences: pending.fields.preferences,
        allowEditAfterReady: pending.allowEditAfterReady ?? null,
      });
      if (pendingCreateTelemetrySource) {
        trackEventAssistedCreateResult(
          {
            actionResult: "success",
            prId: created.id,
          },
          pendingCreateTelemetrySource,
        );
      }
      await router.push(buildCreatedPRTarget(created.canonicalPath));
    } catch (error) {
      if (pendingCreateTelemetrySource) {
        trackEventAssistedCreateResult(
          {
            ...resolveTelemetryFailurePayload(
              error,
              "FORM_MODE_AUTO_CREATE_REPLAY_FAILED",
              error instanceof Error
                ? error.message
                : t("anchorEvent.createCard.errors.createFailed"),
            ),
          },
          pendingCreateTelemetrySource,
        );
      }
      createReplayErrorMessage.value =
        error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed");
    } finally {
      pendingCreateReplayRunning.value = false;
    }
    return;
  }

  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      handoff: pending.handoff,
      allowEditAfterReady: pending.allowEditAfterReady ?? null,
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
    });
    if (pendingCreateTelemetrySource) {
      trackEventAssistedCreateResult(
        {
          actionResult: "success",
          prId: created.id,
        },
        pendingCreateTelemetrySource,
      );
    }
    await router.push(
      buildCreatedPRTarget(created.canonicalPath, pending.handoff),
    );
  } catch (error) {
    if (pendingCreateTelemetrySource) {
      trackEventAssistedCreateResult(
        {
          ...resolveTelemetryFailurePayload(
            error,
            "EVENT_ASSISTED_CREATE_REPLAY_FAILED",
            error instanceof Error
              ? error.message
              : t("anchorEvent.createCard.errors.createFailed"),
          ),
        },
        pendingCreateTelemetrySource,
      );
    }
    if (!isWeChatAuthBlockingError(error)) {
      createReplayErrorMessage.value =
        error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed");
    }
  } finally {
    pendingCreateReplayRunning.value = false;
  }
};

onMounted(() => {
  void attemptPendingCreateReplay();
});

onBeforeUnmount(() => {
  resetJoinSplash();
});
</script>

<style lang="scss" scoped>
.anchor-event-form-mode,
.anchor-event-form-mode__stack,
.form-mode-builder {
  display: flex;
  flex-direction: column;
}

.anchor-event-form-mode {
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: var(--sys-spacing-large);
}

.anchor-event-form-mode__stack {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-medium);
}

.form-mode-builder {
  flex: 1 1 auto;
  min-height: 0;
  justify-content: space-between;
  gap: var(--sys-spacing-medium);
}

.form-actions {
  display: flex;
  gap: var(--sys-spacing-small);
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: var(--sys-spacing-small);
}

.form-actions > :deep(button) {
  flex: 1 1 14rem;
  border-radius: 0;
}

.inline-message {
  margin: 0;
  @include mx.pu-font(support);
}

.inline-message--error {
  color: var(--sys-color-error);
}

.form-mode-join-splash {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  overflow: hidden;
  pointer-events: none;
}
</style>
