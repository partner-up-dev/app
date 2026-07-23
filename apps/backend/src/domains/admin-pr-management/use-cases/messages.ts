import type { PRId } from "../../../entities/partner-request";
import type { PRMessageId } from "../../../entities/pr-message";
import { prMessageBodySchema } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { createOperatorPRMessage } from "../../pr/commands";
import { toPRMessageThreadItem } from "../../pr/queries";
import { createAdminPRMessageWindowLifecycleTransactionPort } from "./pr-message-window-lifecycle-transaction";

const prRepository = new PartnerRequestRepository();
const messageRepository = new PRMessageRepository();
const messageWindowLifecycle = createAdminPRMessageWindowLifecycleTransactionPort();

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
  return createOperatorPRMessage({
    prId: input.prId,
    authorUserId: input.actorUserId,
    body: input.body,
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
  return { message: toMessage(withAuthor) };
};

export const deleteAdminPRMessage = async (input: {
  prId: PRId;
  messageId: PRMessageId;
  actorUserId: UserId | null;
}) => {
  const result = await messageWindowLifecycle.tombstoneMessage({
    prId: input.prId,
    messageId: input.messageId,
  });
  if (result.outcome === "PR_MISSING" || result.outcome === "MESSAGE_NOT_VISIBLE") {
    return throwHttpProblem({ status: 404, detail: "PR message not found" });
  }
  return { ok: true as const, messageId: input.messageId };
};
