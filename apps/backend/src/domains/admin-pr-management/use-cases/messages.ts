import type { PRId } from "../../../entities/partner-request";
import type { PRMessageId } from "../../../entities/pr-message";
import { prMessageBodySchema } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { createPersistedPRMessage } from "../../pr/commands";
import { toPRMessageThreadItem } from "../../pr/queries";

const prRepository = new PartnerRequestRepository();
const messageRepository = new PRMessageRepository();

const assertPRExists = async (prId: PRId): Promise<void> => {
  if (!(await prRepository.findById(prId)))
    return throwHttpProblem({ status: 404, detail: "PR not found" });
};

const toMessage = (message: Parameters<typeof toPRMessageThreadItem>[0]) => ({
  ...toPRMessageThreadItem(message),
  updatedAt: message.updatedAt.toISOString(),
});

export const listAdminPRMessages = async (prId: PRId) => {
  await assertPRExists(prId);
  const messages = await messageRepository.listByPrId(prId);
  return { items: messages.map(toMessage) };
};

export const createAdminPRMessage = async (input: {
  prId: PRId;
  body: string;
  actorUserId: UserId;
}) => {
  const request = await prRepository.findById(input.prId);
  if (!request) return throwHttpProblem({ status: 404, detail: "PR not found" });
  return createPersistedPRMessage({
    request,
    prId: input.prId,
    authorUserId: input.actorUserId,
    body: prMessageBodySchema.parse(input.body),
    actorUserId: input.actorUserId,
    action: "pr.create_system_message",
    markAuthorRead: false,
  });
};

export const updateAdminPRMessage = async (input: {
  prId: PRId;
  messageId: PRMessageId;
  body: string;
  actorUserId: UserId | null;
}) => {
  const message = await messageRepository.findByPrIdAndId(input.prId, input.messageId);
  if (!message) return throwHttpProblem({ status: 404, detail: "PR message not found" });
  const updated = await messageRepository.updateBody(
    input.messageId,
    prMessageBodySchema.parse(input.body),
  );
  if (!updated) return throwHttpProblem({ status: 500, detail: "Failed to update PR message" });
  const withAuthor = await messageRepository.findWithAuthorById(updated.id);
  if (!withAuthor)
    return throwHttpProblem({ status: 500, detail: "Failed to reload updated PR message" });
  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_update_message",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: { messageId: input.messageId },
  });
  return { message: toMessage(withAuthor) };
};

export const deleteAdminPRMessage = async (input: {
  prId: PRId;
  messageId: PRMessageId;
  actorUserId: UserId | null;
}) => {
  const message = await messageRepository.findByPrIdAndId(input.prId, input.messageId);
  if (!message) return throwHttpProblem({ status: 404, detail: "PR message not found" });
  if (!(await messageRepository.deleteById(input.messageId)))
    return throwHttpProblem({ status: 500, detail: "Failed to delete PR message" });
  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete_message",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: { messageId: input.messageId },
  });
  return { ok: true as const, messageId: input.messageId };
};
