import { throwHttpProblem } from "../../../lib/problem-details";

/**
 * Slot management service — handles partner slot CRUD, capacity sync,
 * bounds validation, and status recalculation.
 */

import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { derivePRStatusFromPartnerCount, shouldRecalculatePRCapacityStatus } from "./status-rules";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

// ---------------------------------------------------------------------------
// Slot lifecycle
// ---------------------------------------------------------------------------

export async function initializeSlotsForPR(
  prId: PRId,
  creatorUserId: UserId | null,
): Promise<void> {
  if (creatorUserId) {
    await partnerRepo.createSlot({
      prId,
      userId: creatorUserId,
      status: "JOINED",
    });
  }
}

export async function syncSlotCapacity(prId: PRId, maxPartners: number | null): Promise<void> {
  if (maxPartners === null) return;
  const activeCount = await countActivePartnersForPR(prId);
  if (activeCount > maxPartners) {
    return throwHttpProblem({
      status: 400,
      detail: "Invalid partner bounds - maxPartners cannot be smaller than active participants",
    });
  }
}

// ---------------------------------------------------------------------------
// Status recalculation
// ---------------------------------------------------------------------------

export async function countActivePartnersForPR(prId: PRId): Promise<number> {
  return partnerRepo.countActiveByPrId(prId);
}

export async function listActiveParticipantSummariesForPR(prId: PRId) {
  return partnerRepo.listActiveParticipantSummariesByPrId(prId);
}

export async function recalculatePRStatus(prId: PRId): Promise<void> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const activeCount = await countActivePartnersForPR(prId);
  const nextStatus = derivePRStatusFromPartnerCount(
    activeCount,
    request.minPartners,
    request.maxPartners,
  );
  if (
    shouldRecalculatePRCapacityStatus(request.status as string) &&
    request.status !== nextStatus
  ) {
    await prRepo.updateStatus(prId, nextStatus);
  }
}
