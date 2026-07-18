import type { PartnerRequest } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { getTimeWindowStart } from "./time-window.service";

export const DEFAULT_CONFIRMATION_START_OFFSET_MINUTES = 120;
export const DEFAULT_CONFIRMATION_END_OFFSET_MINUTES = 30;
export const DEFAULT_JOIN_LOCK_OFFSET_MINUTES = DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;

export type ParticipationPolicyOffsets = {
  confirmationEnabled: boolean;
  confirmationStartOffsetMinutes: number;
  confirmationEndOffsetMinutes: number;
  joinLockOffsetMinutes: number;
};

export type ResolvedParticipationPolicy = ParticipationPolicyOffsets & {
  confirmationStartAt: Date | null;
  confirmationEndAt: Date | null;
  joinLockAt: Date | null;
};

export function validateParticipationPolicyOffsets(offsets: ParticipationPolicyOffsets): void {
  const {
    confirmationEnabled,
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  } = offsets;
  const values = [
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  ];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    return throwHttpProblem({
      status: 400,
      detail: "Participation policy offsets must be non-negative integers",
    });
  }
  if (confirmationEnabled && confirmationStartOffsetMinutes <= confirmationEndOffsetMinutes) {
    return throwHttpProblem({
      status: 400,
      detail: "Confirmation start must be earlier than confirmation end",
    });
  }
  if (confirmationEnabled && joinLockOffsetMinutes < confirmationEndOffsetMinutes) {
    return throwHttpProblem({
      status: 400,
      detail: "Join lock must not be later than confirmation end",
    });
  }
}

export function resolveParticipationPolicy(
  request: Pick<
    PartnerRequest,
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
    | "confirmationEnabled"
  >,
  timeWindow: PartnerRequest["time"],
): ResolvedParticipationPolicy {
  const confirmationStartOffsetMinutes =
    request.confirmationStartOffsetMinutes ?? DEFAULT_CONFIRMATION_START_OFFSET_MINUTES;
  const confirmationEndOffsetMinutes =
    request.confirmationEndOffsetMinutes ?? DEFAULT_CONFIRMATION_END_OFFSET_MINUTES;
  const joinLockOffsetMinutes = request.joinLockOffsetMinutes ?? DEFAULT_JOIN_LOCK_OFFSET_MINUTES;
  validateParticipationPolicyOffsets({
    confirmationEnabled: request.confirmationEnabled,
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
  });
  const startAt = getTimeWindowStart(timeWindow);
  const resolveOffsetDate = (offsetMinutes: number): Date | null =>
    startAt ? new Date(startAt.getTime() - offsetMinutes * 60 * 1000) : null;
  return {
    confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes,
    joinLockOffsetMinutes,
    confirmationEnabled: request.confirmationEnabled,
    confirmationStartAt: request.confirmationEnabled
      ? resolveOffsetDate(confirmationStartOffsetMinutes)
      : null,
    confirmationEndAt: request.confirmationEnabled
      ? resolveOffsetDate(confirmationEndOffsetMinutes)
      : null,
    joinLockAt: resolveOffsetDate(joinLockOffsetMinutes),
  };
}

export function hasEnabledConfirmationPolicy(
  request: Pick<
    PartnerRequest,
    | "confirmationEnabled"
    | "confirmationStartOffsetMinutes"
    | "confirmationEndOffsetMinutes"
    | "joinLockOffsetMinutes"
  >,
): boolean {
  return hasParticipationPolicy(request) && request.confirmationEnabled;
}

export function hasConfirmationWindowOpened(
  policy: Pick<ResolvedParticipationPolicy, "confirmationStartAt">,
): boolean {
  return policy.confirmationStartAt !== null && Date.now() >= policy.confirmationStartAt.getTime();
}

export function hasConfirmationWindowEnded(
  policy: Pick<ResolvedParticipationPolicy, "confirmationEndAt">,
): boolean {
  return policy.confirmationEndAt !== null && Date.now() >= policy.confirmationEndAt.getTime();
}

export function isWithinConfirmationWindow(
  policy: Pick<ResolvedParticipationPolicy, "confirmationStartAt" | "confirmationEndAt">,
): boolean {
  if (!policy.confirmationStartAt || !policy.confirmationEndAt) return false;
  const now = Date.now();
  return now >= policy.confirmationStartAt.getTime() && now < policy.confirmationEndAt.getTime();
}

export function isJoinLockedByPolicy(
  policy: Pick<ResolvedParticipationPolicy, "joinLockAt">,
): boolean {
  return policy.joinLockAt !== null && Date.now() >= policy.joinLockAt.getTime();
}

export function hasParticipationPolicy(
  request: Pick<
    PartnerRequest,
    "confirmationStartOffsetMinutes" | "confirmationEndOffsetMinutes" | "joinLockOffsetMinutes"
  >,
): boolean {
  return (
    request.confirmationStartOffsetMinutes !== null &&
    request.confirmationEndOffsetMinutes !== null &&
    request.joinLockOffsetMinutes !== null
  );
}
