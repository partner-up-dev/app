import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { resolveUserByOpenId } from "../../user";
import { reconcileCurrentCreator } from "../services/current-creator.service";
import { resetPRJoinGateResolutionsForUser } from "../services/join-gates.service";
import { hasParticipationPolicy } from "../services/participation-policy.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { recalculatePRStatus } from "../services/slot-management.service";
import { isPRExitAllowedStatus } from "../services/status-rules";
import { hasPRTimeWindowStarted } from "../services/time-window.service";
import { promoteWaitlistedPartners } from "../services/waitlist.service";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reminder.service";
import { refreshTemporalStatus } from "../temporal-refresh";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function exitPRByUserId(id: PRId, userId: UserId): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
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

  await partnerRepo.updateStatus(activeSlot.id, "EXITED");
  await resetPRJoinGateResolutionsForUser({
    prId: id,
    userId,
    partnerId: activeSlot.id,
  });
  await userReliabilityRepo.applyDelta(userId, { released: 1 });
  if (hasMaterializedParticipationPolicy) {
    await cancelWeChatReminderJobsForParticipant(id, userId);
    await cancelWeChatActivityStartReminderJobsForParticipant(id, userId);
  }
  await recalculatePRStatus(id);

  operationLogService.log({
    actorId: userId,
    action: "partner.exit",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: activeSlot.id },
  });

  await promoteWaitlistedPartners(id);
  await reconcileCurrentCreator(id);

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  await scheduleAlternativeWaitlistNotificationsForCandidate(latest);
  return toPublicPR(latest, userId);
}

export async function exitPR(id: PRId, openId: string): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return exitPRByUserId(id, user.id);
}
