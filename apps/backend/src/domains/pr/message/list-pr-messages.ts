import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import { buildPRMessageThreadResponse } from "../services/pr-message-thread.service";
import type { PRDraftActor } from "../services/draft-access-policy.service";

const messageRepo = new PRMessageRepository();

export async function listPRMessages(
  prId: PRId,
  viewerUserId: UserId | null,
  actor: PRDraftActor = { userId: viewerUserId, roles: ["anonymous"] },
) {
  await requirePRMessageParticipantAccess(prId, viewerUserId, actor);

  const [messages, acknowledgementCursor] = await Promise.all([
    messageRepo.listByPrId(prId),
    messageRepo.findLatestAcknowledgementCursorByPrId(prId),
  ]);

  return buildPRMessageThreadResponse({
    messages,
    acknowledgementCursor,
  });
}
