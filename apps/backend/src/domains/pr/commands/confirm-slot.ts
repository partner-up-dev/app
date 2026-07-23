import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { resolveUserByOpenId } from "../../user";
import {
  hasEnabledConfirmationPolicy,
  isWithinConfirmationWindow,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function confirmSlot(id: PRId, openId: string): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const resolvedUser = await resolveUserByOpenId(openId);
  assertPRDraftAccess({
    request,
    actor: { userId: resolvedUser.id, roles: resolvedUser.role },
    operation: "participant-flow",
  });
  const refreshedRequest = await refreshTemporalStatus(request);
  if (!hasEnabledConfirmationPolicy(refreshedRequest)) {
    return throwHttpProblem({
      status: 400,
      detail: "Slot confirmation is not available for this partner request",
    });
  }
  const policy = resolveParticipationPolicy(refreshedRequest, refreshedRequest.time);
  if (!isWithinConfirmationWindow(policy)) {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot confirm - outside confirmation window",
    });
  }

  const user = resolvedUser;
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot) {
    return throwHttpProblem({ status: 400, detail: "Cannot confirm - partner is not joined" });
  }

  if (slot.status === "JOINED") {
    await partnerRepo.markConfirmed(slot.id);
    await userReliabilityRepo.applyDelta(user.id, { confirmed: 1 });
  }

  const latest = await prRepo.findById(refreshedRequest.id);
  if (!latest) {
    return throwHttpProblem({
      status: 500,
      detail: "Failed to refresh partner request after confirm",
    });
  }
  return toPublicPR(latest, user.id);
}
