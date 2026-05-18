/**
 * Temporal status refresh — shared helper for use-cases that need to
 * ensure a PR's status reflects the current time before proceeding.
 */

import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../repositories/UserReliabilityRepository";
import type { PartnerRequest } from "../../entities/partner-request";
import {
  getTimeWindowStart,
  getTimeWindowClose,
} from "./services/time-window.service";
import {
  hasAnchorParticipationPolicy,
  hasEnabledConfirmationPolicy,
  hasConfirmationWindowEnded,
  resolveAnchorParticipationPolicy,
} from "./services/anchor-participation-policy.service";
import {
  isActivatableStatus,
  isExpirableStatus,
} from "./services/status-rules";
import {
  listActiveParticipantSummariesForPR,
  recalculatePRStatus,
} from "./services/slot-management.service";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../infra/notifications";
import { operationLogService } from "../../infra/operation-log";
import { applyAnchorParticipantReleaseEffects } from "./services/anchor-participant-release-effects.service";
import { promoteWaitlistedPartners } from "./services/waitlist.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

/**
 * Refresh a PR's temporal state: release unconfirmed slots, activate if
 * within window, finalize if past window-close.
 */
export async function refreshTemporalStatus(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  await releaseUnconfirmedSlotsIfNeeded(request);
  const afterRelease = await prRepo.findById(request.id);
  const normalized = afterRelease ?? request;

  const activated = await activateIfNeeded(normalized);
  return expireIfNeeded(activated);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function activateIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isActivatableStatus(request.status as string)) return request;

  const windowStart = getTimeWindowStart(request.time);
  if (!windowStart) return request;

  const now = Date.now();
  if (windowStart.getTime() > now) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (windowClose && windowClose.getTime() <= now) return request;

  const updated = await prRepo.updateStatus(request.id, "ACTIVE");
  return updated ?? request;
}

async function expireIfNeeded(
  request: PartnerRequest,
): Promise<PartnerRequest> {
  if (!isExpirableStatus(request.status as string)) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (!windowClose) return request;
  if (windowClose.getTime() > Date.now()) return request;

  const slots = await partnerRepo.findByPrId(request.id);
  const activeCount = slots.filter(
    (slot) =>
      slot.status === "JOINED" ||
      slot.status === "CONFIRMED" ||
      slot.status === "ATTENDED",
  ).length;
  const minPartners = request.minPartners ?? 1;

  if (request.status === "ACTIVE" && activeCount >= minPartners) {
    const closed = await prRepo.updateStatus(request.id, "CLOSED");
    return closed ?? request;
  }

  if (activeCount >= minPartners) return request;

  const updated = await prRepo.updateStatus(request.id, "EXPIRED");
  return updated ?? request;
}

async function resolveReleaseTrigger(
  request: PartnerRequest,
): Promise<"confirmation_end" | null> {
  if (!hasEnabledConfirmationPolicy(request)) {
    return null;
  }
  const policy = resolveAnchorParticipationPolicy(request, request.time);
  if (!hasConfirmationWindowEnded(policy)) return null;
  return "confirmation_end";
}

async function releaseUnconfirmedSlotsIfNeeded(
  request: PartnerRequest,
): Promise<void> {
  const trigger = await resolveReleaseTrigger(request);
  if (!trigger) return;

  const participants = await listActiveParticipantSummariesForPR(request.id);
  const releasing = participants.filter((slot) => slot.status === "JOINED");
  if (releasing.length === 0) return;
  const releasedUserIds = releasing.map((slot) => slot.userId);

  for (const slot of releasing) {
    await userReliabilityRepo.applyDelta(slot.userId, { released: 1 });
    await cancelWeChatReminderJobsForParticipant(request.id, slot.userId);
    await cancelWeChatActivityStartReminderJobsForParticipant(
      request.id,
      slot.userId,
    );
    await partnerRepo.markReleased(slot.partnerId);

    operationLogService.log({
      actorId: slot.userId,
      action: "partner.auto_release_unconfirmed",
      aggregateType: "partner_request",
      aggregateId: String(request.id),
      detail: {
        partnerId: slot.partnerId,
        trigger,
      },
    });
  }

  await recalculatePRStatus(request.id);
  if (hasAnchorParticipationPolicy(request)) {
    await applyAnchorParticipantReleaseEffects({
      prId: request.id,
      releasedUserIds,
    });
  }
  await promoteWaitlistedPartners(request.id);
}
