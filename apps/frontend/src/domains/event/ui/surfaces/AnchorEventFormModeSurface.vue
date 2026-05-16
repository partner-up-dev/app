<template>
  <section class="anchor-event-form-mode" data-testid="anchor-event-form-mode.surface">
    <LoadingIndicator
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

      <div v-else class="form-mode-selection">
        <FormModeLocationControl
          v-model="selectedLocationId"
          :locations="formModeData.locations"
          @update:model-value="trackFormStarted('location')"
          @create-location="handleCreateLocationApplication"
        />

        <FormModeTimeControl
          v-model="selectedStartAt"
          :start-options="selectedLocationStartOptions"
          :duration-minutes="formModeData.event.durationMinutes"
          :earliest-lead-minutes="formModeData.event.earliestLeadMinutes"
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
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import Button from "@/shared/ui/actions/Button.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";
import { useAnchorEventFormModeData } from "@/domains/event/queries/useAnchorEventFormModeData";
import { useAnchorEventFormModeRecommendation } from "@/domains/event/queries/useAnchorEventFormModeRecommendation";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import FormModeLocationControl from "@/domains/event/ui/controls/form-mode/FormModeLocationControl.vue";
import FormModeTimeControl from "@/domains/event/ui/controls/form-mode/FormModeTimeControl.vue";
import FormModePreferenceControl from "@/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue";
import FormModeNoMatchResult from "@/domains/event/ui/composites/FormModeNoMatchResult.vue";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import type { LongPressOriginRect } from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import {
  formatFormModeDateLabel,
  formatFormModeTimeLabel,
  isValidFormModeDateTime,
  pickStableGalleryImage,
} from "@/domains/event/model/form-mode";
import type { AnchorEventFormModeRecommendationResponse } from "@/domains/event/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import LiquidWaveSplash from "@/processes/route-handoff/LiquidWaveSplash.vue";
import type { LiquidSplashPhase } from "@/processes/route-handoff/LiquidWaveSplash.vue";
import { useMatchedPRHandoff } from "@/processes/route-handoff/useMatchedPRHandoff";

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
const matchedPRHandoff = useMatchedPRHandoff();

const selectedLocationId = ref<string | null>(null);
const selectedStartAt = ref<string | null>(null);
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

const selectedLocationStartOptions = computed(() => {
  const data = formModeData.value;
  if (!data) {
    return [];
  }

  const selectedLocation = data.locations.find(
    (location) => location.id === selectedLocationId.value,
  );
  if (!selectedLocation) {
    return data.startOptions;
  }

  const availableStartKeys = new Set(selectedLocation.availableStartKeys);
  return data.startOptions.filter((option) => availableStartKeys.has(option.key));
});

const selectedLocationLabel = computed(() => {
  const selected = formModeData.value?.locations.find(
    (location) => location.id === selectedLocationId.value,
  );
  return selected?.id ?? t("anchorEvent.formMode.locationPlaceholder");
});

const selectedTimeLabel = computed(() => {
  if (!isValidFormModeDateTime(selectedStartAt.value)) {
    return t("anchorEvent.formMode.timePlaceholder");
  }
  return `${formatFormModeDateLabel(selectedStartAt.value)} ${formatFormModeTimeLabel(
    selectedStartAt.value,
  )}`;
});

const primaryCtaLabel = computed(() => {
  if (!selectedStartAt.value || !selectedLocationId.value) {
    return t("anchorEvent.formMode.primaryCtaFallback");
  }
  return t("anchorEvent.formMode.primaryCta", {
    time: selectedTimeLabel.value,
    location: selectedLocationLabel.value,
    eventTitle: formModeData.value?.event.title ?? "",
  });
});

const recommendationSubmissionPending = computed(
  () =>
    recommendationMutation.isPending.value ||
    matchedPRHandoff.isActive.value ||
    joinSplashPhase.value !== "IDLE",
);

const canSubmitRecommendation = computed(() =>
  Boolean(
    selectedLocationId.value &&
      selectedStartAt.value &&
      isValidFormModeDateTime(selectedStartAt.value) &&
      !recommendationSubmissionPending.value,
  ),
);

const canCreateFallback = computed(() =>
  Boolean(
    canUserCreatePR.value &&
    selectedLocationId.value &&
      selectedStartAt.value &&
      isValidFormModeDateTime(selectedStartAt.value) &&
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

  const error = createMutation.error.value as CreateEventAssistedPRError | null;
  if (!error) {
    return null;
  }

  switch (error.code) {
    case "ANCHOR_EVENT_NOT_FOUND":
      return t("anchorEvent.createCard.errors.eventUnavailable");
    case "ANCHOR_EVENT_USER_PR_CREATION_DISABLED":
      return t("anchorEvent.createCard.errors.userCreationDisabled");
    case "AUTHENTICATED_REQUIRED":
    case "WECHAT_AUTH_REQUIRED":
      return t("anchorEvent.createCard.errors.wechatAuthRequired");
    default:
      return error.message || t("anchorEvent.createCard.errors.createFailed");
  }
});

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

    selectedLocationId.value = defaultSelection.locationId;
    selectedStartAt.value = defaultSelection.startAt;
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

