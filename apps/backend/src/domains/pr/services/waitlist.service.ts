import type { PartnerId, PartnerStatus } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { createWaitlistPromotionTransactionPort } from "../adapters/waitlist-promotion-transaction";
import { reconcileActivityStartReminderForParticipant } from "./activity-start-reminder-reconciler.service";
import { reconcileConfirmationRemindersForParticipant } from "./confirmation-reminder-reconciler.service";
import { isWaitlistPromotionAllowed } from "./waitlist-promotion-policy.service";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const waitlistPromotionTransaction = createWaitlistPromotionTransactionPort();

export type WaitlistPromotionResult = {
  promoted: Array<{
    partnerId: PartnerId;
    userId: UserId;
    status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">;
  }>;
};

/**
 * A non-authoritative waitlist preflight for UI/command feedback. The
 * admission adapter repeats this decision under its PR transaction protocol
 * before it writes a PENDING slot.
 */
export const isWaitlistOpenForRequest = (input: {
  request: PartnerRequest;
  activeCount: number;
}): boolean =>
  input.request.maxPartners !== null &&
  input.activeCount >= input.request.maxPartners &&
  isWaitlistPromotionAllowed(input.request);

const applyPromotedPartnerPostCommitSideEffects = async (input: {
  prId: PRId;
  partnerId: PartnerId;
  userId: UserId;
  status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">;
}): Promise<void> => {
  const latest = await prRepo.findById(input.prId);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  await reconcileActivityStartReminderForParticipant({
    prId: latest.id,
    recipientUserId: input.userId,
  });
  await reconcileConfirmationRemindersForParticipant({
    prId: latest.id,
    slotId: input.partnerId,
    recipientUserId: input.userId,
  });
};

export const promoteWaitlistedPartners = async (prId: PRId): Promise<WaitlistPromotionResult> => {
  const promoted: WaitlistPromotionResult["promoted"] = [];
  let request = await prRepo.findById(prId);
  if (!request || request.maxPartners === null) {
    return { promoted };
  }
  if (!isWaitlistPromotionAllowed(request)) {
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
    if (!request || request.maxPartners === null || !isWaitlistPromotionAllowed(request)) {
      break;
    }

    activeCount = await partnerRepo.countActiveByPrId(prId);
    remaining = Math.max(0, request.maxPartners - activeCount);
    if (remaining === 0) {
      break;
    }

    const promotion = await waitlistPromotionTransaction.promote({
      prId,
      partnerId: candidate.partnerId,
      userId: candidate.userId,
    });
    if (promotion.outcome !== "PROMOTED") {
      continue;
    }

    promoted.push({
      partnerId: promotion.partnerId,
      userId: promotion.userId,
      status: promotion.status,
    });
    remaining -= 1;

    await applyPromotedPartnerPostCommitSideEffects({
      prId,
      partnerId: promotion.partnerId,
      userId: promotion.userId,
      status: promotion.status,
    });
  }

  return { promoted };
};
