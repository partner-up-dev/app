import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { isPROrderAttachableStatus } from "../services/status-rules";

const requestRepository = new PartnerRequestRepository();

export type PROrderAttachmentEligibility =
  | { outcome: "ELIGIBLE" }
  | { outcome: "PR_NOT_FOUND" }
  | { outcome: "PR_NOT_READY" }
  | { outcome: "PR_ORDER_CREATOR_REQUIRED" };

export const getPROrderAttachmentEligibility = async (input: {
  prId: PRId;
  actorUserId: UserId | null;
}): Promise<PROrderAttachmentEligibility> => {
  const request = await requestRepository.findById(input.prId);
  if (!request) {
    return { outcome: "PR_NOT_FOUND" };
  }

  if (!isPROrderAttachableStatus(request.status)) {
    return { outcome: "PR_NOT_READY" };
  }

  if (!input.actorUserId || request.createdBy !== input.actorUserId) {
    return { outcome: "PR_ORDER_CREATOR_REQUIRED" };
  }

  return { outcome: "ELIGIBLE" };
};
