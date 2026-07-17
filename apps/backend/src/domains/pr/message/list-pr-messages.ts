import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../../pr-core/services/pr-message-access.service";
import { buildPRMessageThreadResponse } from "../../pr-core/services/pr-message-thread.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function listPRMessages(prId: PRId, viewerUserId: UserId) {
  await requirePRMessageParticipantAccess(prId, viewerUserId);

  const [messages, inboxState] = await Promise.all([
    messageRepo.listByPrId(prId),
    inboxStateRepo.findByPrIdAndUserId(prId, viewerUserId),
  ]);

  return buildPRMessageThreadResponse({
    messages,
    inboxState,
  });
}
