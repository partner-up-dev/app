import type { PartnerId } from "../../entities/partner";
import type { PRId } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import {
  WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  buildWaitlistAlternativeAvailableDedupeKey,
  buildWaitlistAlternativeAvailableDedupePrefixForUser,
  clearWaitlistAlternativeAvailableNotificationCredits,
  consumeWaitlistAlternativeAvailableNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  prepareWaitlistAlternativeAvailableNotificationDispatch,
  recordWaitlistAlternativeAvailableNotificationDelivery,
  toDispatchFailureError,
  waitlistAlternativeAvailableNotificationJobPayloadSchema,
} from "../../domains/notification";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { waitlistAlternativeAvailableSchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_WAITLIST_ALTERNATIVE_AVAILABLE_JOB_TYPE =
  "wechat.notification.waitlist-alternative-available";

let waitlistAlternativeAvailableHandlerRegistered = false;

async function handleWaitlistAlternativeAvailableJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult =
    waitlistAlternativeAvailableNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid waitlist alternative available notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareWaitlistAlternativeAvailableNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordWaitlistAlternativeAvailableNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );
  if (!configured) {
    await recordWaitlistAlternativeAvailableNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "WAITLIST_ALTERNATIVE_AVAILABLE_CHANNEL_NOT_CONFIGURED",
      errorMessage: "Waitlist alternative available subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    title: prepared.message.title,
    status: prepared.message.status,
    remark: prepared.message.remark,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordWaitlistAlternativeAvailableNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeWaitlistAlternativeAvailableNotificationCredit(
      prepared.recipient.id,
    );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatWaitlistAlternativeAvailableJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearWaitlistAlternativeAvailableNotificationCredits(prepared.recipient.id);
    await cancelWeChatWaitlistAlternativeAvailableJobsForUser(prepared.recipient.id);
  }

  await recordWaitlistAlternativeAvailableNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatWaitlistAlternativeAvailableJobs(): void {
  if (waitlistAlternativeAvailableHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(
    WECHAT_WAITLIST_ALTERNATIVE_AVAILABLE_JOB_TYPE,
    handleWaitlistAlternativeAvailableJob,
  );
  waitlistAlternativeAvailableHandlerRegistered = true;
}

export async function scheduleWeChatWaitlistAlternativeAvailableNotification(input: {
  sourcePrId: PRId;
  sourcePartnerId: PartnerId;
  candidatePrId: PRId;
  recipientUserId: UserId;
}): Promise<void> {
  const configured = await isWeChatSubscriptionNotificationConfigured(
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );
  if (!configured) {
    return;
  }

  const scheduledAt = new Date();
  const payload = {
    sourcePrId: input.sourcePrId,
    sourcePartnerId: input.sourcePartnerId,
    candidatePrId: input.candidatePrId,
    recipientUserId: input.recipientUserId,
    scheduledAtIso: scheduledAt.toISOString(),
  };
  const prepared = await prepareWaitlistAlternativeAvailableNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    return;
  }

  const dedupeKey = buildWaitlistAlternativeAvailableDedupeKey(
    input.recipientUserId,
    input.sourcePartnerId,
    input.candidatePrId,
  );
  const scheduleResult = await jobRunner.scheduleOnce({
    jobType: WECHAT_WAITLIST_ALTERNATIVE_AVAILABLE_JOB_TYPE,
    runAt: scheduledAt,
    ...waitlistAlternativeAvailableSchedulePolicy,
    dedupeKey,
    payload,
  });
  await createNotificationOpportunity({
    notificationKind: WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
    lifecycleModel: "ONE_SHOT",
    aggregateType: "partner_request",
    aggregateId: String(input.candidatePrId),
    recipientUserId: input.recipientUserId,
    channel: WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
    runAt: scheduledAt,
    dedupeKey,
    payload,
  });
  await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
}

export async function cancelWeChatWaitlistAlternativeAvailableJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_WAITLIST_ALTERNATIVE_AVAILABLE_JOB_TYPE,
    dedupeKeyPrefix: buildWaitlistAlternativeAvailableDedupePrefixForUser(userId),
  });
}
