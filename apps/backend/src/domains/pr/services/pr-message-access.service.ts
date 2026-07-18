import { throwHttpProblem } from "../../../lib/problem-details";
import type { Partner } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { assertPRDraftAccess, type PRDraftActor } from "./draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type PRMessageParticipantAccess = {
  request: PartnerRequest;
  participant: Partner;
};

export async function requirePRMessageParticipantAccess(
  prId: PRId,
  userId: UserId,
  actor: PRDraftActor = { userId, roles: ["anonymous"] },
): Promise<PRMessageParticipantAccess> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({ request, actor, operation: "participant-flow" });

  const participant = await partnerRepo.findActiveByPrIdAndUserId(prId, userId);
  if (!participant) {
    return throwHttpProblem({
      status: 403,
      detail: "Only current active participants can access PR messages",
    });
  }

  return {
    request,
    participant,
  };
}
