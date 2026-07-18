import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import { buildPRMessageThreadResponse } from "../services/pr-message-thread.service";
import type { PRDraftActor } from "../services/draft-access-policy.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function listPRMessages(
  prId: PRId,
  viewerUserId: UserId,
  actor: PRDraftActor = { userId: viewerUserId, roles: ["anonymous"] },
) {
  await requirePRMessageParticipantAccess(prId, viewerUserId, actor);

  const [messages, inboxState] = await Promise.all([
    messageRepo.listByPrId(prId),
    inboxStateRepo.findByPrIdAndUserId(prId, viewerUserId),
  ]);

  return buildPRMessageThreadResponse({
    messages,
    inboxState,
  });
}
