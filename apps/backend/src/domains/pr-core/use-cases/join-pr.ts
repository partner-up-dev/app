import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import type { PRId } from "../../../entities/partner-request";
import type { PartnerStatus } from "../../../entities/partner";
import type { User } from "../../../entities/user";
import { resolveUserByOpenId } from "../../user";
import {
  hasAnchorParticipationPolicy,
  hasEnabledConfirmationPolicy,
  isJoinLockedByPolicy,
  isWithinConfirmationWindow,
  resolveAnchorParticipationPolicy,
} from "../services/anchor-participation-policy.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { isJoinableStatus } from "../services/status-rules";
import {
  countActivePartnersForPR,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import { expandFullPR } from "../../anchor-event";
import {
  scheduleWeChatActivityStartReminderJobForParticipant,
  scheduleWeChatNewPartnerNotificationsForJoin,
  scheduleWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { assertPRJoinGatesResolvedForUser } from "../services/join-gates.service";
import { closeAlternativeWaitlistSourcesAfterJoin } from "../services/waitlist-alternative-reminder.service";
import { assertAnchorEventParticipationFrequencyLimitAllows } from "../services/anchor-participation-frequency-limit.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export async function joinPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status">,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);
  const hasParticipationPolicy = hasAnchorParticipationPolicy(refreshedRequest);
  const hasConfirmationPolicy = hasEnabledConfirmationPolicy(refreshedRequest);

  let targetStatus: Extract<PartnerStatus, "JOINED" | "CONFIRMED"> = "JOINED";

  if (hasParticipationPolicy) {
    const policy = resolveAnchorParticipationPolicy(
      refreshedRequest,
      refreshedRequest.time,
    );
    if (isJoinLockedByPolicy(policy)) {
      return throwHttpProblem({ status: 400, detail: "Cannot join - event is locked after join lock" });
    }

    if (hasConfirmationPolicy && isWithinConfirmationWindow(policy)) {
      targetStatus = "CONFIRMED";
    }
  }

  if (!isJoinableStatus(refreshedRequest.status as string)) {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is not open" });
  }

  if (user.status !== "ACTIVE") {
    return throwHttpProblem({ status: 403, detail: "Current user is not active" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (existing) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
    }
    if (hasAnchorParticipationPolicy(latest)) {
      await scheduleWeChatReminderJobsForParticipant(latest, user.id);
      await scheduleWeChatActivityStartReminderJobForParticipant(latest, user.id);
    }
    return toPublicPR(latest, user.id);
  }

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: refreshedRequest.time,
    excludePrId: id,
  });
  await assertAnchorEventParticipationFrequencyLimitAllows({
    request: refreshedRequest,
    userId: user.id,
  });

  const activeCount = await countActivePartnersForPR(id);

  await assertPRJoinGatesResolvedForUser({
    prId: id,
    userId: user.id,
  });

  if (
    refreshedRequest.maxPartners !== null &&
    activeCount >= refreshedRequest.maxPartners
  ) {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is full" });
  }
  const latestHistoricalSlot = await partnerRepo.findReleasedByPrIdAndUserId(
    id,
    user.id,
  );
  const joinedSlot = latestHistoricalSlot
    ? await partnerRepo.reactivateSlot(latestHistoricalSlot.id, targetStatus)
    : await partnerRepo.createSlot({
        prId: id,
        userId: user.id,
        status: targetStatus,
      });
  if (!joinedSlot) {
    return throwHttpProblem({ status: 500, detail: "Failed to persist join participation record" });
  }
  const assignedPartnerId = joinedSlot.id;

  await userReliabilityRepo.applyDelta(user.id, {
    joined: 1,
    confirmed: targetStatus === "CONFIRMED" ? 1 : 0,
  });

  await recalculatePRStatus(id);

  const afterRecalculate = await prRepo.findById(id);
  if (
    afterRecalculate &&
    afterRecalculate.status === "FULL"
  ) {
    await expandFullPR(id);
  }

  operationLogService.log({
    actorId: user.id,
    action: "partner.join",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { partnerId: assignedPartnerId, status: targetStatus },
  });

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  if (hasAnchorParticipationPolicy(latest)) {
    await scheduleWeChatNewPartnerNotificationsForJoin({
      request: latest,
      joinedUserId: user.id,
      joinedPartnerId: assignedPartnerId,
      joinedAt: new Date(),
    });
    await scheduleWeChatReminderJobsForParticipant(latest, user.id);
    await scheduleWeChatActivityStartReminderJobForParticipant(latest, user.id);
  }
  await closeAlternativeWaitlistSourcesAfterJoin({
    alternativeRequest: latest,
    userId: user.id,
    alternativePartnerId: assignedPartnerId,
  });
  return toPublicPR(latest, user.id);
}

export async function joinPR(
  id: PRId,
  openId: string,
): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return joinPRAsUser(id, user);
}
