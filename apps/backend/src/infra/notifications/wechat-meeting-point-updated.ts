import type { PRId, PartnerRequest } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import {
  MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  buildMeetingPointUpdatedDedupeKey,
  buildMeetingPointUpdatedDedupePrefixForUser,
  clearMeetingPointUpdatedNotificationCredits,
  collectMeetingPointUpdatedNotificationRecipients,
  consumeMeetingPointUpdatedNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  meetingPointUpdatedNotificationJobPayloadSchema,
  prepareMeetingPointUpdatedNotificationDispatch,
  recordMeetingPointUpdatedNotificationDelivery,
  toDispatchFailureError,
} from "../../domains/notification";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { meetingPointUpdatedSchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_MEETING_POINT_UPDATED_JOB_TYPE = "wechat.notification.meeting-point-updated";

let meetingPointUpdatedHandlerRegistered = false;

async function handleMeetingPointUpdatedJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = meetingPointUpdatedNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid meeting point updated notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareMeetingPointUpdatedNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordMeetingPointUpdatedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  );
  if (!configured) {
    await recordMeetingPointUpdatedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "MEETING_POINT_UPDATED_CHANNEL_NOT_CONFIGURED",
      errorMessage: "Meeting point update subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: MEETING_POINT_UPDATED_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    updateType: prepared.message.updateType,
    operatorName: prepared.message.operatorName,
    updatedAt: prepared.message.updatedAt,
    meetingPointDescription: prepared.message.meetingPointDescription,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordMeetingPointUpdatedNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeMeetingPointUpdatedNotificationCredit(prepared.recipient.id);
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatMeetingPointUpdatedJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearMeetingPointUpdatedNotificationCredits(prepared.recipient.id);
    await cancelWeChatMeetingPointUpdatedJobsForUser(prepared.recipient.id);
  }

  await recordMeetingPointUpdatedNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatMeetingPointUpdatedJobs(): void {
  if (meetingPointUpdatedHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_MEETING_POINT_UPDATED_JOB_TYPE, handleMeetingPointUpdatedJob);
  meetingPointUpdatedHandlerRegistered = true;
}

export async function scheduleWeChatMeetingPointUpdatedNotifications(input: {
  request: Pick<PartnerRequest, "id">;
  meetingPointDescription: string;
  updatedAt: Date;
}): Promise<void> {
  const description = input.meetingPointDescription.trim();
  if (!description) {
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  );
  if (!configured) {
    return;
  }

  const recipientUserIds = await collectMeetingPointUpdatedNotificationRecipients(input.request);
  const scheduledAt = new Date();
  const updatedAtIso = input.updatedAt.toISOString();

  for (const recipientUserId of recipientUserIds) {
    const dedupeKey = buildMeetingPointUpdatedDedupeKey(
      recipientUserId,
      input.request.id,
      updatedAtIso,
    );
    const scheduleResult = await jobRunner.scheduleOnce({
      jobType: WECHAT_MEETING_POINT_UPDATED_JOB_TYPE,
      runAt: scheduledAt,
      ...meetingPointUpdatedSchedulePolicy,
      dedupeKey,
      payload: {
        prId: input.request.id,
        recipientUserId,
        meetingPointDescription: description,
        updatedAtIso,
        scheduledAtIso: scheduledAt.toISOString(),
      },
    });
    await createNotificationOpportunity({
      notificationKind: MEETING_POINT_UPDATED_NOTIFICATION_KIND,
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
        meetingPointDescription: description,
        updatedAtIso,
      },
    });
    await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
  }
}

export async function cancelWeChatMeetingPointUpdatedJobsForUser(userId: UserId): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_MEETING_POINT_UPDATED_JOB_TYPE,
    dedupeKeyPrefix: buildMeetingPointUpdatedDedupePrefixForUser(userId),
  });
}

export type { PRId };
