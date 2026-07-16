import { type ComputedRef, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { PRDetailView } from "@/domains/pr/model/types";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type Viewer = PRDetailView["partnerSection"]["viewer"];
export type PRActionBlockedReason =
  | Viewer["joinBlockedReason"]
  | Viewer["waitlistBlockedReason"]
  | Viewer["confirmBlockedReason"]
  | Viewer["checkInBlockedReason"]
  | Viewer["exitBlockedReason"];

export const usePRActionCopy = (pr: ComputedRef<PRDetailView>) => {
  const { t } = useI18n();

  const releaseNoticeText = computed(() => {
    const releasedSlot = pr.value.partnerSection.viewer.releasedSlot ?? null;
    if (!releasedSlot) return null;
    if (releasedSlot.state === "EXITED") {
      return t("prPage.partnerSection.releaseNoticeExit");
    }
    const manualReason = releasedSlot.releaseReason?.trim() ?? "";
    if (manualReason.length > 0) {
      return `你的名额已由管理员手动释放。原因：${manualReason}`;
    }
    return t("prPage.partnerSection.releaseNoticeAuto");
  });

  const blockedReasonText = (reason: PRActionBlockedReason): string => {
    switch (reason) {
      case "FULL":
        return t("prPage.partnerSection.blockedFull");
      case "JOIN_LOCKED":
        return t("prPage.partnerSection.blockedJoinLocked");
      case "PR_TIME_WINDOW_STARTED":
        return t("prPage.partnerSection.blockedPRTimeWindowStarted");
      case "OUTSIDE_CONFIRM_WINDOW": {
        const notSet = t("prPage.partnerSection.notSet");
        return t("prPage.partnerSection.blockedConfirmWindow", {
          confirmStart:
            formatLocalDateTimeValue(
              pr.value.partnerSection.timeline?.confirmationStartAt ?? null,
            ) ?? notSet,
          confirmEnd:
            formatLocalDateTimeValue(pr.value.partnerSection.timeline?.confirmationEndAt ?? null) ??
            notSet,
        });
      }
      case "ALREADY_CONFIRMED":
        return t("prPage.partnerSection.blockedAlreadyConfirmed");
      case "ALREADY_JOINED":
        return t("prPage.partnerSection.joinedHint");
      case "ALREADY_WAITLISTED":
        return t("prPage.waitlistedNotice");
      case "NOT_JOINED":
        return t("prPage.partnerSection.blockedNotJoined");
      case "NOT_JOINABLE_STATUS":
        return t("prPage.partnerSection.blockedStatus");
      case "PARTICIPATION_FREQUENCY_LIMITED":
        return t("prPage.partnerSection.blockedParticipationFrequencyLimited");
      case "CHECKIN_NOT_OPEN":
        return t("prPage.partnerSection.blockedCheckIn");
      default:
        return "";
    }
  };

  const resolveConfirmTip = (): string => {
    const viewer = pr.value.partnerSection.viewer;
    const timeline = pr.value.partnerSection.timeline;
    if (viewer.confirmBlockedReason === "OUTSIDE_CONFIRM_WINDOW") {
      const confirmationStart = timeline?.confirmationStartAt ?? null;
      if (confirmationStart) {
        const startTime = Date.parse(confirmationStart);
        if (!Number.isNaN(startTime) && Date.now() < startTime) {
          return `确认将在 ${
            formatLocalDateTimeValue(confirmationStart) ?? confirmationStart
          } 开放`;
        }
      }
    }
    return blockedReasonText(viewer.confirmBlockedReason);
  };

  const resolveCheckInTip = (): string => {
    const viewer = pr.value.partnerSection.viewer;
    if (viewer.checkInBlockedReason === "CHECKIN_NOT_OPEN") {
      const startAt = pr.value.partnerSection.timeline?.startAt ?? null;
      if (startAt) {
        return `活动开始后可签到（${formatLocalDateTimeValue(startAt) ?? startAt}）`;
      }
    }
    return blockedReasonText(viewer.checkInBlockedReason);
  };

  return {
    releaseNoticeText,
    blockedReasonText,
    resolveConfirmTip,
    resolveCheckInTip,
  };
};
