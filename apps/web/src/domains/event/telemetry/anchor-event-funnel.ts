import type { AnchorEventLandingMode } from "@/domains/event/model/anchorEventLandingModeStorage";

export type AnchorEventFunnelContext = {
  eventId: number;
  assignedMode?: AnchorEventLandingMode;
  renderedMode: AnchorEventLandingMode;
  assignmentRevision?: string;
  isTimeoutFallback?: boolean;
  activityType?: string;
};

export const buildAnchorEventFunnelPayload = (
  context: AnchorEventFunnelContext,
) => ({
  eventId: context.eventId,
  activityType: context.activityType,
  assignedMode: context.assignedMode,
  renderedMode: context.renderedMode,
  assignmentRevision: context.assignmentRevision,
  isTimeoutFallback: context.isTimeoutFallback,
});
