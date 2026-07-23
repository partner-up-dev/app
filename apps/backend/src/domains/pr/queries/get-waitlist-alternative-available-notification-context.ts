import type { PartnerRequest } from "../../../entities/partner-request";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { findUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import {
  hasParticipationPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import { getTimeWindowStart } from "../services/time-window.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type WaitlistAlternativeAvailableNotificationContextInput = {
  sourcePrId: number;
  sourcePartnerId: number;
  sourceWaitlistCycleId: string;
  candidatePrId: number;
  recipientUserId: string;
};

export type WaitlistAlternativeAvailableNotificationContext =
  | {
      state: "READY";
      title: string;
    }
  | {
      state: "SKIPPED";
      reason:
        | "SOURCE_WAITLIST_SLOT_NOT_PENDING"
        | "SOURCE_WAITLIST_CYCLE_SUPERSEDED"
        | "SOURCE_PR_MISSING"
        | "CANDIDATE_PR_MISSING"
        | "CANDIDATE_PR_MISMATCH"
        | "CANDIDATE_PR_NOT_JOINABLE"
        | "RECIPIENT_TIME_CONFLICT";
    };

const normalizeText = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolveTitle = (
  request: Pick<PartnerRequest, "id" | "title" | "location" | "type">,
): string => {
  const title = request.title?.trim();
  if (title) return title;
  const location = request.location?.trim();
  if (location) return location;
  const type = request.type.trim();
  if (type) return `${type}搭子`;
  return `PR#${request.id}`;
};

/**
 * Temporal status refresh is a PR mutation protocol. Notification eligibility
 * needs only the conservative answer to whether a persisted OPEN candidate
 * can still accept a new participant at this instant.
 */
export const isWaitlistAlternativeCandidateCurrentlyJoinable = (
  request: PartnerRequest,
  now: Date,
): boolean => {
  if (request.visibilityStatus !== "VISIBLE" || request.status !== "OPEN") {
    return false;
  }

  if (hasParticipationPolicy(request)) {
    const policy = resolveParticipationPolicy(request, request.time);
    return policy.joinLockAt === null || policy.joinLockAt.getTime() > now.getTime();
  }

  const startAt = getTimeWindowStart(request.time);
  return startAt === null || startAt.getTime() > now.getTime();
};

export const getWaitlistAlternativeAvailableNotificationContext = async (
  input: WaitlistAlternativeAvailableNotificationContextInput,
): Promise<WaitlistAlternativeAvailableNotificationContext> => {
  const sourceSlot = await partnerRepo.findById(input.sourcePartnerId);
  if (
    !sourceSlot ||
    sourceSlot.prId !== input.sourcePrId ||
    sourceSlot.userId !== input.recipientUserId ||
    sourceSlot.status !== "PENDING" ||
    !sourceSlot.alternativePrReminderOptIn
  ) {
    return { state: "SKIPPED", reason: "SOURCE_WAITLIST_SLOT_NOT_PENDING" };
  }
  if (sourceSlot.waitlistCycleId !== input.sourceWaitlistCycleId) {
    return { state: "SKIPPED", reason: "SOURCE_WAITLIST_CYCLE_SUPERSEDED" };
  }

  const [sourceRequest, candidate] = await Promise.all([
    prRepo.findById(input.sourcePrId),
    prRepo.findById(input.candidatePrId),
  ]);
  if (!sourceRequest) {
    return { state: "SKIPPED", reason: "SOURCE_PR_MISSING" };
  }
  if (!candidate) {
    return { state: "SKIPPED", reason: "CANDIDATE_PR_MISSING" };
  }

  const sourceType = normalizeText(sourceRequest.type);
  const sourceLocation = normalizeText(sourceRequest.location);
  const candidateType = normalizeText(candidate.type);
  const candidateLocation = normalizeText(candidate.location);
  if (
    candidate.id === sourceRequest.id ||
    !sourceType ||
    !sourceLocation ||
    candidateType !== sourceType ||
    candidateLocation !== sourceLocation
  ) {
    return { state: "SKIPPED", reason: "CANDIDATE_PR_MISMATCH" };
  }

  if (!isWaitlistAlternativeCandidateCurrentlyJoinable(candidate, new Date())) {
    return { state: "SKIPPED", reason: "CANDIDATE_PR_NOT_JOINABLE" };
  }
  if (candidate.maxPartners !== null) {
    const activeCount = await partnerRepo.countActiveByPrId(candidate.id);
    if (activeCount >= candidate.maxPartners) {
      return { state: "SKIPPED", reason: "CANDIDATE_PR_NOT_JOINABLE" };
    }
  }

  const conflictPrId = await findUserTimeWindowConflict({
    userId: input.recipientUserId,
    targetTimeWindow: candidate.time,
    excludePrId: candidate.id,
  });
  if (conflictPrId !== null) {
    return { state: "SKIPPED", reason: "RECIPIENT_TIME_CONFLICT" };
  }

  return { state: "READY", title: resolveTitle(candidate) };
};
