import { z } from "zod";
import { userIdSchema } from "../../entities/user";
import type { UserNotificationOpt } from "../../entities/user-notification-opt";
import { db } from "../../lib/db";
import { UserNotificationOptRepository } from "../../repositories/UserNotificationOptRepository";
import type { NotificationInvalidationResult } from "./contracts";
import { createTransactionBoundPRMessageSummaryNotificationInvalidationPort } from "./transaction";

export const prMessageNotificationSubscriptionActionSchema = z.enum(["ADD_ONE", "CLEAR"]);

export const prMessageNotificationSubscriptionUpdateSchema = z
  .object({
    recipientUserId: userIdSchema,
    action: prMessageNotificationSubscriptionActionSchema,
  })
  .strict();

export type PRMessageNotificationSubscriptionAction = z.infer<
  typeof prMessageNotificationSubscriptionActionSchema
>;

export type PRMessageNotificationSubscriptionUpdate = z.infer<
  typeof prMessageNotificationSubscriptionUpdateSchema
>;

/**
 * Preference and finite WeChat credit remain one provider-facing state, but
 * callers receive only its stable semantic facts rather than a persistence
 * row. A zero-to-positive transition deliberately does not replay history.
 */
export type PRMessageNotificationSubscriptionState = {
  preferred: boolean;
  remainingCredit: number;
};

export type PRMessageNotificationSubscriptionUpdateResult = {
  previous: PRMessageNotificationSubscriptionState;
  current: PRMessageNotificationSubscriptionState;
  invalidated: NotificationInvalidationResult;
};

const toSubscriptionState = (
  option: UserNotificationOpt | null,
): PRMessageNotificationSubscriptionState => ({
  preferred: option?.wechatPrMessageOptIn ?? false,
  remainingCredit: option?.wechatPrMessageRemainingCount ?? 0,
});

/**
 * Mutates the PR-message preference/credit state and its held attention
 * windows as one transaction. The locked option row is also the source-time
 * serialization point used by PR message creation.
 */
export const updatePRMessageNotificationSubscription = async (
  input: PRMessageNotificationSubscriptionUpdate,
): Promise<PRMessageNotificationSubscriptionUpdateResult> => {
  const parsed = prMessageNotificationSubscriptionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("INVALID_PR_MESSAGE_NOTIFICATION_SUBSCRIPTION_UPDATE");
  }

  return db.transaction(async (tx) => {
    const notificationOptRepo = new UserNotificationOptRepository();
    const previous = toSubscriptionState(
      await notificationOptRepo.findByUserIdForUpdateInTransaction(tx, parsed.data.recipientUserId),
    );
    const updated =
      parsed.data.action === "ADD_ONE"
        ? await notificationOptRepo.addOneWechatPRMessageCreditInTransaction(
            tx,
            parsed.data.recipientUserId,
          )
        : await notificationOptRepo.clearWechatPRMessageCreditsInTransaction(
            tx,
            parsed.data.recipientUserId,
          );
    if (!updated) {
      throw new Error("PR_MESSAGE_NOTIFICATION_SUBSCRIPTION_WRITE_FAILED");
    }

    const current = toSubscriptionState(updated);
    const invalidationPort = createTransactionBoundPRMessageSummaryNotificationInvalidationPort({
      executor: tx,
    });
    const mustInvalidateCurrentWindow =
      parsed.data.action === "CLEAR" ||
      (previous.remainingCredit <= 0 && current.remainingCredit > 0);
    const invalidated = mustInvalidateCurrentWindow
      ? await invalidationPort.invalidateForRecipient({
          recipientUserId: parsed.data.recipientUserId,
        })
      : { released: 0, canceled: 0 };

    return { previous, current, invalidated };
  });
};

/** Provider-side permission revocation follows the same serialized seam. */
export const clearPRMessageNotificationPermission = (input: { recipientUserId: string }) =>
  updatePRMessageNotificationSubscription({
    recipientUserId: input.recipientUserId,
    action: "CLEAR",
  });
