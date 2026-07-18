import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";
import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";
import { buildPRMessageThreadState } from "../services/pr-message-thread.service";
import type { PRDraftActor } from "../services/draft-access-policy.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function advancePRMessageReadMarker(input: {
  prId: PRId;
  userId: UserId;
  lastReadMessageId: PRMessageId;
  actor?: PRDraftActor;
}) {
  const { prId, userId, lastReadMessageId } = input;
  await requirePRMessageParticipantAccess(
    prId,
    userId,
    input.actor ?? { userId, roles: ["anonymous"] },
  );

  const targetMessage = await messageRepo.findByPrIdAndId(prId, lastReadMessageId);
  if (!targetMessage) {
    return throwHttpProblem({
      status: 400,
      detail: "Read marker must point to an existing message in this PR",
    });
  }

  const [inboxState, latestVisibleMessageId] = await Promise.all([
    inboxStateRepo.upsertLastReadMessageId(prId, userId, lastReadMessageId),
    messageRepo.findLatestIdByPrId(prId),
  ]);

  return {
    ok: true,
    thread: buildPRMessageThreadState(latestVisibleMessageId, inboxState),
  };
}
