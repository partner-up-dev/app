import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { resolveUserByOpenId } from "../../user";
import { exitActivePRParticipant } from "./release-pr-participant";
import { cancelActivityStartReminderForParticipant } from "../services/activity-start-reminder-reconciler.service";
import { cancelConfirmationRemindersForParticipant } from "../services/confirmation-reminder-reconciler.service";
import { reconcileCurrentCreator } from "../services/current-creator.service";
import { resetPRJoinGateResolutionsForUser } from "../services/join-gates.service";
import { hasParticipationPolicy } from "../services/participation-policy.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { recalculatePRStatus } from "../services/slot-management.service";
import { isPRExitAllowedStatus } from "../services/status-rules";
import { hasPRTimeWindowStarted } from "../services/time-window.service";
import { promoteWaitlistedPartners } from "../services/waitlist.service";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reconciler.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function exitPRByUserId(
  id: PRId,
  userId: UserId,
  actor: PRDraftActor = { userId, roles: ["anonymous"] },
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  assertPRDraftAccess({ request, actor, operation: "participant-flow" });
  const refreshedRequest = await refreshTemporalStatus(request);
  const hasMaterializedParticipationPolicy = hasParticipationPolicy(refreshedRequest);

  if (!isPRExitAllowedStatus(refreshedRequest.status as string)) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - partner request is not open" });
  }

  const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(id, userId);
  if (!activeSlot) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - partner is not joined" });
  }

  if (hasMaterializedParticipationPolicy && hasPRTimeWindowStarted(refreshedRequest.time)) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit after the PR starts" });
  }

  const exitResult = await exitActivePRParticipant({ prId: id, userId });
  if (exitResult.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (exitResult.outcome === "PARTICIPANT_NOT_ACTIVE") {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - partner is not joined" });
  }
  const exitedSlot = exitResult.slot;
  await resetPRJoinGateResolutionsForUser({
    prId: id,
    userId,
    partnerId: exitedSlot.id,
  });
  await userReliabilityRepo.applyDelta(userId, { released: 1 });
  await cancelActivityStartReminderForParticipant({ prId: id, recipientUserId: userId });
  await cancelConfirmationRemindersForParticipant({
    prId: id,
    slotId: exitedSlot.id,
    recipientUserId: userId,
  });
  await recalculatePRStatus(id);

  await promoteWaitlistedPartners(id);
  await reconcileCurrentCreator(id);

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  await reconcileAlternativeWaitlistNotificationsForCandidate(latest);
  return toPublicPR(latest, userId);
}

export async function exitPR(id: PRId, openId: string): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return exitPRByUserId(id, user.id);
}
