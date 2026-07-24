/**
 * PR status derivation rules — pure functions.
 *
 * Encapsulates the state-machine transitions and guard conditions
 * for PartnerRequest status.
 */

import type { PRStatus } from "../contracts/partner-request";
import type { TimeWindow } from "./time-window.service";
import { isWithinActiveWindow } from "./time-window.service";

// ---------------------------------------------------------------------------
// Status predicates
// ---------------------------------------------------------------------------

/** Statuses that allow a partner to join directly. */
export function isPRJoinableStatus(status: string): boolean {
  return status === "OPEN";
}

/** Statuses that allow a partner to exit. */
export function isPRExitAllowedStatus(status: string): boolean {
  return status === "OPEN";
}

/** Statuses where partner count changes recompute the status. */
export function shouldRecalculatePRCapacityStatus(status: string): boolean {
  return status === "OPEN";
}

/** Statuses eligible for automatic activation. */
export function isPRActivatableStatus(status: string): boolean {
  return status === "OPEN" || status === "READY";
}

/** Statuses where PR-attached ordering is allowed. */
export function isPROrderAttachableStatus(status: string): boolean {
  return status === "READY" || status === "ACTIVE";
}

/** Statuses eligible for close-time finalization. */
export function isPRExpirableStatus(status: string): boolean {
  return status === "OPEN" || status === "READY" || status === "ACTIVE";
}

// ---------------------------------------------------------------------------
// Derive next status from partner count
// ---------------------------------------------------------------------------

export function derivePRStatusFromPartnerCount(
  partnerCount: number,
  minPartners: number | null,
  maxPartners: number | null,
): PRStatus {
  void partnerCount;
  void minPartners;
  void maxPartners;
  return "OPEN";
}

// ---------------------------------------------------------------------------
// Public (view-layer) status
// ---------------------------------------------------------------------------

/**
 * Converts internal DB status to the public status seen by clients.
 * OPEN / READY within the active window are presented as ACTIVE.
 */
export function toPublicPRStatus(rawStatus: string, timeWindow: TimeWindow): PRStatus {
  if ((rawStatus === "OPEN" || rawStatus === "READY") && isWithinActiveWindow(timeWindow)) {
    return "ACTIVE";
  }

  if (
    rawStatus === "DRAFT" ||
    rawStatus === "OPEN" ||
    rawStatus === "READY" ||
    rawStatus === "ACTIVE" ||
    rawStatus === "CLOSED" ||
    rawStatus === "EXPIRED"
  ) {
    return rawStatus;
  }

  return "OPEN";
}
