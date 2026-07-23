import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { isPRExpirableStatus } from "../services/status-rules";
import { getTimeWindowClose } from "../services/time-window.service";
import { releasePRParticipantMessageWindow } from "./pr-participant-message-window-release";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

type PRTerminalTransitionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  requestRepo: PartnerRequestRepository;
  partnerRepo: PartnerRepository;
};

type ReleaseMessageWindow = typeof releasePRParticipantMessageWindow;

export type ManualPRTerminalTransitionResult =
  | { outcome: "TERMINATED"; request: PartnerRequest; recipientUserIds: UserId[] }
  | { outcome: "PR_MISSING" };

export type TemporalPRTerminalTransitionResult =
  | {
      outcome: "TERMINATED";
      request: PartnerRequest;
      terminalStatus: "CLOSED" | "EXPIRED";
      recipientUserIds: UserId[];
    }
  | { outcome: "NOT_DUE"; request: PartnerRequest }
  | { outcome: "PR_MISSING" };

export type PRTerminalTransitionTransactionPort = {
  closeManually(input: { prId: PRId }): Promise<ManualPRTerminalTransitionResult>;
  finalizeAtWindowClose(input: { prId: PRId }): Promise<TemporalPRTerminalTransitionResult>;
};

/**
 * A terminal-only PR transaction protocol. It serializes with the atomic
 * message source through the locked PR and active-roster order, then releases
 * every recipient's exact message window before the terminal status commits.
 */
const runPRTerminalTransitionTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PRTerminalTransitionContext) => Promise<Result>;
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

const lockActiveRecipientUserIds = async (
  context: PRTerminalTransitionContext,
  prId: PRId,
): Promise<UserId[]> => context.partnerRepo.listActiveParticipantUserIdsByPrIdForUpdate(prId);

const completeTerminalTransition = async (input: {
  context: PRTerminalTransitionContext;
  targetStatus: "CLOSED" | "EXPIRED";
  recipientUserIds: UserId[];
  releaseMessageWindow: ReleaseMessageWindow;
}): Promise<{ request: PartnerRequest; recipientUserIds: UserId[] }> => {
  const request = input.context.request;
  if (!request) throw new Error("PR_TERMINAL_TRANSITION_REQUEST_MISSING");

  const updated = await input.context.requestRepo.updateStatus(request.id, input.targetStatus);
  if (!updated) throw new Error("PR_TERMINAL_STATUS_WRITE_FAILED");

  for (const recipientUserId of input.recipientUserIds) {
    await input.releaseMessageWindow({
      executor: input.context.tx,
      prId: request.id,
      recipientUserId,
    });
  }

  return { request: updated, recipientUserIds: input.recipientUserIds };
};

export const createPRTerminalTransitionTransactionPort = (
  dependencies: { releaseMessageWindow?: ReleaseMessageWindow } = {},
): PRTerminalTransitionTransactionPort => {
  const releaseMessageWindow =
    dependencies.releaseMessageWindow ?? releasePRParticipantMessageWindow;

  return {
    async closeManually(input): Promise<ManualPRTerminalTransitionResult> {
      return runPRTerminalTransitionTransaction({
        prId: input.prId,
        execute: async (context) => {
          if (!context.request) return { outcome: "PR_MISSING" };
          const recipientUserIds = await lockActiveRecipientUserIds(context, input.prId);
          const transitioned = await completeTerminalTransition({
            context,
            targetStatus: "CLOSED",
            recipientUserIds,
            releaseMessageWindow,
          });
          return { outcome: "TERMINATED", ...transitioned };
        },
      });
    },

    async finalizeAtWindowClose(input): Promise<TemporalPRTerminalTransitionResult> {
      return runPRTerminalTransitionTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };
          if (!isPRExpirableStatus(request.status as string)) {
            return { outcome: "NOT_DUE", request };
          }

          const windowClose = getTimeWindowClose(request.time);
          if (!windowClose || windowClose.getTime() > Date.now()) {
            return { outcome: "NOT_DUE", request };
          }

          // The roster lock below is the count snapshot. It must precede the
          // target choice so a concurrent admission cannot choose CLOSED or
          // EXPIRED against a stale participant count.
          const recipientUserIds = await lockActiveRecipientUserIds(context, request.id);
          const minPartners = request.minPartners ?? 1;
          const terminalStatus =
            recipientUserIds.length >= minPartners ? ("CLOSED" as const) : ("EXPIRED" as const);
          const transitioned = await completeTerminalTransition({
            context,
            targetStatus: terminalStatus,
            recipientUserIds,
            releaseMessageWindow,
          });

          return {
            outcome: "TERMINATED",
            request: transitioned.request,
            terminalStatus,
            recipientUserIds: transitioned.recipientUserIds,
          };
        },
      });
    },
  };
};
