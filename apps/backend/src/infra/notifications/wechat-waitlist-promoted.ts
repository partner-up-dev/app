import type { PartnerId } from "../../entities/partner";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import {
  WAITLIST_PROMOTED_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  buildWaitlistPromotedDedupeKey,
  buildWaitlistPromotedDedupePrefixForUser,
  clearWaitlistPromotedNotificationCredits,
  consumeWaitlistPromotedNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  prepareWaitlistPromotedNotificationDispatch,
  recordWaitlistPromotedNotificationDelivery,
  toDispatchFailureError,
  waitlistPromotedNotificationJobPayloadSchema,
} from "../../domains/notification";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { waitlistPromotedSchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_WAITLIST_PROMOTED_JOB_TYPE = "wechat.notification.waitlist-promoted";

let waitlistPromotedHandlerRegistered = false;

async function handleWaitlistPromotedJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = waitlistPromotedNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid waitlist promoted notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareWaitlistPromotedNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordWaitlistPromotedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    WAITLIST_PROMOTED_NOTIFICATION_KIND,
  );
  if (!configured) {
    await recordWaitlistPromotedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "WAITLIST_PROMOTED_CHANNEL_NOT_CONFIGURED",
      errorMessage: "Waitlist promoted subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: WAITLIST_PROMOTED_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    title: prepared.message.title,
    status: prepared.message.status,
    remark: prepared.message.remark,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordWaitlistPromotedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeWaitlistPromotedNotificationCredit(prepared.recipient.id);
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatWaitlistPromotedJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearWaitlistPromotedNotificationCredits(prepared.recipient.id);
    await cancelWeChatWaitlistPromotedJobsForUser(prepared.recipient.id);
  }

  await recordWaitlistPromotedNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatWaitlistPromotedJobs(): void {
  if (waitlistPromotedHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_WAITLIST_PROMOTED_JOB_TYPE, handleWaitlistPromotedJob);
  waitlistPromotedHandlerRegistered = true;
}

export async function scheduleWeChatWaitlistPromotedNotificationForParticipant(input: {
  request: PartnerRequest;
  userId: UserId;
  partnerId: PartnerId;
  promotedAt: Date;
}): Promise<void> {
  const configured = await isWeChatSubscriptionNotificationConfigured(
    WAITLIST_PROMOTED_NOTIFICATION_KIND,
  );
  if (!configured) {
    return;
  }

  const scheduledAt = new Date();
  const payload = {
    prId: input.request.id,
    recipientUserId: input.userId,
    partnerId: input.partnerId,
    promotedAtIso: input.promotedAt.toISOString(),
    scheduledAtIso: scheduledAt.toISOString(),
  };
  const prepared = await prepareWaitlistPromotedNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    return;
  }

  const dedupeKey = buildWaitlistPromotedDedupeKey(input.userId, input.request.id, input.partnerId);
  const scheduleResult = await jobRunner.scheduleOnce({
    jobType: WECHAT_WAITLIST_PROMOTED_JOB_TYPE,
    runAt: scheduledAt,
    ...waitlistPromotedSchedulePolicy,
    dedupeKey,
    payload,
  });
  await createNotificationOpportunity({
    notificationKind: WAITLIST_PROMOTED_NOTIFICATION_KIND,
    lifecycleModel: "ONE_SHOT",
    aggregateType: "partner_request",
    aggregateId: String(input.request.id),
    recipientUserId: input.userId,
    channel: WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
    runAt: scheduledAt,
    dedupeKey,
    payload: {
      prId: input.request.id,
      recipientUserId: input.userId,
      partnerId: input.partnerId,
      promotedAtIso: input.promotedAt.toISOString(),
    },
  });
  await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
}

export async function cancelWeChatWaitlistPromotedJobsForUser(userId: UserId): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_WAITLIST_PROMOTED_JOB_TYPE,
    dedupeKeyPrefix: buildWaitlistPromotedDedupePrefixForUser(userId),
  });
}

export type { PRId };
