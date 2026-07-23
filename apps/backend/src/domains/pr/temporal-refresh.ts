/**
 * Temporal status refresh — shared helper for use-cases that need to
 * ensure a PR's status reflects the current time before proceeding.
 */

import type { PartnerRequest } from "../../entities/partner-request";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../repositories/UserReliabilityRepository";
import { cancelActivityStartReminderForParticipant } from "./services/activity-start-reminder-reconciler.service";
import { cancelConfirmationRemindersForParticipant } from "./services/confirmation-reminder-reconciler.service";
import { applyParticipantReleaseEffects } from "./services/participant-release-effects.service";
import {
  hasParticipationPolicy,
  isJoinLockedByPolicy,
  resolveParticipationPolicy,
} from "./services/participation-policy.service";
import { recalculatePRStatus } from "./services/slot-management.service";
import { isPRActivatableStatus } from "./services/status-rules";
import { getTimeWindowClose, getTimeWindowStart } from "./services/time-window.service";
import { promoteWaitlistedPartners } from "./services/waitlist.service";
import { createPRReadyTransitionTransactionPort } from "./adapters/pr-ready-transition-transaction";
import { createPRTerminalTransitionTransactionPort } from "./adapters/pr-terminal-transition-transaction";
import { releaseUnconfirmedPRParticipants } from "./commands/release-pr-participant";

const prRepo = new PartnerRequestRepository();
const userReliabilityRepo = new UserReliabilityRepository();
const prReadyTransition = createPRReadyTransitionTransactionPort();
const prTerminalTransition = createPRTerminalTransitionTransactionPort();

/**
 * Refresh a PR's temporal state: release unconfirmed slots, activate if
 * within window, finalize if past window-close.
 */
export async function refreshTemporalStatus(request: PartnerRequest): Promise<PartnerRequest> {
  await releaseUnconfirmedSlotsIfNeeded(request);
  const afterRelease = await prRepo.findById(request.id);
  const normalized = afterRelease ?? request;

  const ready = await markReadyIfJoinLocked(normalized);
  const activated = await activateIfNeeded(ready);
  return expireIfNeeded(activated);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function activateIfNeeded(request: PartnerRequest): Promise<PartnerRequest> {
  if (!isPRActivatableStatus(request.status as string)) return request;

  const windowStart = getTimeWindowStart(request.time);
  if (!windowStart) return request;

  const now = Date.now();
  if (windowStart.getTime() > now) return request;

  const windowClose = getTimeWindowClose(request.time);
  if (windowClose && windowClose.getTime() <= now) return request;

  const updated = await prRepo.updateStatus(request.id, "ACTIVE");
  return updated ?? request;
}

async function markReadyIfJoinLocked(request: PartnerRequest): Promise<PartnerRequest> {
  if (request.status !== "OPEN") return request;
  if (!hasParticipationPolicy(request)) return request;

  const policy = resolveParticipationPolicy(request, request.time);
  if (!isJoinLockedByPolicy(policy)) return request;

  const transition = await prReadyTransition.transitionIfJoinLocked({ prId: request.id });
  if (transition.outcome === "TRANSITIONED") {
    return transition.request;
  }
  return transition.outcome === "PR_MISSING" ? request : transition.request;
}

async function expireIfNeeded(request: PartnerRequest): Promise<PartnerRequest> {
  const transition = await prTerminalTransition.finalizeAtWindowClose({ prId: request.id });
  if (transition.outcome === "PR_MISSING") return request;
  return transition.request;
}

async function releaseUnconfirmedSlotsIfNeeded(request: PartnerRequest): Promise<void> {
  const releaseResult = await releaseUnconfirmedPRParticipants({ prId: request.id });
  if (releaseResult.outcome === "PR_MISSING" || releaseResult.outcome === "NOT_DUE") return;
  const releasing = releaseResult.releasedSlots;
  if (releasing.length === 0) return;
  const releasedUserIds = releasing.map((slot) => slot.userId);

  for (const slot of releasing) {
    await userReliabilityRepo.applyDelta(slot.userId, { released: 1 });
    await cancelActivityStartReminderForParticipant({
      prId: request.id,
      recipientUserId: slot.userId,
    });
    await cancelConfirmationRemindersForParticipant({
      prId: request.id,
      slotId: slot.id,
      recipientUserId: slot.userId,
    });
  }

  await recalculatePRStatus(request.id);
  await promoteWaitlistedPartners(request.id);
  if (hasParticipationPolicy(releaseResult.request)) {
    await applyParticipantReleaseEffects({
      prId: request.id,
      releasedUserIds,
    });
  }
}
