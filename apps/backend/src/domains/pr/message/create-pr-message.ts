import { throwHttpProblem } from "../../../lib/problem-details";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import { prMessageBodySchema } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import {
  isWeChatPRMessageNotificationConfigured,
  scheduleWeChatPRMessageNotification,
} from "../../../infra/notifications/wechat-pr-message";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { createPRMessageUnreadWaveNotificationOpportunities } from "../../notification/services/pr-message-unread-wave.service";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import {
  PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES,
  PR_MESSAGE_RATE_LIMIT_WINDOW_MS,
  buildPRMessageThreadState,
  toPRMessageThreadItem,
} from "../services/pr-message-thread.service";
import type { PRDraftActor } from "../services/draft-access-policy.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function createPRMessage(input: {
  prId: PRId;
  authorUserId: UserId;
  body: string;
  actor?: PRDraftActor;
}) {
  const { request } = await requirePRMessageParticipantAccess(
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

  return createPersistedPRMessage({
    request,
    prId: input.prId,
    authorUserId: input.authorUserId,
    body,
    actorUserId: input.authorUserId,
    action: "pr.create_message",
    markAuthorRead: true,
  });
}

export async function createPersistedPRMessage(input: {
  request: PartnerRequest;
  prId: PRId;
  authorUserId: UserId;
  body: string;
  actorUserId: UserId | null;
  action: string;
  markAuthorRead: boolean;
}) {
  const createdMessage = await messageRepo.create({
    prId: input.prId,
    authorUserId: input.authorUserId,
    body: input.body,
  });
  if (!createdMessage) {
    return throwHttpProblem({ status: 500, detail: "Failed to create PR message" });
  }

  const [createdMessageWithAuthor, actorInboxState] = await Promise.all([
    messageRepo.findWithAuthorById(createdMessage.id),
    input.markAuthorRead && input.authorUserId
      ? inboxStateRepo.upsertLastReadMessageId(input.prId, input.authorUserId, createdMessage.id)
      : Promise.resolve(null),
  ]);
  if (!createdMessageWithAuthor) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload created PR message" });
  }

  await createPRMessageUnreadWaveNotificationOpportunities({
    request: input.request,
    authorUserId: input.authorUserId,
    messageId: createdMessage.id,
    messageCreatedAt: createdMessage.createdAt,
    isChannelConfigured: isWeChatPRMessageNotificationConfigured,
    scheduleNotification: scheduleWeChatPRMessageNotification,
  });

  operationLogService.log({
    actorId: input.actorUserId,
    action: input.action,
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      messageId: createdMessage.id,
    },
  });

  return {
    message: toPRMessageThreadItem(createdMessageWithAuthor),
    thread: buildPRMessageThreadState(createdMessage.id, actorInboxState),
  };
}
