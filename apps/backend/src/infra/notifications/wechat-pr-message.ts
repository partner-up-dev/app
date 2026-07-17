import type { PRId } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { prMessageSchedulePolicy } from "./job-schedule-policy";
import {
  buildPRMessageDedupeKey,
  buildPRMessageDedupePrefixForUser,
  clearPRMessageNotificationCredits,
  consumePRMessageNotificationCredit,
  isRecipientPermissionRevoked,
  preparePRMessageNotificationDispatch,
  PR_MESSAGE_NOTIFICATION_KIND,
  prMessageNotificationJobPayloadSchema,
  recordPRMessageNotificationDelivery,
  resolvePRMessageNotificationRunAt,
} from "../../domains/notification";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_PR_MESSAGE_JOB_TYPE = "wechat.notification.pr-message";

let prMessageHandlerRegistered = false;

async function handlePRMessageJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = prMessageNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid PR message notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await preparePRMessageNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordPRMessageNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(PR_MESSAGE_NOTIFICATION_KIND);
  if (!configured) {
    await recordPRMessageNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "PR_MESSAGE_CHANNEL_NOT_CONFIGURED",
      errorMessage: "PR message subscription channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: PR_MESSAGE_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    threadTitle: prepared.message.threadTitle,
    authorName: prepared.message.authorName,
    sentAt: prepared.message.sentAt,
    messageSummary: prepared.message.messageSummary,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    const consumeResult = await consumePRMessageNotificationCredit(prepared.recipient.id);
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatPRMessageJobsForUser(prepared.recipient.id);
    }
    await recordPRMessageNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearPRMessageNotificationCredits(prepared.recipient.id);
    await cancelWeChatPRMessageJobsForUser(prepared.recipient.id);
  }

  await recordPRMessageNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
}

export function registerWeChatPRMessageJobs(): void {
  if (prMessageHandlerRegistered) {
    return;
  }

  jobRunner.registerHandler(WECHAT_PR_MESSAGE_JOB_TYPE, handlePRMessageJob);
  prMessageHandlerRegistered = true;
}

export const isWeChatPRMessageNotificationConfigured = (): Promise<boolean> =>
  isWeChatSubscriptionNotificationConfigured(PR_MESSAGE_NOTIFICATION_KIND);

export async function scheduleWeChatPRMessageNotification(input: {
  request: {
    id: PRId;
  };
  recipientUserId: UserId;
  authorUserId: UserId;
  waveStartMessageId: number;
  firstUnreadMessageCreatedAt: Date;
}): Promise<{ jobId: number | null }> {
  const runAt = resolvePRMessageNotificationRunAt(input.firstUnreadMessageCreatedAt);

  const result = await jobRunner.scheduleOnce({
    jobType: WECHAT_PR_MESSAGE_JOB_TYPE,
    runAt,
    ...prMessageSchedulePolicy,
    dedupeKey: buildPRMessageDedupeKey(
      input.recipientUserId,
      input.request.id,
      input.waveStartMessageId,
    ),
    payload: {
      prId: input.request.id,
      recipientUserId: input.recipientUserId,
      waveStartAuthorUserId: input.authorUserId,
      waveStartMessageId: input.waveStartMessageId,
      firstUnreadMessageCreatedAtIso: input.firstUnreadMessageCreatedAt.toISOString(),
      scheduledAtIso: runAt.toISOString(),
    },
  });

  return {
    jobId: result.jobId,
  };
}

export async function cancelWeChatPRMessageJobsForUser(userId: UserId): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_PR_MESSAGE_JOB_TYPE,
    dedupeKeyPrefix: buildPRMessageDedupePrefixForUser(userId),
  });
}
