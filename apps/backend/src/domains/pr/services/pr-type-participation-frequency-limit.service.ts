import type { PartnerRequest, PRId, UserId } from "../../../entities";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { getPRTypeConfigParticipationFrequencyPolicy } from "../../pr-type-config";
import { getTimeWindowClose, getTimeWindowStart } from "./time-window.service";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

export const PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED_CODE =
  "PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED";

export type PRTypeParticipationFrequencyLimit = {
  intervalPrCount: number;
};

export type PRTypeParticipationFrequencyLimitEvaluation =
  | {
      allowed: true;
      limit: PRTypeParticipationFrequencyLimit | null;
    }
  | {
      allowed: false;
      limit: PRTypeParticipationFrequencyLimit;
      previousPrId: PRId;
      blockedUntilIndex: number;
      targetIndex: number;
    };

const isLimitEnabled = (
  limit: PRTypeParticipationFrequencyLimit | null,
): limit is PRTypeParticipationFrequencyLimit => limit !== null && limit.intervalPrCount > 0;

const comparePRByTimeWindow = (left: PartnerRequest, right: PartnerRequest): number => {
  const leftStart = getTimeWindowStart(left.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightStart = getTimeWindowStart(right.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftStart !== rightStart) return leftStart - rightStart;

  const leftEnd = getTimeWindowClose(left.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightEnd = getTimeWindowClose(right.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;

  return left.id - right.id;
};

const resolvePRSequence = async (type: string, targetPrId: PRId): Promise<PartnerRequest[]> => {
  const roots = await prRepo.findByType(type);
  return roots
    .filter((root) => root.visibilityStatus === "VISIBLE" || root.id === targetPrId)
    .sort(comparePRByTimeWindow);
};

export const evaluatePRTypeParticipationFrequencyLimit = async (input: {
  request: PartnerRequest;
  userId: UserId | null;
}): Promise<PRTypeParticipationFrequencyLimitEvaluation> => {
  const config = await getPRTypeConfigParticipationFrequencyPolicy(input.request.type);
  const limit = config?.participationFrequencyLimit ?? null;
  if (!isLimitEnabled(limit) || input.userId === null) {
    return { allowed: true, limit };
  }

  const sequence = await resolvePRSequence(input.request.type, input.request.id);
  const targetIndex = sequence.findIndex((root) => root.id === input.request.id);
  if (targetIndex < 0) {
    return { allowed: true, limit };
  }

  const sequenceIndexByPrId = new Map<PRId, number>(
    sequence.map((root, index) => [root.id, index]),
  );
  const activeSlots = await partnerRepo.findActiveByUserId(input.userId);
  const previousParticipation = activeSlots
    .map((slot) => ({
      prId: slot.prId,
      index: sequenceIndexByPrId.get(slot.prId),
    }))
    .filter(
      (slot): slot is { prId: PRId; index: number } =>
        slot.index !== undefined && slot.index < targetIndex,
    )
    .sort((left, right) => right.index - left.index)[0];

  if (!previousParticipation) {
    return { allowed: true, limit };
  }

  const blockedUntilIndex = previousParticipation.index + limit.intervalPrCount;
  if (targetIndex <= blockedUntilIndex) {
    return {
      allowed: false,
      limit,
      previousPrId: previousParticipation.prId,
      blockedUntilIndex,
      targetIndex,
    };
  }

  return { allowed: true, limit };
};

export const assertPRTypeParticipationFrequencyLimitAllows = async (input: {
  request: PartnerRequest;
  userId: UserId;
}): Promise<void> => {
  const evaluation = await evaluatePRTypeParticipationFrequencyLimit(input);
  if (evaluation.allowed) return;

  throw new ProblemDetailsError({
    status: 409,
    type: "https://partner-up.app/problems/pr-type.participation_frequency_limited",
    code: PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED_CODE,
    localizedText: {
      zhCN: {
        title: "报名频率受限",
        detail: `该搭子类型要求每次参与后间隔 ${evaluation.limit.intervalPrCount} 个完整 PR，当前场次暂时不能报名或候补。`,
      },
      enUS: {
        title: "Participation frequency limited",
        detail: `This PR type requires ${evaluation.limit.intervalPrCount} complete PRs between participations. You cannot join or waitlist this PR yet.`,
      },
    },
  });
};
