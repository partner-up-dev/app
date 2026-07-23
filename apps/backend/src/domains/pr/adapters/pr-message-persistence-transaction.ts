import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { PRMessageWithAuthor } from "../../../repositories/PRMessageRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { TransactionExecutor } from "../../../repositories/_executor";
import { db } from "../../../lib/db";
import type { UserId } from "../../../entities/user";
import {
  createTransactionBoundPRMessageSummaryNotificationPort,
  type PRMessageSummaryNotificationPort,
} from "../../notification";

const MAX_SERIALIZATION_ATTEMPTS = 8;

const serializationRetryDelay = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.min(40, 5 * (attempt + 1)));
  });

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "code" in error && error.code === "40001";

export type PRMessagePersistenceAuthorKind = "ACTIVE_PARTICIPANT" | "OPERATOR_OR_SYSTEM";

export type PRMessagePersistenceTransactionResult =
  | { outcome: "CREATED"; message: PRMessageWithAuthor }
  | { outcome: "PR_MISSING" }
  | { outcome: "AUTHOR_NOT_ACTIVE_PARTICIPANT" };

export type PRMessagePersistenceTransactionPort = {
  persist(input: {
    prId: PRId;
    authorUserId: UserId;
    body: string;
    authorKind: PRMessagePersistenceAuthorKind;
  }): Promise<PRMessagePersistenceTransactionResult>;
};

type PRMessagePersistenceTransactionContext = {
  tx: TransactionExecutor;
  request: PartnerRequest | null;
  messageRepo: PRMessageRepository;
  partnerRepo: PartnerRepository;
};

type CreatePRMessageSummaryNotificationPort = (
  input: Parameters<typeof createTransactionBoundPRMessageSummaryNotificationPort>[0],
) => PRMessageSummaryNotificationPort;

/**
 * A deliberately message-specific transaction protocol. The message and its
 * first generic attention-window reservation share one serializable commit;
 * it is not a generic PR callback and does not perform provider I/O.
 */
const runPRMessagePersistenceTransaction = async <Result>(input: {
  prId: PRId;
  execute: (context: PRMessagePersistenceTransactionContext) => Promise<Result>;
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
            messageRepo: new PRMessageRepository(tx),
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

/**
 * PR's atomic message-source bridge. Callers validate syntax, outer access
 * and rate limits beforehand; this port rechecks the active-author fact that
 * must agree with the locked recipient roster.
 */
export const createPRMessagePersistenceTransactionPort = (
  dependencies: {
    createNotificationPort?: CreatePRMessageSummaryNotificationPort;
  } = {},
): PRMessagePersistenceTransactionPort => {
  const createNotificationPort =
    dependencies.createNotificationPort ?? createTransactionBoundPRMessageSummaryNotificationPort;

  return {
    async persist(input): Promise<PRMessagePersistenceTransactionResult> {
      return runPRMessagePersistenceTransaction({
        prId: input.prId,
        execute: async (context) => {
          const request = context.request;
          if (!request) {
            return { outcome: "PR_MISSING" };
          }

          // This locks every current active slot in deterministic order. An
          // exit waits on its row; standard admissions already take the PR
          // lock first, so both sides observe one frozen roster.
          const activeParticipantUserIds =
            await context.partnerRepo.listActiveParticipantUserIdsByPrIdForUpdate(request.id);
          if (
            input.authorKind === "ACTIVE_PARTICIPANT" &&
            !activeParticipantUserIds.includes(input.authorUserId)
          ) {
            return { outcome: "AUTHOR_NOT_ACTIVE_PARTICIPANT" };
          }

          const createdMessage = await context.messageRepo.create({
            prId: request.id,
            authorUserId: input.authorUserId,
            body: input.body,
          });
          if (!createdMessage) {
            throw new Error("PR_MESSAGE_WRITE_FAILED");
          }

          const message = await context.messageRepo.findWithAuthorById(createdMessage.id);
          if (!message) {
            throw new Error("PR_MESSAGE_RELOAD_FAILED");
          }

          if (request.status === "CLOSED" || request.status === "EXPIRED") {
            return { outcome: "CREATED", message };
          }

          const notificationPort = createNotificationPort({
            executor: context.tx,
          });
          await notificationPort.requestForSourceRecipients({
            prId: request.id,
            authorUserId: input.authorUserId,
            windowStartCursor: createdMessage.id,
            windowOpenedAt: createdMessage.createdAt,
            activeRecipientCandidateUserIds: activeParticipantUserIds,
          });

          return { outcome: "CREATED", message };
        },
      });
    },
  };
};
