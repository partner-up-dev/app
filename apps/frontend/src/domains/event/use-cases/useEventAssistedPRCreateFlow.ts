import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";

type EventAssistedPRCreateInput = {
  targetTimeWindow: TimeWindow | null;
  locationId: string | null;
  entrySurface?: "form_mode" | "card_rich" | "list_mode";
};

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
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

export const useEventAssistedPRCreateFlow = (
  event: Ref<AnchorEventDetailResponse | null>,
) => {
  const router = useRouter();
  const { t } = useI18n();
  const createEventAssistedPRMutation = useCreateEventAssistedPR();
  const replayErrorMessage = ref<string | null>(null);
  const pendingCreateReplayRunning = ref(false);

  const isCreatePending = computed(
    () => createEventAssistedPRMutation.isPending.value,
  );
  const canUserCreatePR = computed(() => event.value?.canUserCreatePR === true);

  const createActionErrorMessage = computed(() => {
    const createAnchorError = createEventAssistedPRMutation.error
      .value as CreateEventAssistedPRError | null;
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

  const buildEventAssistedFields = ({
    targetTimeWindow,
    locationId,
  }: EventAssistedPRCreateInput): PartnerRequestFields => {
    const currentEvent = event.value;
    if (!currentEvent) {
      throw new Error(t("common.operationFailed"));
    }

    const normalizedLocation = locationId?.trim() ?? "";
    if (!targetTimeWindow || normalizedLocation.length === 0) {
      throw new Error(t("common.operationFailed"));
    }

    return {
      title: undefined,
      type: currentEvent.type,
      time: targetTimeWindow,
      location: normalizedLocation,
      route: null,
      minPartners: currentEvent.defaultMinPartners ?? 2,
      maxPartners: currentEvent.defaultMaxPartners ?? null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
      meetingPoint: null,
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

  const resolveLocationType = (
    eventValue: AnchorEventDetailResponse,
    locationId: string,
  ): "preset" | "user_submitted" =>
    eventValue.createTimeWindows.some((timeWindow) =>
      timeWindow.locationOptions.some(
        (locationOption) => locationOption.locationId === locationId,
      ),
    )
      ? "preset"
      : "user_submitted";

  const resolveTimeType = (
    eventValue: AnchorEventDetailResponse,
    startAt: string,
  ): "preset" | "user_submitted" =>
    eventValue.createTimeWindows.some(
      (timeWindow) => timeWindow.timeWindow[0] === startAt,
    )
      ? "preset"
      : "user_submitted";

  const trackCreateResult = (
    eventValue: AnchorEventDetailResponse,
    source: {
      locationId: string;
      startAt: string;
      preferenceCount: number;
    },
    payload: {
      actionResult: "success" | "failure" | "blocked";
      failureCode?: string;
      failureReason?: string;
      prId?: number;
      correlationId?: string;
      entrySurface?: "form_mode" | "card_rich" | "list_mode";
    },
  ): void => {
    trackEvent("event_assisted_create_result", {
      eventId: eventValue.id,
      activityType: eventValue.type,
      prId: payload.prId,
      locationId: source.locationId,
      locationType: resolveLocationType(eventValue, source.locationId),
      startAt: source.startAt,
      timeType: resolveTimeType(eventValue, source.startAt),
      preferenceCount: source.preferenceCount,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
      correlationId: payload.correlationId,
    });
    trackEvent("pr_commitment_result", {
      eventId: eventValue.id,
      activityType: eventValue.type,
      commitmentType: "create",
      prId: payload.prId,
      entrySurface: payload.entrySurface,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
      correlationId: payload.correlationId,
    });
  };

  const createEventAssistedPR = async ({
    targetTimeWindow,
    locationId,
    entrySurface,
  }: EventAssistedPRCreateInput) => {
    createEventAssistedPRMutation.reset();
    replayErrorMessage.value = null;

    const currentEvent = event.value;
    if (!currentEvent || !canUserCreatePR.value) {
      return;
    }

    const fields = buildEventAssistedFields({
      targetTimeWindow,
      locationId,
    });
    const createTelemetrySource = {
      locationId: fields.location ?? "",
      startAt: fields.time[0] ?? "",
      preferenceCount: fields.preferences.length,
    };
    const correlationId = createCommandCorrelationId();

    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
        fields,
        correlationId,
      });
      trackCreateResult(currentEvent, createTelemetrySource, {
        actionResult: "success",
        prId: created.id,
        correlationId,
        entrySurface,
      });
      if (entrySurface) {
        trackEvent("pr_entry_reached", {
          eventId: currentEvent.id,
          activityType: currentEvent.type,
          prId: created.id,
          entrySurface,
          entryType: "create_handoff",
          correlationId,
        });
      }
      await router.push(
        buildEventAssistedCreateTarget(created.canonicalPath, currentEvent.id),
      );
    } catch (error) {
      if (isWeChatAuthBlockingError(error)) {
        trackCreateResult(
          currentEvent,
          createTelemetrySource,
          {
            ...resolveTelemetryFailurePayload(
              error,
              "EVENT_ASSISTED_CREATE_BLOCKED",
              t("anchorEvent.createCard.errors.wechatAuthRequired"),
            ),
            correlationId,
            entrySurface,
          },
        );
        return;
      }
      trackCreateResult(
        currentEvent,
        createTelemetrySource,
        {
          ...resolveTelemetryFailurePayload(
            error,
            "EVENT_ASSISTED_CREATE_FAILED",
            error instanceof Error
              ? error.message
              : t("anchorEvent.createCard.errors.createFailed"),
          ),
          correlationId,
          entrySurface,
        },
      );
      throw error;
    }
  };

  const attemptPendingCreateReplay = async () => {
    if (pendingCreateReplayRunning.value) {
      return;
    }
    const currentEvent = event.value;
    if (!currentEvent) {
      return;
    }

    const pending = readPendingWeChatAction();
    if (
      !pending ||
      pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
      pending.eventId !== currentEvent.id
    ) {
      return;
    }

    if (!canUserCreatePR.value) {
      clearPendingWeChatAction();
      return;
    }

    pendingCreateReplayRunning.value = true;
    replayErrorMessage.value = null;
    clearPendingWeChatAction();
    const pendingCreateTelemetrySource =
      typeof pending.fields.time[0] === "string"
        ? {
            locationId: pending.fields.location,
            startAt: pending.fields.time[0],
            preferenceCount: pending.fields.preferences.length,
          }
        : null;
    const correlationId = createCommandCorrelationId();
    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
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
        trackCreateResult(currentEvent, pendingCreateTelemetrySource, {
          actionResult: "success",
          prId: created.id,
          correlationId,
        });
      }
      await router.push(
        buildEventAssistedCreateTarget(
          created.canonicalPath,
          currentEvent.id,
          pending.handoff,
        ),
      );
    } catch (error) {
      if (pendingCreateTelemetrySource) {
        trackCreateResult(
          currentEvent,
          pendingCreateTelemetrySource,
          {
            ...resolveTelemetryFailurePayload(
              error,
              "EVENT_ASSISTED_CREATE_REPLAY_FAILED",
              error instanceof Error
                ? error.message
                : t("common.operationFailed"),
            ),
            correlationId,
          },
        );
      }
      if (!isWeChatAuthBlockingError(error)) {
        const apiError = error as ApiError;
        replayErrorMessage.value =
          apiError.message ?? t("common.operationFailed");
      }
    } finally {
      pendingCreateReplayRunning.value = false;
    }
  };

  watch(
    () => event.value?.id ?? null,
    () => {
      void attemptPendingCreateReplay();
    },
    { immediate: true },
  );

  onMounted(() => {
    void attemptPendingCreateReplay();
  });

  return {
    createEventAssistedPR,
    createActionErrorMessage,
    isCreatePending,
    replayErrorMessage,
  };
};
