import { throwHttpProblem } from "../../../lib/problem-details";
import { db } from "../../../lib/db";

/**
 * Slot management service — handles partner slot CRUD, capacity sync,
 * bounds validation, and status recalculation.
 */

import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { derivePRStatusFromPartnerCount, shouldRecalculatePRCapacityStatus } from "./status-rules";

const partnerRepo = new PartnerRepository();

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

export async function syncSlotCapacity(
  prId: PRId,
  maxPartners: number | null,
  executor: RepositoryExecutor = db,
): Promise<void> {
  if (maxPartners === null) return;
  const activeCount = await new PartnerRepository(executor).countActiveByPrId(prId);
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

export async function recalculatePRStatus(
  prId: PRId,
  executor: RepositoryExecutor = db,
): Promise<void> {
  const scopedPartnerRepo = new PartnerRepository(executor);
  const scopedPrRepo = new PartnerRequestRepository(executor);
  const request = await scopedPrRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const activeCount = await scopedPartnerRepo.countActiveByPrId(prId);
  const nextStatus = derivePRStatusFromPartnerCount(
    activeCount,
    request.minPartners,
    request.maxPartners,
  );
  if (
    shouldRecalculatePRCapacityStatus(request.status as string) &&
    request.status !== nextStatus
  ) {
    await scopedPrRepo.updateStatus(prId, nextStatus);
  }
}
