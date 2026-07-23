import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type MeetingPointUpdatedNotificationContextInput = {
  prId: PRId;
  recipientUserId: UserId;
};

export type MeetingPointUpdatedNotificationContext =
  | { state: "READY" }
  | {
      state: "SKIPPED";
      reason: "PR_MISSING" | "RECIPIENT_NOT_ACTIVE_PARTICIPANT";
    };

/**
 * PR-owned dispatch projection for a committed meeting-point event. It checks
 * only current recipient relevance; immutable event description and timestamp
 * remain in the Notification task payload.
 */
export const getMeetingPointUpdatedNotificationContext = async (
  input: MeetingPointUpdatedNotificationContextInput,
): Promise<MeetingPointUpdatedNotificationContext> => {
  const [request, recipientPartner] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findActiveByPrIdAndUserId(input.prId, input.recipientUserId),
  ]);
  if (!request) {
    return { state: "SKIPPED", reason: "PR_MISSING" };
  }
  if (!recipientPartner) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" };
  }
  return { state: "READY" };
};
