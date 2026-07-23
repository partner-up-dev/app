import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { resolveUserByOpenId } from "../../user";
import { hasParticipationPolicy } from "../services/participation-policy.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { hasPRTimeWindowStarted } from "../services/time-window.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function checkIn(id: PRId, openId: string): Promise<PublicPR> {
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
  if (!hasParticipationPolicy(refreshedRequest)) {
    return throwHttpProblem({
      status: 400,
      detail: "Check-in is not available for this partner request",
    });
  }

  if (!hasPRTimeWindowStarted(refreshedRequest.time)) {
    return throwHttpProblem({ status: 400, detail: "Cannot check in before the PR starts" });
  }

  const user = resolvedUser;
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot) {
    return throwHttpProblem({ status: 400, detail: "Cannot check in - partner is not joined" });
  }

  const updatedSlot = await partnerRepo.reportCheckIn(slot.id);
  if (!updatedSlot) {
    return throwHttpProblem({ status: 500, detail: "Failed to submit check-in" });
  }
  if (slot.status !== "ATTENDED") {
    await userReliabilityRepo.applyDelta(user.id, { attended: 1 });
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({
      status: 500,
      detail: "Failed to refresh partner request after check-in",
    });
  }
  return toPublicPR(latest, user.id);
}