watch([selectedLocationId, selectedStartAt, selectedPreferences], () => {
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
    name: "anchor-event",
    params: {
      eventId: props.eventId.toString(),
    },
    query: {
      mode: "LIST",
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
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !isValidFormModeDateTime(startAt)) {
    return null;
  }

  return {
    ...buildFormFunnelPayload(),
    locationId,
    locationType: resolveFormModeLocationType(locationId),
    startAt,
    timeType: resolveFormModeTimeType(startAt),
    preferenceCount: selectedPreferences.value.length,
  };
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
  isAdvancedStartValue(startAt) ? "user_submitted" : "preset";

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
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !isValidFormModeDateTime(startAt)) {
    return;
  }

  trackEvent("anchor_event_form_recommendation_impression", {
    eventId: props.eventId,
    activityType: resolveFormModeActivityType(),
    hasMatchedRecommendation: Boolean(result.matchedRecommendation),
    candidateCount:
      result.orderedCandidates.length + (result.matchedRecommendation ? 1 : 0),
    advancedMode: isAdvancedStartValue(startAt),
    locationId,
    startAt,
    preferenceCount: selectedPreferences.value.length,
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
    correlationId?: string;
  },
): void => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !isValidFormModeDateTime(startAt)) {
    return;
  }

  trackEvent("anchor_event_recommendation_result", {
    eventId: props.eventId,
    activityType: resolveFormModeActivityType(),
    locationId,
    locationType: resolveFormModeLocationType(locationId),
    startAt,
    timeType: resolveFormModeTimeType(startAt),
    preferenceCount: selectedPreferences.value.length,
    correlationId: payload.correlationId,
    ...payload,
  });

  if (
    payload.actionResult === "success" &&
    payload.outcome &&
    typeof payload.candidateCount === "number"
  ) {
    trackEvent("anchor_event_recommendation_returned", {
      ...buildFormFunnelPayload(),
      locationId,
      locationType: resolveFormModeLocationType(locationId),
      startAt,
      timeType: resolveFormModeTimeType(startAt),
      preferenceCount: selectedPreferences.value.length,
      outcome: payload.outcome,
      matchedPrId: payload.matchedPrId,
      candidateCount: payload.candidateCount,
      correlationId: payload.correlationId,
    });
  }
};

const trackEventAssistedCreateResult = (
  payload: {
    actionResult: "success" | "failure" | "blocked";
    failureCode?: string;
    failureReason?: string;
    prId?: number;
    correlationId?: string;
  },
  source: {
    locationId: string;
    startAt: string;
    preferenceCount: number;
  },
): void => {
  trackEvent("event_assisted_create_result", {
    eventId: props.eventId,
    prId: payload.prId,
    activityType: resolveFormModeActivityType(),
    locationId: source.locationId,
    locationType: resolveFormModeLocationType(source.locationId),
    startAt: source.startAt,
    timeType: resolveFormModeTimeType(source.startAt),
    preferenceCount: source.preferenceCount,
    actionResult: payload.actionResult,
    failureCode: payload.failureCode,
    failureReason: payload.failureReason,
    correlationId: payload.correlationId,
  });
  trackEvent("pr_commitment_result", {
    ...buildFormFunnelPayload(),
    commitmentType: "create",
    prId: payload.prId,
    entrySurface: "form_mode",
    actionResult: payload.actionResult,
    failureCode: payload.failureCode,
    failureReason: payload.failureReason,
    correlationId: payload.correlationId,
  });
};

type EventAssistedCreateTrigger = "manual_fallback" | "auto_no_candidates";

const buildEventAssistedCreateTarget = (
  canonicalPath: string,
  trigger: EventAssistedCreateTrigger,
): string => {
  const query = new URLSearchParams({
    entry: "create",
    fromEvent: props.eventId.toString(),
  });
  if (trigger === "auto_no_candidates") {
    query.set("handoff", "event_assisted_create");
  }
  return `${canonicalPath}?${query.toString()}`;
};

const createEventAssistedPR = async (
  trigger: EventAssistedCreateTrigger,
): Promise<boolean> => {
  if (!canUserCreatePR.value) {
    return false;
  }

  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !isValidFormModeDateTime(startAt)) {
    return false;
  }

  const fields = buildCreateFields();
  if (!fields) {
    if (trigger === "auto_no_candidates") {
      selectionErrorMessage.value = t(
        "anchorEvent.createCard.errors.createFailed",
      );
    }
    return false;
  }

  const correlationId = createCommandCorrelationId();
  if (trigger === "manual_fallback") {
    trackEvent("anchor_event_form_create_fallback_click", {
      eventId: props.eventId,
      activityType: resolveFormModeActivityType(),
      locationId,
      startAt,
      preferenceCount: selectedPreferences.value.length,
      correlationId,
    });
  }

  const createTelemetrySource = {
    locationId,
    startAt,
    preferenceCount: selectedPreferences.value.length,
  };
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (selectedConditionPayload) {
    trackEvent("anchor_event_assisted_create_started", {
      ...selectedConditionPayload,
      trigger,
      correlationId,
    });
  }

  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      fields,
      correlationId,
      handoff:
        trigger === "auto_no_candidates" ? "event_assisted_create" : undefined,
    });

    trackEventAssistedCreateResult(
      {
        actionResult: "success",
        prId: created.id,
        correlationId,
      },
      createTelemetrySource,
    );
    trackEvent("pr_entry_reached", {
      ...buildFormFunnelPayload(),
      prId: created.id,
      entrySurface: "form_mode",
      entryType: "create_handoff",
      correlationId,
    });
    await router.push(
      buildEventAssistedCreateTarget(created.canonicalPath, trigger),
    );
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
          correlationId,
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
        correlationId,
      },
      createTelemetrySource,
    );
    if (trigger === "auto_no_candidates") {
      selectionErrorMessage.value =
        error instanceof Error
          ? error.message
          : t("anchorEvent.createCard.errors.createFailed");
    }
    return false;
  }
};

