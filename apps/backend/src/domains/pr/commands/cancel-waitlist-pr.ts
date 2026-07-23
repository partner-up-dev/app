import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { resetPRJoinGateResolutionsForUser } from "../services/join-gates.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function cancelWaitlistPRByUserId(
  id: PRId,
  userId: UserId,
  actor: PRDraftActor = { userId, roles: ["anonymous"] },
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  assertPRDraftAccess({ request, actor, operation: "participant-flow" });

  await refreshTemporalStatus(request);

  const pendingSlot = await partnerRepo.findPendingByPrIdAndUserId(id, userId);
  if (!pendingSlot) {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot cancel waitlist - partner is not waitlisted",
    });
  }

  const cancelledSlot = await partnerRepo.cancelPendingSlot(pendingSlot.id);
  if (!cancelledSlot) {
    return throwHttpProblem({
      status: 409,
      detail: "Cannot cancel waitlist - slot is no longer pending",
    });
  }

  await resetPRJoinGateResolutionsForUser({
    prId: id,
    userId,
    partnerId: pendingSlot.id,
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  return toPublicPR(latest, userId);
}
