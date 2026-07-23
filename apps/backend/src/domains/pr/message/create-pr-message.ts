import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";
import { prMessageBodySchema } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import {
  PRMessageRepository,
  type PRMessageWithAuthor,
} from "../../../repositories/PRMessageRepository";
import {
  createPRMessagePersistenceTransactionPort,
  type PRMessagePersistenceAuthorKind,
} from "../adapters/pr-message-persistence-transaction";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import {
  PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES,
  PR_MESSAGE_RATE_LIMIT_WINDOW_MS,
  buildPRMessageThreadState,
  toPRMessageThreadItem,
  type CreatePRMessageResponse,
} from "../services/pr-message-thread.service";
import type { PRDraftActor } from "../services/draft-access-policy.service";

const messageRepo = new PRMessageRepository();
const messagePersistence = createPRMessagePersistenceTransactionPort();

type AtomicPRMessageSource = {
  prId: PRId;
  authorUserId: UserId;
  body: string;
  authorKind: PRMessagePersistenceAuthorKind;
  actorUserId: UserId | null;
  action: string;
  prMissingDetail: string;
};

const ACTIVE_PARTICIPANT_MESSAGE_DETAIL = "Only current active participants can access PR messages";

/**
 * The one private bridge from named PR message commands to the atomic source
 * transaction. It deliberately does not expose legacy inbox/wave controls:
 * callers choose only a semantic source kind and receive the committed message
 * projection needed by their own narrow response contract.
 */
const persistAtomicPRMessage = async (
  input: AtomicPRMessageSource,
): Promise<PRMessageWithAuthor> => {
  const persisted = await messagePersistence.persist({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body: input.body,
    authorKind: input.authorKind,
  });

  if (persisted.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: input.prMissingDetail });
  }
  if (persisted.outcome === "AUTHOR_NOT_ACTIVE_PARTICIPANT") {
    return throwHttpProblem({ status: 403, detail: ACTIVE_PARTICIPANT_MESSAGE_DETAIL });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: input.action,
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      messageId: persisted.message.id,
    },
  });

  return persisted.message;
};

const toCreatedMessageResponse = (message: PRMessageWithAuthor): CreatePRMessageResponse => ({
  message: toPRMessageThreadItem(message),
  thread: buildPRMessageThreadState(message.id, message.id),
});

export async function createPRMessage(input: {
  prId: PRId;
  authorUserId: UserId;
  body: string;
  actor?: PRDraftActor;
}) {
  await requirePRMessageParticipantAccess(
    input.prId,
    input.authorUserId,
    input.actor ?? { userId: input.authorUserId, roles: ["anonymous"] },
  );
  const body = prMessageBodySchema.parse(input.body);

  const recentMessageCount = await messageRepo.countByAuthorSince(
    input.prId,
    input.authorUserId,
    new Date(Date.now() - PR_MESSAGE_RATE_LIMIT_WINDOW_MS),
  );
  if (recentMessageCount >= PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES) {
    return throwHttpProblem({ status: 429, detail: "Too many messages sent in a short time" });
  }

  const message = await persistAtomicPRMessage({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body,
    authorKind: "ACTIVE_PARTICIPANT",
    actorUserId: input.authorUserId,
    action: "pr.create_message",
    prMissingDetail: "Partner request not found",
  });
  return toCreatedMessageResponse(message);
}

/**
 * Curated PR command for an admin-authenticated caller. Admin authorization
 * remains owned by the Admin domain; PR owns the atomic message source and
 * refuses to turn an operator into a participant.
 */
export async function createOperatorPRMessage(input: {
  prId: PRId;
  authorUserId: UserId;
  body: string;
}): Promise<CreatePRMessageResponse> {
  const message = await persistAtomicPRMessage({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body: prMessageBodySchema.parse(input.body),
    authorKind: "OPERATOR_OR_SYSTEM",
    actorUserId: input.authorUserId,
    action: "pr.create_system_message",
    prMissingDetail: "PR not found",
  });
  return toCreatedMessageResponse(message);
}

/**
 * A content update has already committed its own PR-owned transaction before
 * it reaches this command. This is system context caused by that committed
 * mutation, rather than a new participant-post command: a concurrent creator
 * exit must not make the already-committed content update fail or re-run.
 */
export async function createCoreFieldChangePRMessage(input: {
  prId: PRId;
  authorUserId: UserId;
  body: string;
}): Promise<void> {
  await persistAtomicPRMessage({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body: prMessageBodySchema.parse(input.body),
    authorKind: "OPERATOR_OR_SYSTEM",
    actorUserId: input.authorUserId,
    action: "pr.notify_core_field_change",
    prMissingDetail: "Partner request not found",
  });
}
