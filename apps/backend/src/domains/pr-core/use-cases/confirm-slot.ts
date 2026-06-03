import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../../user";
import {
  hasAnchorParticipationPolicy,
  hasEnabledConfirmationPolicy,
  isWithinConfirmationWindow,
  resolveAnchorParticipationPolicy,
} from "../services/anchor-participation-policy.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function confirmSlot(id: PRId, openId: string): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  if (!hasEnabledConfirmationPolicy(refreshedRequest)) {
    return throwHttpProblem({ status: 400, detail: "Slot confirmation is not available for this partner request" });
  }
  const policy = resolveAnchorParticipationPolicy(
    refreshedRequest,
    refreshedRequest.time,
  );
  if (!isWithinConfirmationWindow(policy)) {
    return throwHttpProblem({ status: 400, detail: "Cannot confirm - outside confirmation window" });
  }

  const user = await resolveUserByOpenId(openId);
  const slot = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (!slot) {
    return throwHttpProblem({ status: 400, detail: "Cannot confirm - partner is not joined" });
  }

  if (slot.status === "JOINED") {
    await partnerRepo.markConfirmed(slot.id);
    await userReliabilityRepo.applyDelta(user.id, { confirmed: 1 });

    operationLogService.log({
      actorId: user.id,
      action: "partner.confirm",
      aggregateType: "partner_request",
      aggregateId: String(id),
      detail: { partnerId: slot.id },
    });
  }

  const latest = await prRepo.findById(refreshedRequest.id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to refresh partner request after confirm" });
  }
  return toPublicPR(latest, user.id);
}
