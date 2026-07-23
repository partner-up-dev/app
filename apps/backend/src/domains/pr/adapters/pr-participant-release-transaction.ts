import type { Partner, PartnerId, PartnerStatus } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import {
  hasConfirmationWindowEnded,
  hasEnabledConfirmationPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import { releasePRParticipantMessageWindow } from "./pr-participant-message-window-release";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

type PRParticipantReleaseTransactionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  partnerRepo: PartnerRepository;
};

type ReleaseMessageWindow = typeof releasePRParticipantMessageWindow;

export type ExitActivePRParticipantResult =
  | { outcome: "EXITED"; slot: Partner }
  | { outcome: "PR_MISSING" }
  | { outcome: "PARTICIPANT_NOT_ACTIVE" };

export type ReleaseAdminPRParticipantResult =
  | { outcome: "RELEASED"; slot: Partner; previousStatus: PartnerStatus }
  | { outcome: "PR_MISSING" }
  | { outcome: "PARTICIPANT_NOT_FOUND" }
  | { outcome: "PARTICIPANT_NOT_RELEASEABLE" };

export type ReleaseUnconfirmedPRParticipantsResult =
  | { outcome: "PR_MISSING" }
  | {
      outcome: "RELEASED" | "NOT_DUE";
      request: PartnerRequest;
      releasedSlots: Partner[];
    };

export type PRParticipantReleaseTransactionPort = {
  exitActive(input: { prId: PRId; userId: UserId }): Promise<ExitActivePRParticipantResult>;
  releaseByAdmin(input: {
    prId: PRId;
    partnerId: PartnerId;
    releaseReason: string;
  }): Promise<ReleaseAdminPRParticipantResult>;
  releaseUnconfirmed(input: { prId: PRId }): Promise<ReleaseUnconfirmedPRParticipantsResult>;
};

/**
 * PR's participant-removal transaction protocol. Every path locks the PR
 * before the active roster, matching the message-source lock order, and the
 * membership mutation rolls back if Notification cannot release its exact
 * recipient window.
 */
const runPRParticipantReleaseTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PRParticipantReleaseTransactionContext) => Promise<Result>;
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
            partnerRepo: new PartnerRepository(tx),
          });
        },
        { isolationLevel: "serializable" },
      );
    } catch (error) {
      if (!isSerializationFailure(error) || attempt === MAX_SERIALIZATION_ATTEMPTS - 1) {
        throw error;
      }
      lastSerializationFailure = error;
      await serializationRetryDelay(attempt);
    }
  }
  throw lastSerializationFailure;
};

const lockActiveRoster = async (
  context: PRParticipantReleaseTransactionContext,
  prId: PRId,
): Promise<void> => {
  await context.partnerRepo.listActiveParticipantUserIdsByPrIdForUpdate(prId);
};

export const createPRParticipantReleaseTransactionPort = (
  dependencies: { releaseMessageWindow?: ReleaseMessageWindow } = {},
): PRParticipantReleaseTransactionPort => {
  const releaseMessageWindow =
    dependencies.releaseMessageWindow ?? releasePRParticipantMessageWindow;

  const releaseWindow = async (input: {
    context: PRParticipantReleaseTransactionContext;
    prId: PRId;
    recipientUserId: UserId;
  }): Promise<void> => {
    await releaseMessageWindow({
      executor: input.context.tx,
      prId: input.prId,
      recipientUserId: input.recipientUserId,
    });
  };

  return {
    async exitActive(input): Promise<ExitActivePRParticipantResult> {
      return runPRParticipantReleaseTransaction({
        prId: input.prId,
        execute: async (context) => {
          if (!context.request) return { outcome: "PR_MISSING" };
          await lockActiveRoster(context, input.prId);
          const activeSlot = await context.partnerRepo.findActiveByPrIdAndUserId(
            input.prId,
            input.userId,
          );
          if (!activeSlot) return { outcome: "PARTICIPANT_NOT_ACTIVE" };

          const exited = await context.partnerRepo.updateStatus(activeSlot.id, "EXITED");
          if (!exited) throw new Error("PR_PARTICIPANT_EXIT_WRITE_FAILED");
          await releaseWindow({
            context,
            prId: input.prId,
            recipientUserId: exited.userId,
          });
          return { outcome: "EXITED", slot: exited };
        },
      });
    },

    async releaseByAdmin(input): Promise<ReleaseAdminPRParticipantResult> {
      return runPRParticipantReleaseTransaction({
        prId: input.prId,
        execute: async (context) => {
          if (!context.request) return { outcome: "PR_MISSING" };
          await lockActiveRoster(context, input.prId);
          const slot = await context.partnerRepo.findById(input.partnerId);
          if (!slot || slot.prId !== input.prId) {
            return { outcome: "PARTICIPANT_NOT_FOUND" };
          }
          if (slot.status !== "JOINED" && slot.status !== "CONFIRMED") {
            return { outcome: "PARTICIPANT_NOT_RELEASEABLE" };
          }

          const released = await context.partnerRepo.markActiveReleased(slot.id, {
            releaseReason: input.releaseReason,
          });
          if (!released) throw new Error("PR_ADMIN_PARTICIPANT_RELEASE_WRITE_FAILED");
          await releaseWindow({
            context,
            prId: input.prId,
            recipientUserId: released.userId,
          });
          return { outcome: "RELEASED", slot: released, previousStatus: slot.status };
        },
      });
    },

    async releaseUnconfirmed(input): Promise<ReleaseUnconfirmedPRParticipantsResult> {
      return runPRParticipantReleaseTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };
          if (
            !hasEnabledConfirmationPolicy(request) ||
            !hasConfirmationWindowEnded(resolveParticipationPolicy(request, request.time))
          ) {
            return { outcome: "NOT_DUE", request, releasedSlots: [] };
          }

          await lockActiveRoster(context, input.prId);
          const activeSlots = await context.partnerRepo.listActiveParticipantSummariesByPrId(
            input.prId,
          );
          const releasedSlots: Partner[] = [];
          for (const slot of activeSlots) {
            if (slot.status !== "JOINED") continue;
            const released = await context.partnerRepo.markActiveReleased(slot.partnerId);
            if (!released) throw new Error("PR_UNCONFIRMED_PARTICIPANT_RELEASE_WRITE_FAILED");
            await releaseWindow({
              context,
              prId: input.prId,
              recipientUserId: released.userId,
            });
            releasedSlots.push(released);
          }
          return { outcome: "RELEASED", request, releasedSlots };
        },
      });
    },
  };
};
