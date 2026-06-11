import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type {
  PartnerRequestFields,
  PRAllowEditAfterReady,
} from "@partner-up-dev/backend";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import type { AnchorEventSelectedPlace } from "@/domains/event/model/place-options";
import type { TimeWindow } from "@/domains/event/model/time-window-view";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import {
  useMaterializeDummyPR,
  type MaterializeDummyPRError,
} from "@/domains/event/queries/useMaterializeDummyPR";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";

type EventAssistedPRCreateInput = {
  targetTimeWindow: TimeWindow | null;
  allowEditAfterReady?: PRAllowEditAfterReady | null;
  place: AnchorEventSelectedPlace | null;
  preferences?: readonly string[];
  entrySurface?: "form_mode" | "card_rich" | "list_mode";
};

type DummyPRMaterializeInput = Omit<
  EventAssistedPRCreateInput,
  "allowEditAfterReady" | "entrySurface"
> & {
  entrySurface?: "card_rich" | "list_mode";
};

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const PR_START_TIME_PASSED_CODE = "PR_START_TIME_PASSED";
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
  const materializeDummyPRMutation = useMaterializeDummyPR();
  const replayErrorMessage = ref<string | null>(null);
  const pendingCreateReplayRunning = ref(false);

  const isCreatePending = computed(
    () =>
      createEventAssistedPRMutation.isPending.value ||
      materializeDummyPRMutation.isPending.value,
  );
  const canUserCreatePR = computed(() => event.value?.canUserCreatePR === true);

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
        case PR_START_TIME_PASSED_CODE:
          return t("anchorEvent.createCard.errors.timeWindowAlreadyPassed");
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
    place,
    preferences,
  }: EventAssistedPRCreateInput): PartnerRequestFields => {
    const currentEvent = event.value;
    if (!currentEvent) {
      throw new Error(t("common.operationFailed"));
    }

    if (!targetTimeWindow || !place) {
      throw new Error(t("common.operationFailed"));
    }

    return {
      title: undefined,
      type: currentEvent.type,
      time: targetTimeWindow,
      location: place.kind === "location" ? place.locationId : null,
      route: place.kind === "route" ? place.route : null,
      minPartners: currentEvent.defaultMinPartners ?? 2,
      maxPartners: currentEvent.defaultMaxPartners ?? null,
      partners: [],
      budget: null,
      preferences: [...(preferences ?? [])],
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

  const buildEventDetailTarget = (
    canonicalPath: string,
    eventId: number,
  ): string => {
    const query = new URLSearchParams({
      fromEvent: eventId.toString(),
    });
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
      place: AnchorEventSelectedPlace;
      startAt: string;
      preferenceCount: number;
    },
    payload: {
      actionResult: "success" | "failure" | "blocked";
      failureCode?: string;
      failureReason?: string;
      prId?: number;
      entrySurface?: "form_mode" | "card_rich" | "list_mode";
    },
  ): void => {
    trackEvent("event_assisted_create_result", {
      eventId: eventValue.id,
      activityType: eventValue.type,
      prId: payload.prId,
      locationId:
        source.place.kind === "location" ? source.place.locationId : null,
      placeKind: source.place.kind,
      locationType:
        source.place.kind === "location"
          ? resolveLocationType(eventValue, source.place.locationId)
          : undefined,
      startAt: source.startAt,
      timeType: resolveTimeType(eventValue, source.startAt),
      preferenceCount: source.preferenceCount,
      actionResult: payload.actionResult,
      failureCode: payload.failureCode,
      failureReason: payload.failureReason,
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
    });
  };

  const createEventAssistedPR = async ({
    targetTimeWindow,
    allowEditAfterReady,
    place,
    preferences,
    entrySurface,
  }: EventAssistedPRCreateInput) => {
    createEventAssistedPRMutation.reset();
    replayErrorMessage.value = null;

    const currentEvent = event.value;
    if (!currentEvent || !canUserCreatePR.value) {
      return;
    }
    if (!place) {
      return;
    }

    const fields = buildEventAssistedFields({
      targetTimeWindow,
      place,
      preferences: preferences ?? [],
    });
    const createTelemetrySource = {
      place,
      startAt: fields.time[0] ?? "",
      preferenceCount: fields.preferences.length,
    };
    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
        fields,
        allowEditAfterReady: allowEditAfterReady ?? null,
      });
      trackCreateResult(currentEvent, createTelemetrySource, {
        actionResult: "success",
        prId: created.id,
        entrySurface,
      });
      if (entrySurface) {
        trackEvent("pr_entry_reached", {
          eventId: currentEvent.id,
          activityType: currentEvent.type,
          prId: created.id,
          entrySurface,
          entryType: "create_handoff",
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
          entrySurface,
        },
      );
      throw error;
    }
  };

  const materializeDummyPR = async ({
    targetTimeWindow,
    place,
    preferences,
    entrySurface,
  }: DummyPRMaterializeInput) => {
    materializeDummyPRMutation.reset();
    replayErrorMessage.value = null;

    const currentEvent = event.value;
    if (!currentEvent || !canUserCreatePR.value) {
      return;
    }
    if (!targetTimeWindow || !place) {
      return;
    }

    const materializeTelemetrySource = {
      place,
      startAt: targetTimeWindow[0] ?? "",
      preferenceCount: preferences?.length ?? 0,
    };
    try {
      const created = await materializeDummyPRMutation.mutateAsync({
        eventId: currentEvent.id,
        timeWindow: targetTimeWindow,
        place,
        preferences: preferences ?? [],
      });
      trackEvent("anchor_event_dummy_pr_materialization_result", {
        eventId: currentEvent.id,
        activityType: currentEvent.type,
        locationType:
          place.kind === "location"
            ? resolveLocationType(currentEvent, place.locationId)
            : "route_pool",
        timeType: resolveTimeType(currentEvent, materializeTelemetrySource.startAt),
        preferenceCount: materializeTelemetrySource.preferenceCount,
        prId: created.id,
        entrySurface,
        actionResult: "success",
        materialization: created.materialization,
      });
      if (entrySurface) {
        trackEvent("pr_entry_reached", {
          eventId: currentEvent.id,
          activityType: currentEvent.type,
          prId: created.id,
          entrySurface,
          entryType: "detail",
        });
      }
      await router.push(buildEventDetailTarget(created.canonicalPath, currentEvent.id));
    } catch (error) {
      trackEvent("anchor_event_dummy_pr_materialization_result", {
        eventId: currentEvent.id,
        activityType: currentEvent.type,
        locationType:
          place.kind === "location"
            ? resolveLocationType(currentEvent, place.locationId)
            : "route_pool",
        timeType: resolveTimeType(currentEvent, materializeTelemetrySource.startAt),
        preferenceCount: materializeTelemetrySource.preferenceCount,
        entrySurface,
        ...resolveTelemetryFailurePayload(
          error,
          "ANCHOR_EVENT_DUMMY_PR_MATERIALIZATION_FAILED",
          error instanceof Error
            ? error.message
            : t("anchorEvent.createCard.errors.createFailed"),
        ),
      });
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
            startAt: pending.fields.time[0],
            preferenceCount: pending.fields.preferences.length,
          }
        : null;
    try {
      const created = await createEventAssistedPRMutation.mutateAsync({
        eventId: currentEvent.id,
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
        trackCreateResult(currentEvent, pendingCreateTelemetrySource, {
          actionResult: "success",
          prId: created.id,
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
    materializeDummyPR,
    createActionErrorMessage,
    isCreatePending,
    replayErrorMessage,
  };
};
