import type { PartnerId, PartnerStatus } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  scheduleWeChatActivityStartReminderJobForParticipant,
  scheduleWeChatNewPartnerNotificationsForJoin,
  scheduleWeChatReminderJobsForParticipant,
  scheduleWeChatWaitlistPromotedNotificationForParticipant,
} from "../../../infra/notifications";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { assertPRJoinGatesResolvedForUser } from "./join-gates.service";
import {
  hasEnabledConfirmationPolicy,
  hasParticipationPolicy,
  isJoinLockedByPolicy,
  isWithinConfirmationWindow,
  resolveParticipationPolicy,
} from "./participation-policy.service";
import { assertNoUserTimeWindowConflict } from "./participation-time-conflict.service";
import { recalculatePRStatus } from "./slot-management.service";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const userRepo = new UserRepository();
const userReliabilityRepo = new UserReliabilityRepository();

export type WaitlistPromotionResult = {
  promoted: Array<{
    partnerId: PartnerId;
    userId: UserId;
    status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">;
  }>;
};

export const isWaitlistOpenForRequest = (input: {
  request: PartnerRequest;
  activeCount: number;
}): boolean => {
  const maxPartners = input.request.maxPartners;
  if (maxPartners === null) {
    return false;
  }
  if (input.request.status !== "OPEN") {
    return false;
  }
  if (input.activeCount < maxPartners) {
    return false;
  }
  if (!hasParticipationPolicy(input.request)) {
    return true;
  }
  return !isJoinLockedByPolicy(resolveParticipationPolicy(input.request, input.request.time));
};

const isPromotionAllowed = (request: PartnerRequest): boolean => {
  if (request.status !== "OPEN") {
    return false;
  }
  if (!hasParticipationPolicy(request)) {
    return true;
  }
  return !isJoinLockedByPolicy(resolveParticipationPolicy(request, request.time));
};

const resolvePromotionStatus = (
  request: PartnerRequest,
): Extract<PartnerStatus, "JOINED" | "CONFIRMED"> => {
  if (!hasParticipationPolicy(request)) {
    return "JOINED";
  }
  if (!hasEnabledConfirmationPolicy(request)) {
    return "JOINED";
  }
  const policy = resolveParticipationPolicy(request, request.time);
  return isWithinConfirmationWindow(policy) ? "CONFIRMED" : "JOINED";
};

const applyPromotedPartnerSideEffects = async (input: {
  request: PartnerRequest;
  partnerId: PartnerId;
  userId: UserId;
  status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">;
}): Promise<void> => {
  await userReliabilityRepo.applyDelta(input.userId, {
    joined: 1,
    confirmed: input.status === "CONFIRMED" ? 1 : 0,
  });

  await recalculatePRStatus(input.request.id);

  const latest = await prRepo.findById(input.request.id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  await scheduleWeChatWaitlistPromotedNotificationForParticipant({
    request: latest,
    userId: input.userId,
    partnerId: input.partnerId,
    promotedAt: new Date(),
  });

  if (hasParticipationPolicy(latest)) {
    await scheduleWeChatNewPartnerNotificationsForJoin({
      request: latest,
      joinedUserId: input.userId,
      joinedPartnerId: input.partnerId,
      joinedAt: new Date(),
    });
    await scheduleWeChatReminderJobsForParticipant(latest, input.userId);
    await scheduleWeChatActivityStartReminderJobForParticipant(latest, input.userId);
  }

  operationLogService.log({
    actorId: input.userId,
    action: "partner.waitlist_promoted",
    aggregateType: "partner_request",
    aggregateId: String(input.request.id),
    detail: { partnerId: input.partnerId, status: input.status },
  });
};

const canPromoteCandidate = async (input: {
  request: PartnerRequest;
  userId: UserId;
}): Promise<boolean> => {
  const user = await userRepo.findById(input.userId);
  if (!user || user.status !== "ACTIVE") {
    return false;
  }

  try {
    await assertNoUserTimeWindowConflict({
      userId: input.userId,
      targetTimeWindow: input.request.time,
      excludePrId: input.request.id,
    });
    await assertPRJoinGatesResolvedForUser({
      prId: input.request.id,
      userId: input.userId,
    });
    return true;
  } catch {
    return false;
  }
};

export const promoteWaitlistedPartners = async (prId: PRId): Promise<WaitlistPromotionResult> => {
  const promoted: WaitlistPromotionResult["promoted"] = [];
  let request = await prRepo.findById(prId);
  if (!request || request.maxPartners === null) {
    return { promoted };
  }
  if (!isPromotionAllowed(request)) {
    return { promoted };
  }

  let activeCount = await partnerRepo.countActiveByPrId(prId);
  let remaining = Math.max(0, request.maxPartners - activeCount);
  if (remaining === 0) {
    return { promoted };
  }

  const pending = await partnerRepo.listPendingParticipantSummariesByPrId(prId);
  for (const candidate of pending) {
    if (remaining === 0) {
      break;
    }

    request = await prRepo.findById(prId);
    if (!request || request.maxPartners === null || !isPromotionAllowed(request)) {
      break;
    }

    activeCount = await partnerRepo.countActiveByPrId(prId);
    remaining = Math.max(0, request.maxPartners - activeCount);
    if (remaining === 0) {
      break;
    }

    if (
      !(await canPromoteCandidate({
        request,
        userId: candidate.userId,
      }))
    ) {
      continue;
    }

    const status = resolvePromotionStatus(request);
    const promotedSlot = await partnerRepo.promotePendingSlot(candidate.partnerId, status);
    if (!promotedSlot) {
      continue;
    }

    promoted.push({
      partnerId: promotedSlot.id,
      userId: promotedSlot.userId,
      status,
    });
    remaining -= 1;

    await applyPromotedPartnerSideEffects({
      request,
      partnerId: promotedSlot.id,
      userId: promotedSlot.userId,
      status,
    });
  }

  return { promoted };
};
