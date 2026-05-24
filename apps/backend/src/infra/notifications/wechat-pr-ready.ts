import type { PartnerRequest } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import {
  PR_READY_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  buildPRReadyDedupeKey,
  buildPRReadyDedupePrefixForUser,
  clearPRReadyNotificationCredits,
  collectPRReadyNotificationRecipients,
  consumePRReadyNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  prReadyNotificationJobPayloadSchema,
  preparePRReadyNotificationDispatch,
  recordPRReadyNotificationDelivery,
  toDispatchFailureError,
} from "../../domains/notification";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { prReadySchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_PR_READY_JOB_TYPE = "wechat.notification.pr-ready";

let prReadyHandlerRegistered = false;

async function handlePRReadyJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = prReadyNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid PR ready notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await preparePRReadyNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordPRReadyNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured =
    await isWeChatSubscriptionNotificationConfigured(PR_READY_NOTIFICATION_KIND);
  if (!configured) {
    await recordPRReadyNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "PR_READY_CHANNEL_NOT_CONFIGURED",
      errorMessage: "PR ready subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: PR_READY_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    title: prepared.message.title,
    type: prepared.message.type,
    status: prepared.message.status,
    remark: prepared.message.remark,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordPRReadyNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumePRReadyNotificationCredit(
      prepared.recipient.id,
    );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatPRReadyJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearPRReadyNotificationCredits(prepared.recipient.id);
    await cancelWeChatPRReadyJobsForUser(prepared.recipient.id);
  }

  await recordPRReadyNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatPRReadyJobs(): void {
  if (prReadyHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_PR_READY_JOB_TYPE, handlePRReadyJob);
  prReadyHandlerRegistered = true;
}

export async function scheduleWeChatPRReadyNotifications(input: {
  request: PartnerRequest;
  readyAt: Date;
}): Promise<void> {
  const configured =
    await isWeChatSubscriptionNotificationConfigured(PR_READY_NOTIFICATION_KIND);
  if (!configured) {
    return;
  }

  const recipientUserIds = await collectPRReadyNotificationRecipients(
    input.request,
  );
  const scheduledAt = new Date();

  for (const recipientUserId of recipientUserIds) {
    const dedupeKey = buildPRReadyDedupeKey(
      recipientUserId,
      input.request.id,
      input.readyAt,
    );
    const scheduleResult = await jobRunner.scheduleOnce({
      jobType: WECHAT_PR_READY_JOB_TYPE,
      runAt: scheduledAt,
      ...prReadySchedulePolicy,
      dedupeKey,
      payload: {
        prId: input.request.id,
        recipientUserId,
        readyAtIso: input.readyAt.toISOString(),
        scheduledAtIso: scheduledAt.toISOString(),
      },
    });
    await createNotificationOpportunity({
      notificationKind: PR_READY_NOTIFICATION_KIND,
      lifecycleModel: "ONE_SHOT",
      aggregateType: "partner_request",
      aggregateId: String(input.request.id),
      recipientUserId,
      channel: WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
      runAt: scheduledAt,
      dedupeKey,
      payload: {
        prId: input.request.id,
        recipientUserId,
        readyAtIso: input.readyAt.toISOString(),
      },
    });
    await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
  }
}

export async function cancelWeChatPRReadyJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_PR_READY_JOB_TYPE,
    dedupeKeyPrefix: buildPRReadyDedupePrefixForUser(userId),
  });
}
