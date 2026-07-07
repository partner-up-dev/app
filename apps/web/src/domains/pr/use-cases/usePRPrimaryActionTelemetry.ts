import { ref, watch, type ComputedRef } from "vue";
import type { PRDetailView } from "@/domains/pr/model/types";
import { trackEvent } from "@/shared/telemetry/track";

export type PRPrimaryCtaType = "JOIN" | "WAITLIST" | "CONFIRM_SLOT" | "CHECK_IN";

type PRPrimaryViewerState =
  | "CREATOR"
  | "PARTICIPANT"
  | "VISITOR_JOINABLE"
  | "VISITOR_WAITLISTABLE"
  | "VISITOR_WAITLISTED"
  | "VISITOR_BLOCKED";

const resolveViewerState = (pr: PRDetailView): PRPrimaryViewerState => {
  const viewer = pr.partnerSection.viewer;
  if (viewer.isParticipant) return "PARTICIPANT";
  if (viewer.isCreator) return "CREATOR";
  if (viewer.isWaitlisted) return "VISITOR_WAITLISTED";
  if (viewer.canWaitlist) return "VISITOR_WAITLISTABLE";
  return viewer.canJoin ? "VISITOR_JOINABLE" : "VISITOR_BLOCKED";
};

const supportsEventContextTelemetry = (pr: PRDetailView): boolean =>
  pr.partnerSection.reminder.supported;

export const trackPRPrimaryActionClick = (
  pr: PRDetailView,
  ctaType: PRPrimaryCtaType,
): void => {
  if (!supportsEventContextTelemetry(pr)) return;
  trackEvent("pr_primary_cta_click", {
    prId: pr.id,
    ctaType,
    viewerState: resolveViewerState(pr),
  });
};

export const usePRPrimaryActionImpression = ({
  pr,
  ctaType,
  visible,
}: {
  pr: ComputedRef<PRDetailView>;
  ctaType: ComputedRef<PRPrimaryCtaType | null>;
  visible: ComputedRef<boolean>;
}) => {
  const lastPrimaryImpressionKey = ref("");

  watch(
    () =>
      [
        pr.value.id,
        ctaType.value,
        resolveViewerState(pr.value),
        visible.value,
        supportsEventContextTelemetry(pr.value),
      ] as const,
    ([prId, nextCtaType, viewerState, isVisible, telemetryEnabled]) => {
      if (!isVisible || !telemetryEnabled || nextCtaType === null) return;
      const impressionKey = `${prId}:${nextCtaType}:${viewerState}`;
      if (lastPrimaryImpressionKey.value === impressionKey) return;
      lastPrimaryImpressionKey.value = impressionKey;
      trackEvent("pr_primary_cta_impression", {
        prId,
        ctaType: nextCtaType,
        viewerState,
      });
    },
    { immediate: true },
  );
};
