import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { doTimeWindowsOverlap, type TimeWindow } from "./time-window.service";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();

export const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const JOIN_TIME_WINDOW_CONFLICT_MESSAGE =
  "Cannot continue - time window conflicts with another joined partner request";

const isTimeConflictRelevantStatus = (status: string): boolean =>
  status === "OPEN" ||
  status === "READY" ||
  status === "ACTIVE";

export async function findUserTimeWindowConflict(params: {
  userId: UserId;
  targetTimeWindow: TimeWindow;
  excludePrId?: PRId | null;
}): Promise<PRId | null> {
  const slots = await partnerRepo.findActiveByUserId(params.userId);
  const joinedPrIds = Array.from(
    new Set(slots.map((slot) => slot.prId)),
  ).filter((prId) => (params.excludePrId ? prId !== params.excludePrId : true));

  if (joinedPrIds.length === 0) return null;

  const joinedRequests = await prRepo.findByIds(joinedPrIds);
  const conflicted = joinedRequests.find((joinedRequest) => {
    if (!isTimeConflictRelevantStatus(joinedRequest.status)) {
      return false;
    }
    return doTimeWindowsOverlap(params.targetTimeWindow, joinedRequest.time);
  });

  return conflicted?.id ?? null;
}

export async function assertNoUserTimeWindowConflict(params: {
  userId: UserId;
  targetTimeWindow: TimeWindow;
  excludePrId?: PRId | null;
}): Promise<void> {
  const conflicted = await findUserTimeWindowConflict(params);
  if (!conflicted) return;

  return throwHttpProblem({
    status: 409,
    detail: JOIN_TIME_WINDOW_CONFLICT_MESSAGE,
    code: JOIN_TIME_WINDOW_CONFLICT_CODE,
  });
}
