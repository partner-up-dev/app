import type { PRMessage, PRMessageId } from "../../../entities/pr-message";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  createTransactionBoundPRMessageSummaryNotificationInvalidationPort,
  type PRMessageSummaryNotificationInvalidationPort,
} from "../../notification";
import { db } from "../../../lib/db";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

type AdminPRMessageWindowLifecycleTransactionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  partnerRepo: PartnerRepository;
  requestRepo: PartnerRequestRepository;
  messageRepo: PRMessageRepository;
};

type CreateNotificationInvalidationPort = (input: {
  executor: TransactionExecutor;
}) => PRMessageSummaryNotificationInvalidationPort;

export type AdminPRMessageTombstoneResult =
  | { outcome: "TOMBSTONED"; message: PRMessage }
  | { outcome: "PR_MISSING" | "MESSAGE_NOT_VISIBLE" };

export type AdminPRRootDeleteResult =
  | {
      outcome: "DELETED";
      request: PartnerRequest;
      deletedPartnerCount: number;
    }
  | { outcome: "PR_MISSING" };

export type AdminPRMessageWindowLifecycleTransactionPort = {
  tombstoneMessage(input: {
    prId: PRId;
    messageId: PRMessageId;
  }): Promise<AdminPRMessageTombstoneResult>;
  deleteRoot(input: { prId: PRId }): Promise<AdminPRRootDeleteResult>;
};

/**
 * An admin-only PR lifecycle protocol. It is intentionally limited to the two
 * destructive actions that must preserve the PR-message cursor while
 * invalidating current recipient windows; it is not a generic admin
 * transaction callback.
 */
const runAdminPRMessageWindowLifecycleTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: AdminPRMessageWindowLifecycleTransactionContext) => Promise<Result>;
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
            messageRepo: new PRMessageRepository(tx),
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

const lockCurrentRecipientUserIds = async (input: {
  context: AdminPRMessageWindowLifecycleTransactionContext;
  prId: PRId;
}): Promise<UserId[]> =>
  input.context.partnerRepo.listActiveParticipantUserIdsByPrIdForUpdate(input.prId);

const invalidateRecipientWindows = async (input: {
  executor: TransactionExecutor;
  prId: PRId;
  recipientUserIds: readonly UserId[];
  createNotificationPort: CreateNotificationInvalidationPort;
}): Promise<void> => {
  const notificationPort = input.createNotificationPort({ executor: input.executor });
  for (const recipientUserId of input.recipientUserIds) {
    await notificationPort.invalidateForRecipientAndAggregate({
      prId: input.prId,
      recipientUserId,
    });
  }
};

export const createAdminPRMessageWindowLifecycleTransactionPort = (
  dependencies: {
    createNotificationPort?: CreateNotificationInvalidationPort;
  } = {},
): AdminPRMessageWindowLifecycleTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ??
    createTransactionBoundPRMessageSummaryNotificationInvalidationPort;

  return {
    async tombstoneMessage(input): Promise<AdminPRMessageTombstoneResult> {
      return runAdminPRMessageWindowLifecycleTransaction({
        prId: input.prId,
        execute: async (context) => {
          if (!context.request) return { outcome: "PR_MISSING" };

          // Lock the roster before mutating source state, matching message
          // source and participant-release ordering.
          const recipientUserIds = await lockCurrentRecipientUserIds({ context, prId: input.prId });

          const visibleMessage = await context.messageRepo.findByPrIdAndId(
            input.prId,
            input.messageId,
          );
          if (!visibleMessage) return { outcome: "MESSAGE_NOT_VISIBLE" };

          const tombstoned = await context.messageRepo.tombstoneById(input.messageId);
          if (!tombstoned) {
            return { outcome: "MESSAGE_NOT_VISIBLE" };
          }
          await invalidateRecipientWindows({
            executor: context.tx,
            prId: input.prId,
            recipientUserIds,
            createNotificationPort,
          });
          return { outcome: "TOMBSTONED", message: tombstoned };
        },
      });
    },

    async deleteRoot(input): Promise<AdminPRRootDeleteResult> {
      return runAdminPRMessageWindowLifecycleTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) return { outcome: "PR_MISSING" };

          const deletedPartnerCount = await context.partnerRepo.countTotalByPrId(input.prId);
          const recipientUserIds = await lockCurrentRecipientUserIds({ context, prId: input.prId });
          await invalidateRecipientWindows({
            executor: context.tx,
            prId: input.prId,
            recipientUserIds,
            createNotificationPort,
          });
          const deleted = await context.requestRepo.deleteById(input.prId);
          if (!deleted) {
            throw new Error("ADMIN_PR_ROOT_DELETE_WRITE_FAILED");
          }

          return { outcome: "DELETED", request, deletedPartnerCount };
        },
      });
    },
  };
};
