import type { AdmissionCycleId, PartnerId } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { hasParticipationPolicy } from "../services/participation-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type NewPartnerNotificationContextInput = {
  prId: PRId;
  partnerId: PartnerId;
  joinedUserId: UserId;
  recipientUserId: UserId;
  admissionCycleId: AdmissionCycleId;
};

export type NewPartnerNotificationContext =
  | { state: "READY"; teamName: string }
  | {
      state: "SKIPPED";
      reason:
        | "PR_MISSING_OR_UNSUPPORTED"
        | "RECIPIENT_NOT_ACTIVE_PARTICIPANT"
        | "NEW_PARTNER_ADMISSION_SUPERSEDED";
    };

const resolveTeamName = (request: { id: PRId; title: string | null; type: string }): string =>
  request.title?.trim() || request.type.trim() || `PR#${request.id}`;

/**
 * PR-owned dispatch projection. The admission-cycle comparison fences delayed
 * source work after a reusable slot exits and later becomes active again.
 */
export const getNewPartnerNotificationContext = async (
  input: NewPartnerNotificationContextInput,
): Promise<NewPartnerNotificationContext> => {
  const [request, joinedPartner, recipientPartner] = await Promise.all([
    prRepo.findById(input.prId),
    partnerRepo.findById(input.partnerId),
    partnerRepo.findActiveByPrIdAndUserId(input.prId, input.recipientUserId),
  ]);
  if (!request || !hasParticipationPolicy(request)) {
    return { state: "SKIPPED", reason: "PR_MISSING_OR_UNSUPPORTED" };
  }
  if (!recipientPartner) {
    return { state: "SKIPPED", reason: "RECIPIENT_NOT_ACTIVE_PARTICIPANT" };
  }
  if (
    !joinedPartner ||
    joinedPartner.prId !== input.prId ||
    joinedPartner.userId !== input.joinedUserId ||
    !["JOINED", "CONFIRMED", "ATTENDED"].includes(joinedPartner.status) ||
    joinedPartner.admissionCycleId !== input.admissionCycleId
  ) {
    return { state: "SKIPPED", reason: "NEW_PARTNER_ADMISSION_SUPERSEDED" };
  }

  return { state: "READY", teamName: resolveTeamName(request) };
};
