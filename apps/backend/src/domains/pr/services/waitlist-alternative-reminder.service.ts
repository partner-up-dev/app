import type { PartnerId } from "../../../entities/partner";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { scheduleWeChatWaitlistAlternativeAvailableNotification } from "../../../infra/notifications";
import { operationLogService } from "../../../infra/operation-log";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { refreshTemporalStatus } from "../temporal-refresh";
import { resetPRJoinGateResolutionsForUser } from "./join-gates.service";
import { isPRJoinableStatus } from "./status-rules";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

const normalizeText = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const isCandidateEligible = async (request: PartnerRequest): Promise<boolean> => {
  if (request.visibilityStatus !== "VISIBLE") {
    return false;
  }
  if (!isPRJoinableStatus(request.status)) {
    return false;
  }
  if (request.maxPartners === null) {
    return true;
  }
  const activeCount = await partnerRepo.countActiveByPrId(request.id);
  return activeCount < request.maxPartners;
};

export async function scheduleAlternativeWaitlistNotificationsForCandidate(
  candidateRequest: PartnerRequest,
): Promise<void> {
  const type = normalizeText(candidateRequest.type);
  const location = normalizeText(candidateRequest.location);
  if (!type || !location) {
    return;
  }

  const refreshedCandidate = await refreshTemporalStatus(candidateRequest);
  if (!(await isCandidateEligible(refreshedCandidate))) {
    return;
  }

  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByTypeAndLocation({
    type,
    location,
    excludePrId: refreshedCandidate.id,
  });

  for (const sourceSlot of sourceSlots) {
    await scheduleWeChatWaitlistAlternativeAvailableNotification({
      sourcePrId: sourceSlot.prId,
      sourcePartnerId: sourceSlot.partnerId,
      candidatePrId: refreshedCandidate.id,
      recipientUserId: sourceSlot.userId,
    });
  }
}

export async function scheduleAlternativeWaitlistNotificationsForSource(input: {
  sourceRequest: PartnerRequest;
  sourcePartnerId: PartnerId;
  recipientUserId: UserId;
}): Promise<void> {
  const type = normalizeText(input.sourceRequest.type);
  const location = normalizeText(input.sourceRequest.location);
  if (!type || !location) {
    return;
  }

  const candidates = await prRepo.findVisibleByType(type);
  for (const candidate of candidates) {
    if (candidate.id === input.sourceRequest.id) {
      continue;
    }
    if (normalizeText(candidate.location) !== location) {
      continue;
    }
    const refreshedCandidate = await refreshTemporalStatus(candidate);
    if (!(await isCandidateEligible(refreshedCandidate))) {
      continue;
    }

    await scheduleWeChatWaitlistAlternativeAvailableNotification({
      sourcePrId: input.sourceRequest.id,
      sourcePartnerId: input.sourcePartnerId,
      candidatePrId: refreshedCandidate.id,
      recipientUserId: input.recipientUserId,
    });
  }
}

export async function scheduleAlternativeWaitlistNotificationsForUserSources(
  userId: UserId,
): Promise<void> {
  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByUser(userId);

  for (const sourceSlot of sourceSlots) {
    const sourceRequest = await prRepo.findById(sourceSlot.prId);
    if (!sourceRequest) {
      continue;
    }
    await scheduleAlternativeWaitlistNotificationsForSource({
      sourceRequest,
      sourcePartnerId: sourceSlot.partnerId,
      recipientUserId: userId,
    });
  }
}

export async function closeAlternativeWaitlistSourcesAfterJoin(input: {
  alternativeRequest: PartnerRequest;
  userId: UserId;
  alternativePartnerId: PartnerId;
}): Promise<void> {
  const type = normalizeText(input.alternativeRequest.type);
  const location = normalizeText(input.alternativeRequest.location);
  if (!type || !location) {
    return;
  }

  const sourceSlots = await partnerRepo.listPendingAlternativeReminderSlotsByUserForAlternative({
    userId: input.userId,
    type,
    location,
    excludePrId: input.alternativeRequest.id,
  });

  for (const sourceSlot of sourceSlots) {
    const cancelled = await partnerRepo.cancelPendingSlot(sourceSlot.partnerId);
    if (!cancelled) {
      continue;
    }
    await resetPRJoinGateResolutionsForUser({
      prId: sourceSlot.prId,
      userId: input.userId,
      partnerId: sourceSlot.partnerId,
    });

    operationLogService.log({
      actorId: input.userId,
      action: "partner.waitlist_cancel_alternative_joined",
      aggregateType: "partner_request",
      aggregateId: String(sourceSlot.prId),
      detail: {
        sourcePartnerId: sourceSlot.partnerId,
        sourcePrId: sourceSlot.prId,
        alternativePrId: input.alternativeRequest.id,
        alternativePartnerId: input.alternativePartnerId,
        reason: "alternative_pr_joined",
      },
    });
  }
}
