import type { PartnerRequest } from "../../../entities/partner-request";
import type { User, UserId } from "../../../entities/user";
import {
  PartnerRepository,
  type PendingParticipantSummary,
} from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { RepositoryExecutor } from "../../../repositories/_executor";
import { arePRJoinGatesResolvedForUser } from "./join-gates.service";
import { findUserTimeWindowConflict } from "./participation-time-conflict.service";
import { evaluatePRTypeParticipationFrequencyLimit } from "./pr-type-participation-frequency-limit.service";

export type PRAdmissionEligibility =
  | { state: "ELIGIBLE" }
  | {
      state: "INELIGIBLE";
      reason:
        | "USER_INACTIVE"
        | "TIME_CONFLICT"
        | "JOIN_GATE_UNRESOLVED"
        | "PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED";
    };

/**
 * Database-only admission facts shared by direct join and waitlist promotion.
 * Callers may run a cheap preflight, but this evaluator is authoritative when
 * invoked through the serializable admission transaction's executor.
 */
export const evaluatePRAdmissionEligibility = async (input: {
  request: PartnerRequest;
  userId: UserId;
  executor: RepositoryExecutor;
  lockedUser?: User | null;
}): Promise<PRAdmissionEligibility> => {
  const user =
    input.lockedUser ?? (await new UserRepository(input.executor).findById(input.userId));
  if (!user || user.status !== "ACTIVE") {
    return { state: "INELIGIBLE", reason: "USER_INACTIVE" };
  }

  const conflict = await findUserTimeWindowConflict({
    userId: input.userId,
    targetTimeWindow: input.request.time,
    excludePrId: input.request.id,
    executor: input.executor,
  });
  if (conflict !== null) {
    return { state: "INELIGIBLE", reason: "TIME_CONFLICT" };
  }

  const frequency = await evaluatePRTypeParticipationFrequencyLimit({
    request: input.request,
    userId: input.userId,
    executor: input.executor,
  });
  if (!frequency.allowed) {
    return { state: "INELIGIBLE", reason: "PR_TYPE_PARTICIPATION_FREQUENCY_LIMITED" };
  }

  const gatesResolved = await arePRJoinGatesResolvedForUser({
    request: input.request,
    userId: input.userId,
    executor: input.executor,
  });
  if (!gatesResolved) {
    return { state: "INELIGIBLE", reason: "JOIN_GATE_UNRESOLVED" };
  }

  return { state: "ELIGIBLE" };
};

/**
 * The waiting order is PR-owned. Callers use this only after the PR row is
 * locked, so the returned candidate is the first eligible entry in one
 * transaction-local queue observation.
 */
export const findEarliestEligiblePendingParticipant = async (input: {
  request: PartnerRequest;
  executor: RepositoryExecutor;
}): Promise<PendingParticipantSummary | null> => {
  const pending = await new PartnerRepository(input.executor).listPendingParticipantSummariesByPrId(
    input.request.id,
  );
  for (const candidate of pending) {
    const eligibility = await evaluatePRAdmissionEligibility({
      request: input.request,
      userId: candidate.userId,
      executor: input.executor,
    });
    if (eligibility.state === "ELIGIBLE") {
      return candidate;
    }
  }
  return null;
};
