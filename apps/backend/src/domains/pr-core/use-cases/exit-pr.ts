import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../../user";
import { hasAnchorParticipationPolicy } from "../services/anchor-participation-policy.service";
import { isExitAllowedStatus } from "../services/status-rules";
import { recalculatePRStatus } from "../services/slot-management.service";
import { hasEventStarted } from "../services/time-window.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { resetPRJoinGateResolutionsForUser } from "../services/join-gates.service";
import { promoteWaitlistedPartners } from "../services/waitlist.service";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reminder.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function exitPRByUserId(
  id: PRId,
  userId: UserId,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  const hasParticipationPolicy = hasAnchorParticipationPolicy(refreshedRequest);

  if (refreshedRequest.createdBy === userId) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - creator cannot exit own partner request" });
  }

  if (!isExitAllowedStatus(refreshedRequest.status as string)) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - partner request is not open" });
  }

  const activeSlot = await partnerRepo.findActiveByPrIdAndUserId(id, userId);
  if (!activeSlot) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - partner is not joined" });
  }

  if (hasParticipationPolicy && hasEventStarted(refreshedRequest.time)) {
    return throwHttpProblem({ status: 400, detail: "Cannot exit - event has already started" });
  }

  await partnerRepo.updateStatus(activeSlot.id, "EXITED");
  await resetPRJoinGateResolutionsForUser({
    prId: id,
    userId,
    partnerId: activeSlot.id,
  });
  await userReliabilityRepo.applyDelta(userId, { released: 1 });
  if (hasParticipationPolicy) {
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