const handleSubmitRecommendation = async (originRect: LongPressOriginRect) => {
  const locationId = selectedLocationId.value;
  const startAt = selectedStartAt.value;
  if (!locationId || !isValidFormModeDateTime(startAt)) {
    return;
  }

  trackFormStarted("primary_cta");
  returnToSelection();
  const splashFill = startJoinSplash(originRect);
  const recommendationCorrelationId = createCommandCorrelationId();
  const selectedConditionPayload = buildSelectedConditionPayload();
  if (selectedConditionPayload) {
    trackEvent("anchor_event_recommendation_requested", {
      ...selectedConditionPayload,
      correlationId: recommendationCorrelationId,
    });
  }

  try {
    const result = await recommendationMutation.mutateAsync({
      eventId: props.eventId,
      locationId,
      startAt,
      preferences: [...selectedPreferences.value],
      correlationId: recommendationCorrelationId,
    });
    trackRecommendationExposure(result);

    const matchedPRId = result.matchedRecommendation?.pr.id ?? null;
    trackRecommendationResult({
      actionResult: "success",
      outcome: matchedPRId === null ? "no_match" : "matched",
      matchedPrId: matchedPRId,
      candidateCount:
        result.orderedCandidates.length + (matchedPRId === null ? 0 : 1),
      correlationId: recommendationCorrelationId,
    });

    if (matchedPRId !== null) {
      trackEvent("anchor_event_candidate_engaged", {
        ...buildFormFunnelPayload(),
        action: "detail",
        targetPrId: matchedPRId,
        candidateRank: 1,
        entrySurface: "form_mode_matched",
        correlationId: recommendationCorrelationId,
      });
      trackEvent("pr_entry_reached", {
        ...buildFormFunnelPayload(),
        prId: matchedPRId,
        entrySurface: "form_mode_matched",
        entryType: "detail",
        candidateRank: 1,
        correlationId: recommendationCorrelationId,
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

      const createStarted = await createEventAssistedPR("auto_no_candidates");
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
        correlationId: recommendationCorrelationId,
      },
    );
    await splashFill;
    await drainJoinSplash();
  }
};

const resolveSelectedTimeWindow = (): [string | null, string | null] => {
  if (!isValidFormModeDateTime(selectedStartAt.value)) {
    return [null, null];
  }

  const defaultOption = formModeData.value?.startOptions.find(
    (option) => option.startAt === selectedStartAt.value,
  );
  if (defaultOption) {
    return [defaultOption.startAt, defaultOption.endAt];
  }

  const durationMinutes = formModeData.value?.event.durationMinutes ?? null;
  if (durationMinutes === null) {
    return [selectedStartAt.value, null];
  }

  const endAt = new Date(
    new Date(selectedStartAt.value).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
  return [selectedStartAt.value, endAt];
};

const buildCreateFields = (): PartnerRequestFields | null => {
  const timeWindow = resolveSelectedTimeWindow();
  if (!selectedLocationId.value || !timeWindow[0] || !timeWindow[1]) {
    return null;
  }
  if (!formModeData.value) {
    return null;
  }

  return {
    title: undefined,
    type: formModeData.value.event.type,
    time: timeWindow,
    location: selectedLocationId.value,
    route: null,
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
          locationId: pending.fields.location,
          startAt: pendingStartAt,
          preferenceCount: pending.fields.preferences.length,
        }
      : null;
  const correlationId = createCommandCorrelationId();
  try {
    const created = await createMutation.mutateAsync({
      eventId: props.eventId,
      handoff: pending.handoff,
      correlationId,
      fields: {
        title: undefined,
        type: pending.fields.type,
        time: pending.fields.time,
        location: pending.fields.location,
        route: null,
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
          correlationId,
        },
        pendingCreateTelemetrySource,
      );
    }
    await router.push(
      buildEventAssistedCreateTarget(
        created.canonicalPath,
        pending.handoff === "event_assisted_create"
          ? "auto_no_candidates"
          : "manual_fallback",
      ),
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
          correlationId,
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
.form-mode-selection {
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

.form-mode-selection {
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
  @include mx.pu-font(body-small);
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
