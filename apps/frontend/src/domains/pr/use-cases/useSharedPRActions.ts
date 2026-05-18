import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/telemetry/track";
import { resolveTelemetryFailurePayload } from "@/shared/telemetry/result";
import { createCommandCorrelationId } from "@/shared/telemetry/correlation";
import { useExitPR, useJoinPR } from "@/domains/pr/queries/usePRActions";
import type { ApiError } from "@/shared/api/error";

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
const AUTHENTICATED_REQUIRED_CODE = "AUTHENTICATED_REQUIRED";
const WECHAT_AUTH_REQUIRED_CODE = "WECHAT_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";

type UseSharedPRActionsOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
  isCreator: ComputedRef<boolean>;
  onActionSuccess?: () => void;
};

export const useSharedPRActions = ({
  id,
  pr,
  isCreator,
  onActionSuccess,
}: UseSharedPRActionsOptions) => {
  const { t } = useI18n();

  const joinMutation = useJoinPR();
  const exitMutation = useExitPR();

  const hasJoined = computed(
    () => pr.value?.partnerSection.viewer.isParticipant ?? false,
  );
  const analyticsPRContext = computed(() => ({
    scenarioType: pr.value?.core.type,
  }));

  const shortPartnerId = computed(() => {
    const idValue = pr.value?.core.myPartnerId;
    if (idValue === null || idValue === undefined) return "-";
    return String(idValue);
  });

  const canJoin = computed(
    () => pr.value?.partnerSection.viewer.canJoin ?? false,
  );
  const canExit = computed(
    () => pr.value?.partnerSection.viewer.canExit ?? false,
  );

  const showEditContentAction = computed(() => {
    const status = pr.value?.status;
    if (status === "DRAFT") {
      return true;
    }
    return Boolean(isCreator.value && status === "OPEN");
  });

  const showModifyStatusAction = computed(() => Boolean(isCreator.value));

  const slotStateText = computed(() =>
    resolveSlotStateText(pr.value?.partnerSection.viewer.slotState),
  );

  const joinPending = computed(() => joinMutation.isPending.value);
  const exitPending = computed(() => exitMutation.isPending.value);
  const joinErrorMessage = computed(() => {
    const error = joinMutation.error.value as ApiError | null;
    if (!error) return null;
    if (error.code === JOIN_TIME_WINDOW_CONFLICT_CODE) {
      return t("prPage.partnerSection.blockedTimeWindowConflict");
    }
    if (error.code === PR_JOIN_GATE_UNRESOLVED_CODE) {
      return "请先完成加入前置项";
    }
    if (
      error.code === AUTHENTICATED_REQUIRED_CODE ||
      error.code === WECHAT_AUTH_REQUIRED_CODE ||
      error.code === WECHAT_BIND_REQUIRED_CODE
    ) {
      return t("prPage.wechatLoginRequired");
    }
    return null;
  });
  const joinErrorCode = computed(() => {
    const error = joinMutation.error.value as ApiError | null;
    return error?.code ?? null;
  });

  const handleJoin = async () => {
    if (id.value === null) return;

    const correlationId = createCommandCorrelationId();
    try {
      const result = await joinMutation.mutateAsync({
        id: id.value,
        correlationId,
      });
      trackEvent("pr_join_result", {
        prId: id.value,
        ...analyticsPRContext.value,
        actionResult: "success",
        correlationId,
      });
      onActionSuccess?.();
      return result;
    } catch (error) {
      trackEvent("pr_join_result", {
        prId: id.value,
        ...analyticsPRContext.value,
        ...resolveTelemetryFailurePayload(
          error,
          "PR_JOIN_FAILED",
          t("errors.joinRequestFailed"),
        ),
        correlationId,
      });
      return null;
    }
  };

  const handleExit = async () => {
    if (id.value === null) return;

    const result = await exitMutation.mutateAsync({
      id: id.value,
    });
    trackEvent("pr_exit_success", {
      prId: id.value,
      ...analyticsPRContext.value,
    });
    onActionSuccess?.();
    return result;
  };

  return {
    canJoin,
    canExit,
    hasJoined,
    shortPartnerId,
    slotStateText,
    showEditContentAction,
    showModifyStatusAction,
    joinPending,
    exitPending,
    joinErrorMessage,
    joinErrorCode,
    handleJoin,
    handleExit,
  };

  function resolveSlotStateText(
    slotState:
      | PRDetailView["partnerSection"]["viewer"]["slotState"]
      | undefined,
  ): string {
    switch (slotState) {
      case "JOINED":
        return t("prPage.slotJoined", { partnerId: shortPartnerId.value });
      case "CONFIRMED":
        return t("prPage.slotConfirmed", { partnerId: shortPartnerId.value });
      case "ATTENDED":
        return t("prPage.slotAttended", { partnerId: shortPartnerId.value });
      case "PENDING":
        return t("prPage.slotPending");
      case "EXITED":
        return t("prPage.slotExited");
      case "RELEASED":
        return t("prPage.slotReleased");
      default:
        return t("prPage.slotNotJoined");
    }
  }
};
