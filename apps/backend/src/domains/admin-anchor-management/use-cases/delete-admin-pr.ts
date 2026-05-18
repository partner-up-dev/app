import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId, UserId } from "../../../entities";
import { operationLogService } from "../../../infra/operation-log";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

export async function deleteAdminPR(input: {
  prId: PRId;
  actorUserId: UserId | null;
}) {
  const existing = await prRepo.findById(input.prId);
  if (!existing) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }

  const partnerCount = await partnerRepo.countTotalByPrId(input.prId);

  const deleted = await prRepo.deleteById(input.prId);
  if (!deleted) {
    return throwHttpProblem({ status: 500, detail: "Failed to delete PR" });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      title: existing.title,
      type: existing.type,
      location: existing.location,
      status: existing.status,
      partnerCount,
    },
  });

  return {
    ok: true as const,
    prId: input.prId,
    deletedPartnerCount: partnerCount,
  };
}
