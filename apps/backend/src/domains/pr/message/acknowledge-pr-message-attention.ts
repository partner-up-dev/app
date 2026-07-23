import type { PRMessageId } from "../../../entities/pr-message";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { acknowledgeNotification } from "../../notification";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import type { PRDraftActor } from "../services/draft-access-policy.service";
import { requirePRMessageParticipantAccess } from "../services/pr-message-access.service";

const messageRepo = new PRMessageRepository();

/**
 * PR owns participant access and stream-cursor validity. Notification then
 * translates these semantic facts into its private generic held-window key.
 */
export const acknowledgePRMessageAttention = async (input: {
  prId: PRId;
  userId: UserId;
  acknowledgementCursor: PRMessageId;
  actor?: PRDraftActor;
}): Promise<{ ok: true }> => {
  await requirePRMessageParticipantAccess(
    input.prId,
    input.userId,
    input.actor ?? { userId: input.userId, roles: ["anonymous"] },
  );

  const cursorMessage = await messageRepo.findByPrIdAndIdIncludingTombstone(
    input.prId,
    input.acknowledgementCursor,
  );
  if (!cursorMessage) {
    return throwHttpProblem({
      status: 400,
      detail: "Acknowledgement cursor must point to an existing message in this PR",
    });
  }

  await acknowledgeNotification({
    template: "pr.message-summary",
    aggregate: { type: "partner_request", id: String(input.prId) },
    recipientUserId: input.userId,
    throughCursor: input.acknowledgementCursor,
  });
  return { ok: true };
};
