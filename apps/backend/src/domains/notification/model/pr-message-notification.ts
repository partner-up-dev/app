import { z } from "zod";
import type { PRId } from "../../../entities/partner-request";
import { userIdSchema, type UserId } from "../../../entities/user";
import type { PRMessageId } from "../../../entities/pr-message";
import { WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL } from "./notification-channel";
import { PR_MESSAGE_NOTIFICATION_KIND } from "./notification-kind";

export { PR_MESSAGE_NOTIFICATION_KIND };
export const PR_MESSAGE_NOTIFICATION_CHANNEL = WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL;
export const PR_MESSAGE_DEBOUNCE_WINDOW_MS = 5 * 60 * 1_000;

const PR_MESSAGE_DEDUPE_PREFIX = "wechat-pr-message";

export const prMessageNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  waveStartAuthorUserId: userIdSchema,
  waveStartMessageId: z.coerce.number().int().positive(),
  firstUnreadMessageCreatedAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime(),
});

export type PRMessageNotificationJobPayload = z.infer<typeof prMessageNotificationJobPayloadSchema>;

export type PRMessageNotificationScheduleInput = {
  request: {
    id: PRId;
  };
  recipientUserId: UserId;
  authorUserId: UserId;
  waveStartMessageId: PRMessageId;
  firstUnreadMessageCreatedAt: Date;
};

export type PRMessageNotificationScheduleResult = {
  jobId: number | null;
};

export type PRMessageNotificationScheduler = (
  input: PRMessageNotificationScheduleInput,
) => Promise<PRMessageNotificationScheduleResult | void>;

export const resolvePRMessageNotificationRunAt = (firstUnreadMessageCreatedAt: Date): Date =>
  new Date(firstUnreadMessageCreatedAt.getTime() + PR_MESSAGE_DEBOUNCE_WINDOW_MS);

export const buildPRMessageDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  waveStartMessageId: PRMessageId,
): string => `${PR_MESSAGE_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${waveStartMessageId}`;

export const buildPRMessageDedupePrefixForUser = (userId: UserId): string =>
  `${PR_MESSAGE_DEDUPE_PREFIX}:${userId}:`;
