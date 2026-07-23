import type { Partner, PartnerStatus } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  createTransactionBoundNewPartnerNotificationPort,
  type NewPartnerNotificationPort,
} from "../../notification";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import {
  evaluatePRAdmissionEligibility,
  findEarliestEligiblePendingParticipant,
  type PRAdmissionEligibility,
} from "../services/pr-admission-eligibility.service";
import { findUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { recalculatePRStatus } from "../services/slot-management.service";
import {
  isWaitlistPromotionAllowed,
  resolveWaitlistPromotionStatus,
} from "../services/waitlist-promotion-policy.service";
import { hasParticipationPolicy } from "../services/participation-policy.service";

const MAX_SERIALIZATION_ATTEMPTS = 8;
const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

type PrAdmissionTransactionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  partnerRepo: PartnerRepository;
  requestRepo: PartnerRequestRepository;
  reliabilityRepo: UserReliabilityRepository;
  userRepo: UserRepository;
};

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

/**
 * The only PR-local transaction protocol for capacity, queue membership and
 * active-admission mutations. It deliberately exposes a locked PR context,
 * not a generic database callback, so callers cannot turn it into a
 * cross-domain transaction convenience API.
 */
export const runPrAdmissionTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PrAdmissionTransactionContext) => Promise<Result>;
}): Promise<Result> => {
  let lastSerializationFailure: unknown = null;
  for (let attempt = 0; attempt < MAX_SERIALIZATION_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(
        async (tx) => {
          const requestRepo = new PartnerRequestRepository(tx);
          const request = await requestRepo.findByIdForUpdate(input.prId);
          return input.execute({
            tx,
            request,
            requestRepo,
            partnerRepo: new PartnerRepository(tx),
            reliabilityRepo: new UserReliabilityRepository(tx),
            userRepo: new UserRepository(tx),
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === MAX_SERIALIZATION_ATTEMPTS - 1) {
        throw error;
      }
      lastSerializationFailure = error;
      // Different PRs may legitimately serialize through one active entrant's
      // user row. A short bounded delay gives the winning transaction time to
      // commit before the next fresh SERIALIZABLE snapshot begins.
      await serializationRetryDelay(attempt);
    }
  }
  throw lastSerializationFailure;
};

export type DirectPrAdmissionResult =
  | { outcome: "ADMITTED"; slot: Partner; status: Extract<PartnerStatus, "JOINED" | "CONFIRMED"> }
  | { outcome: "ALREADY_ACTIVE"; slot: Partner }
  | { outcome: "ALREADY_WAITLISTED" }
  | { outcome: "PR_MISSING" | "NOT_JOINABLE" | "FULL" | "WAITLIST_PRIORITY" }
  | { outcome: "INELIGIBLE"; eligibility: PRAdmissionEligibility };

export type WaitlistEntryResult =
  | { outcome: "WAITLISTED"; slot: Partner }
  | { outcome: "ALREADY_ACTIVE"; slot: Partner }
  | { outcome: "ALREADY_WAITLISTED"; slot: Partner }
  | { outcome: "PR_MISSING" | "NOT_WAITLISTABLE" }
  | { outcome: "INELIGIBLE"; eligibility: PRAdmissionEligibility };

export type PublishCreatorAdmissionResult =
  | { outcome: "PUBLISHED"; slot: Partner }
  | { outcome: "PR_MISSING" | "NOT_DRAFT" | "CREATOR_MISMATCH" | "FULL" }
  | { outcome: "INELIGIBLE"; reason: "USER_INACTIVE" | "TIME_CONFLICT" };

export type PrAdmissionTransactionPort = {
  admitDirect(input: { prId: PRId; userId: UserId }): Promise<DirectPrAdmissionResult>;
  enterWaitlist(input: {
    prId: PRId;
    userId: UserId;
    alternativePrReminderOptIn?: boolean;
  }): Promise<WaitlistEntryResult>;
  publishCreator(input: {
    prId: PRId;
    creatorUserId: UserId;
  }): Promise<PublishCreatorAdmissionResult>;
};

type CreateNewPartnerNotificationPort = (
  input: Parameters<typeof createTransactionBoundNewPartnerNotificationPort>[0],
) => NewPartnerNotificationPort;

const isWaitlistEntryAllowed = (input: { request: PartnerRequest; activeCount: number }): boolean =>
  input.request.maxPartners !== null &&
  isWaitlistPromotionAllowed(input.request) &&
  input.activeCount >= input.request.maxPartners;

const resolveLockedActiveUserEligibility = async (input: {
  request: PartnerRequest;
  userId: UserId;
  context: PrAdmissionTransactionContext;
}): Promise<PRAdmissionEligibility> => {
  const lockedUser = await input.context.userRepo.findByIdForUpdate(input.userId);
  return evaluatePRAdmissionEligibility({
    request: input.request,
    userId: input.userId,
    executor: input.context.tx,
    lockedUser,
  });
};

/**
 * Concrete PR owner port. It is intentionally specific to PR capacity and
 * waitlist ordering rather than a reusable transaction abstraction.
 */
export const createPrAdmissionTransactionPort = (
  dependencies: {
    createNewPartnerNotificationPort?: CreateNewPartnerNotificationPort;
  } = {},
): PrAdmissionTransactionPort => {
  const createNewPartnerNotificationPort =
    dependencies.createNewPartnerNotificationPort ??
    createTransactionBoundNewPartnerNotificationPort;

  return {
    async admitDirect(input) {
      const joinedAtIso = new Date().toISOString();
      return runPrAdmissionTransaction({
        prId: input.prId,
        execute: async (context): Promise<DirectPrAdmissionResult> => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };

          const existingActive = await context.partnerRepo.findActiveByPrIdAndUserId(
            request.id,
            input.userId,
          );
          if (existingActive) {
            return { outcome: "ALREADY_ACTIVE", slot: existingActive };
          }
          const existingPending = await context.partnerRepo.findPendingByPrIdAndUserId(
            request.id,
            input.userId,
          );
          if (existingPending) {
            return { outcome: "ALREADY_WAITLISTED" };
          }
          if (!isWaitlistPromotionAllowed(request)) {
            return { outcome: "NOT_JOINABLE" };
          }

          const eligibility = await resolveLockedActiveUserEligibility({
            request,
            userId: input.userId,
            context,
          });
          if (eligibility.state !== "ELIGIBLE") {
            return { outcome: "INELIGIBLE", eligibility };
          }

          const activeCount = await context.partnerRepo.countActiveByPrId(request.id);
          if (request.maxPartners !== null && activeCount >= request.maxPartners) {
            return { outcome: "FULL" };
          }
          const earliestEligiblePending = await findEarliestEligiblePendingParticipant({
            request,
            executor: context.tx,
          });
          if (earliestEligiblePending) {
            return { outcome: "WAITLIST_PRIORITY" };
          }

          const status = resolveWaitlistPromotionStatus(request);
          const historicalSlot = await context.partnerRepo.findReleasedByPrIdAndUserId(
            request.id,
            input.userId,
          );
          const slot = historicalSlot
            ? await context.partnerRepo.reactivateSlot(historicalSlot.id, status)
            : await context.partnerRepo.createSlot({
                prId: request.id,
                userId: input.userId,
                status,
              });
          if (!slot) {
            throw new Error("DIRECT_PR_ADMISSION_SLOT_WRITE_FAILED");
          }
          await context.reliabilityRepo.applyDelta(input.userId, {
            joined: 1,
            confirmed: status === "CONFIRMED" ? 1 : 0,
          });
          await recalculatePRStatus(request.id, context.tx);

          if (hasParticipationPolicy(request)) {
            if (!slot.admissionCycleId) {
              throw new Error("DIRECT_PR_ADMISSION_CYCLE_ID_MISSING");
            }
            const activeRecipients = await context.partnerRepo.listActiveParticipantSummariesByPrId(
              request.id,
            );
            const notificationPort = createNewPartnerNotificationPort({
              executor: context.tx,
            });
            await notificationPort.requestForSourceRecipients({
              prId: request.id,
              partnerId: slot.id,
              joinedUserId: input.userId,
              joinedAtIso,
              admissionCycleId: slot.admissionCycleId,
              activeRecipientCandidateUserIds: activeRecipients.map(
                (recipient) => recipient.userId,
              ),
            });
          }
          return { outcome: "ADMITTED", slot, status };
        },
      });
    },

    async enterWaitlist(input) {
      return runPrAdmissionTransaction({
        prId: input.prId,
        execute: async (context): Promise<WaitlistEntryResult> => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };

          const existingActive = await context.partnerRepo.findActiveByPrIdAndUserId(
            request.id,
            input.userId,
          );
          if (existingActive) {
            return { outcome: "ALREADY_ACTIVE", slot: existingActive };
          }
          const existingPending = await context.partnerRepo.findPendingByPrIdAndUserId(
            request.id,
            input.userId,
          );
          if (existingPending) {
            return { outcome: "ALREADY_WAITLISTED", slot: existingPending };
          }

          const eligibility = await resolveLockedActiveUserEligibility({
            request,
            userId: input.userId,
            context,
          });
          if (eligibility.state !== "ELIGIBLE") {
            return { outcome: "INELIGIBLE", eligibility };
          }

          const activeCount = await context.partnerRepo.countActiveByPrId(request.id);
          if (!isWaitlistEntryAllowed({ request, activeCount })) {
            return { outcome: "NOT_WAITLISTABLE" };
          }
          const historicalSlot = await context.partnerRepo.findReusableInactiveByPrIdAndUserId(
            request.id,
            input.userId,
          );
          const slot = historicalSlot
            ? await context.partnerRepo.markPending(historicalSlot.id, {
                alternativePrReminderOptIn: input.alternativePrReminderOptIn,
              })
            : await context.partnerRepo.createSlot({
                prId: request.id,
                userId: input.userId,
                status: "PENDING",
                alternativePrReminderOptIn: input.alternativePrReminderOptIn,
              });
          if (!slot) {
            throw new Error("WAITLIST_ENTRY_SLOT_WRITE_FAILED");
          }
          return { outcome: "WAITLISTED", slot };
        },
      });
    },

    async publishCreator(input) {
      return runPrAdmissionTransaction({
        prId: input.prId,
        execute: async (context): Promise<PublishCreatorAdmissionResult> => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };
          if (request.status !== "DRAFT") return { outcome: "NOT_DRAFT" };
          if (request.createdBy !== null && request.createdBy !== input.creatorUserId) {
            return { outcome: "CREATOR_MISMATCH" };
          }

          const lockedUser = await context.userRepo.findByIdForUpdate(input.creatorUserId);
          if (!lockedUser || lockedUser.status !== "ACTIVE") {
            return { outcome: "INELIGIBLE", reason: "USER_INACTIVE" };
          }
          const timeConflict = await findUserTimeWindowConflict({
            userId: input.creatorUserId,
            targetTimeWindow: request.time,
            excludePrId: request.id,
            executor: context.tx,
          });
          if (timeConflict !== null) {
            return { outcome: "INELIGIBLE", reason: "TIME_CONFLICT" };
          }

          const existingActive = await context.partnerRepo.findActiveByPrIdAndUserId(
            request.id,
            input.creatorUserId,
          );
          const activeCount = await context.partnerRepo.countActiveByPrId(request.id);
          if (
            !existingActive &&
            request.maxPartners !== null &&
            activeCount >= request.maxPartners
          ) {
            return { outcome: "FULL" };
          }
          const slot =
            existingActive ??
            (await context.partnerRepo.createSlot({
              prId: request.id,
              userId: input.creatorUserId,
              status: "JOINED",
            }));
          if (!slot) {
            throw new Error("PUBLISH_CREATOR_SLOT_WRITE_FAILED");
          }
          if (!existingActive) {
            await context.reliabilityRepo.applyDelta(input.creatorUserId, { joined: 1 });
          }
          if (request.createdBy === null) {
            await context.requestRepo.setCreatedBy(request.id, input.creatorUserId);
          }
          const opened = await context.requestRepo.updateStatus(request.id, "OPEN");
          if (!opened) {
            throw new Error("PUBLISH_STATUS_WRITE_FAILED");
          }
          await recalculatePRStatus(request.id, context.tx);
          return { outcome: "PUBLISHED", slot };
        },
      });
    },
  };
};
