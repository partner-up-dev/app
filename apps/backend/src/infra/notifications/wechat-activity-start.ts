import type { PRId, PartnerRequest } from "../../entities/partner-request";
import type { UserId } from "../../entities/user";
import {
  ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  activityStartReminderNotificationJobPayloadSchema,
  buildActivityStartReminderDedupeKey,
  buildActivityStartReminderDedupePrefixForUser,
  clearActivityStartReminderNotificationCredits,
  consumeActivityStartReminderNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  prepareActivityStartReminderNotificationDispatch,
  recordActivityStartReminderNotificationDelivery,
  resolveActivityStartReminderRunAt,
  shouldScheduleActivityStartReminderNotification,
  toDispatchFailureError,
} from "../../domains/notification";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { jobRunner, type JobHandlerContext } from "../jobs";
import { activityStartReminderSchedulePolicy } from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE = "wechat.notification.activity-start-reminder";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

let activityStartReminderHandlerRegistered = false;

async function handleActivityStartReminderJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = activityStartReminderNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid activity start reminder job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareActivityStartReminderNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordActivityStartReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  );
  if (!configured) {
    await recordActivityStartReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "ACTIVITY_START_REMINDER_CHANNEL_NOT_CONFIGURED",
      errorMessage: "Activity start reminder subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    activityName: prepared.message.activityName,
    startAt: prepared.message.startAt,
    location: prepared.message.location,
    remark: prepared.message.remark,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordActivityStartReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeActivityStartReminderNotificationCredit(
      prepared.recipient.id,
    );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatActivityStartReminderJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearActivityStartReminderNotificationCredits(prepared.recipient.id);
    await cancelWeChatActivityStartReminderJobsForUser(prepared.recipient.id);
  }

  await recordActivityStartReminderNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatActivityStartReminderJobs(): void {
  if (activityStartReminderHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(
    WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    handleActivityStartReminderJob,
  );
  activityStartReminderHandlerRegistered = true;
}

export async function scheduleWeChatActivityStartReminderJobForParticipant(
  request: PartnerRequest,
  userId: UserId,
): Promise<void> {
  if (!(await shouldScheduleActivityStartReminderNotification({ request, userId }))) {
    return;
  }

  const runAt = resolveActivityStartReminderRunAt(request);
  if (!runAt || runAt.getTime() <= Date.now()) {
    return;
  }

  const dedupeKey = buildActivityStartReminderDedupeKey(request.id, userId);
  const scheduleResult = await jobRunner.scheduleOnce({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    runAt,
    ...activityStartReminderSchedulePolicy,
    dedupeKey,
    payload: {
      prId: request.id,
      userId,
      scheduledAtIso: runAt.toISOString(),
    },
  });
  await createNotificationOpportunity({
    notificationKind: ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
    lifecycleModel: "ONE_SHOT",
    aggregateType: "partner_request",
    aggregateId: String(request.id),
    recipientUserId: userId,
    channel: WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
    runAt,
    dedupeKey,
    payload: {
      prId: request.id,
      userId,
    },
  });
  await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
}

export async function cancelWeChatActivityStartReminderJobsForParticipant(
  prId: PRId,
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    dedupeKey: buildActivityStartReminderDedupeKey(prId, userId),
  });
}

export async function cancelWeChatActivityStartReminderJobsForUser(
  userId: UserId,
): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_ACTIVITY_START_REMINDER_JOB_TYPE,
    dedupeKeyPrefix: buildActivityStartReminderDedupePrefixForUser(userId),
  });
}

export async function rebuildWeChatActivityStartReminderJobsForUser(userId: UserId): Promise<void> {
  await cancelWeChatActivityStartReminderJobsForUser(userId);

  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const requests = await prRepo.findByIds(uniquePrIds);
  for (const request of requests) {
    await scheduleWeChatActivityStartReminderJobForParticipant(request, userId);
  }
}
