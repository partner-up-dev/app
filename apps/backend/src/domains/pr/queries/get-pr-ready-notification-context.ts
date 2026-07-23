import type { PRId, PRReadyCycleId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type PRReadyNotificationContextInput = {
  prId: PRId;
  recipientUserId: UserId;
  readyCycleId: PRReadyCycleId;
};

export type PRReadyNotificationContext =
  | { state: "READY"; title: string; type: string }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "PR_NOT_READY"
        | "PR_READY_CYCLE_SUPERSEDED";
    };

const resolveTitle = (request: { title: string | null; type: string }): string =>
  request.title?.trim() || `${request.type}搭子`;

const resolveType = (request: { type: string }): string => request.type.trim() || "搭子活动";

/**
 * PR-owned dispatch projection for a previously committed READY cycle. The
 * exact cycle comparison prevents an old task from reviving after re-entry.
 */
export const getPRReadyNotificationContext = async (
  input: PRReadyNotificationContextInput,
): Promise<PRReadyNotificationContext> => {
  const [request, recipientPartner] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findActiveByPrIdAndUserId(input.prId, input.recipientUserId),
  ]);
  if (!request) {
    return { state: "SKIPPED", reason: "PR_MISSING" };
  }
  if (request.status !== "READY" && request.status !== "ACTIVE") {
    return { state: "SKIPPED", reason: "PR_NOT_READY" };
  }
  if (request.readyCycleId !== input.readyCycleId) {
    return { state: "SKIPPED", reason: "PR_READY_CYCLE_SUPERSEDED" };
  }
  if (!recipientPartner) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" };
  }
  return {
    state: "READY",
    title: resolveTitle(request),
    type: resolveType(request),
  };
};
