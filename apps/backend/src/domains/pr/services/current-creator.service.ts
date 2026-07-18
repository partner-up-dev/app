import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type CurrentCreatorReconciliation = {
  previousCreatedBy: UserId | null;
  nextCreatedBy: UserId | null;
  changed: boolean;
};

export async function reconcileCurrentCreator(prId: PRId): Promise<CurrentCreatorReconciliation> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  // Legacy DRAFT rows are private residue; ordinary reconciliation must never
  // infer or claim an owner from participant slots.
  if (request.status === "DRAFT") {
    return {
      previousCreatedBy: request.createdBy ?? null,
      nextCreatedBy: request.createdBy ?? null,
      changed: false,
    };
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(prId);
  const currentCreatedBy = request.createdBy ?? null;
  const currentCreatorIsActive =
    currentCreatedBy !== null &&
    activeParticipants.some((participant) => participant.userId === currentCreatedBy);
  const nextCreatedBy = currentCreatorIsActive
    ? currentCreatedBy
    : (activeParticipants[0]?.userId ?? null);

  if (currentCreatedBy !== nextCreatedBy) {
    await prRepo.setCreatedBy(prId, nextCreatedBy);
  }

  return {
    previousCreatedBy: currentCreatedBy,
    nextCreatedBy,
    changed: currentCreatedBy !== nextCreatedBy,
  };
}
