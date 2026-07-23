import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import type { TransactionExecutor } from "../../../repositories/_executor";
import {
  createTransactionBoundPRMessageSummaryNotificationInvalidationPort,
  type PRMessageSummaryNotificationInvalidationPort,
} from "../../notification";

type CreateNotificationInvalidationPort = (input: {
  executor: TransactionExecutor;
}) => PRMessageSummaryNotificationInvalidationPort;

/**
 * The single PR-to-Notification hand-off for an active participant removal.
 * It accepts only the released membership fact and the already-open PR
 * transaction; Notification owns the private message-window identity.
 */
export const releasePRParticipantMessageWindow = async (input: {
  executor: TransactionExecutor;
  prId: PRId;
  recipientUserId: UserId;
  createNotificationPort?: CreateNotificationInvalidationPort;
}): Promise<void> => {
  const createNotificationPort =
    input.createNotificationPort ??
    createTransactionBoundPRMessageSummaryNotificationInvalidationPort;
  const notificationPort = createNotificationPort({ executor: input.executor });
  await notificationPort.invalidateForRecipientAndAggregate({
    prId: input.prId,
    recipientUserId: input.recipientUserId,
  });
};
