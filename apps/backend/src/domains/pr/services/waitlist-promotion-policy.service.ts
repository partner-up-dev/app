import type { PartnerStatus } from "../../../entities/partner";
import type { PartnerRequest } from "../../../entities/partner-request";
import {
  hasEnabledConfirmationPolicy,
  hasParticipationPolicy,
  isJoinLockedByPolicy,
  isWithinConfirmationWindow,
  resolveParticipationPolicy,
} from "./participation-policy.service";

export const isWaitlistPromotionAllowed = (request: PartnerRequest): boolean => {
  if (request.status !== "OPEN") {
    return false;
  }
  if (!hasParticipationPolicy(request)) {
    return true;
  }
  return !isJoinLockedByPolicy(resolveParticipationPolicy(request, request.time));
};

export const resolveWaitlistPromotionStatus = (
  request: PartnerRequest,
): Extract<PartnerStatus, "JOINED" | "CONFIRMED"> => {
  if (!hasParticipationPolicy(request) || !hasEnabledConfirmationPolicy(request)) {
    return "JOINED";
  }
  return isWithinConfirmationWindow(resolveParticipationPolicy(request, request.time))
    ? "CONFIRMED"
    : "JOINED";
};
