import type { PartnerId, PartnerStatus } from "../../../entities/partner";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  createTransactionBoundNewPartnerNotificationPort,
  createTransactionBoundWaitlistPromotionNotificationPort,
  type NewPartnerNotificationPort,
  type WaitlistPromotionNotificationPort,
} from "../../notification";
import { runPrAdmissionTransaction } from "./pr-admission-transaction";
import {
  evaluatePRAdmissionEligibility,
  findEarliestEligiblePendingParticipant,
} from "../services/pr-admission-eligibility.service";
import { hasParticipationPolicy } from "../services/participation-policy.service";
import {
  isWaitlistPromotionAllowed,
  resolveWaitlistPromotionStatus,
} from "../services/waitlist-promotion-policy.service";
import { recalculatePRStatus } from "../services/slot-management.service";

export type WaitlistPromotionTransactionResult =
  | {
      outcome: "PROMOTED";
      partnerId: PartnerId;
      userId: UserId;
      status: Extract<PartnerStatus, "JOINED" | "CONFIRMED">;
    }
  | { outcome: "SKIPPED" };

type CreateWaitlistPromotionNotificationPort = (
  input: Parameters<typeof createTransactionBoundWaitlistPromotionNotificationPort>[0],
) => WaitlistPromotionNotificationPort;

type CreateNewPartnerNotificationPort = (
  input: Parameters<typeof createTransactionBoundNewPartnerNotificationPort>[0],
) => NewPartnerNotificationPort;

export type WaitlistPromotionTransactionPort = {
  promote(input: {
    prId: PRId;
    partnerId: PartnerId;
    userId: UserId;
  }): Promise<WaitlistPromotionTransactionResult>;
};

/**
 * PR-owned atomic bridge for one pending candidate. The serializable admission
 * protocol owns capacity, FIFO selection and transaction-local eligibility;
 * Notification receives only the transaction executor and semantic request
 * while retaining its private scheduling policy.
 */
export const createWaitlistPromotionTransactionPort = (
  dependencies: {
    createNotificationPort?: CreateWaitlistPromotionNotificationPort;
    createNewPartnerNotificationPort?: CreateNewPartnerNotificationPort;
  } = {},
): WaitlistPromotionTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ?? createTransactionBoundWaitlistPromotionNotificationPort;
  const createNewPartnerNotificationPort =
    dependencies.createNewPartnerNotificationPort ??
    createTransactionBoundNewPartnerNotificationPort;

  return {
    async promote(input): Promise<WaitlistPromotionTransactionResult> {
      const joinedAtIso = new Date().toISOString();
      return runPrAdmissionTransaction({
        prId: input.prId,
        execute: async (context): Promise<WaitlistPromotionTransactionResult> => {
          const request = context.request;
          if (!request || request.maxPartners === null || !isWaitlistPromotionAllowed(request)) {
            return { outcome: "SKIPPED" };
          }

          const candidate = await context.partnerRepo.findById(input.partnerId);
          if (
            !candidate ||
            candidate.prId !== input.prId ||
            candidate.userId !== input.userId ||
            candidate.status !== "PENDING"
          ) {
            return { outcome: "SKIPPED" };
          }
          if (!candidate.waitlistCycleId) {
            throw new Error("WAITLIST_CYCLE_ID_MISSING");
          }
          const waitlistCycleId = candidate.waitlistCycleId;

          const lockedUser = await context.userRepo.findByIdForUpdate(input.userId);
          const eligibility = await evaluatePRAdmissionEligibility({
            request,
            userId: input.userId,
            executor: context.tx,
            lockedUser,
          });
          if (eligibility.state !== "ELIGIBLE") {
            return { outcome: "SKIPPED" };
          }
          const [earliestEligiblePending, activeCount] = await Promise.all([
            findEarliestEligiblePendingParticipant({ request, executor: context.tx }),
            context.partnerRepo.countActiveByPrId(input.prId),
          ]);
          if (
            earliestEligiblePending?.partnerId !== input.partnerId ||
            activeCount >= request.maxPartners
          ) {
            return { outcome: "SKIPPED" };
          }

          const status = resolveWaitlistPromotionStatus(request);
          const promoted = await context.partnerRepo.promotePendingSlot(input.partnerId, status);
          if (!promoted) {
            return { outcome: "SKIPPED" };
          }
          if (promoted.waitlistCycleId !== waitlistCycleId) {
            throw new Error("WAITLIST_CYCLE_ID_CHANGED_DURING_PROMOTION");
          }

          await context.reliabilityRepo.applyDelta(input.userId, {
            joined: 1,
            confirmed: status === "CONFIRMED" ? 1 : 0,
          });
          await recalculatePRStatus(input.prId, context.tx);

          const notificationPort = createNotificationPort({ executor: context.tx });
          await notificationPort.request({
            template: "pr.waitlist-promoted",
            recipientUserId: input.userId,
            channel: "WECHAT_SUBSCRIPTION",
            payload: {
              prId: input.prId,
              partnerId: promoted.id,
              waitlistCycleId,
            },
            metadata: {
              aggregate: { type: "partner_request", id: String(input.prId) },
              causationId: `partner_request:${input.prId}:waitlist-promotion:${promoted.id}:${waitlistCycleId}`,
            },
          });

          if (hasParticipationPolicy(request)) {
            if (!promoted.admissionCycleId) {
              throw new Error("WAITLIST_PROMOTION_ADMISSION_CYCLE_ID_MISSING");
            }
            const activeRecipients = await context.partnerRepo.listActiveParticipantSummariesByPrId(
              input.prId,
            );
            const newPartnerNotificationPort = createNewPartnerNotificationPort({
              executor: context.tx,
            });
            await newPartnerNotificationPort.requestForSourceRecipients({
              prId: input.prId,
              partnerId: promoted.id,
              joinedUserId: input.userId,
              joinedAtIso,
              admissionCycleId: promoted.admissionCycleId,
              activeRecipientCandidateUserIds: activeRecipients.map(
                (recipient) => recipient.userId,
              ),
            });
          }

          return {
            outcome: "PROMOTED",
            partnerId: promoted.id,
            userId: promoted.userId,
            status,
          };
        },
      });
    },
  };
};
