import type { PartnerId } from "../../entities/partner";
import type { PRId, PartnerRequest } from "../../entities/partner-request";
import type { ConfirmationReminderTrigger } from "../../entities/notification-delivery";
import type { UserId } from "../../entities/user";
import {
  CONFIRMATION_REMINDER_TRIGGERS,
  NEW_PARTNER_NOTIFICATION_KIND,
  REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  WECHAT_SUBSCRIPTION_NOTIFICATION_CHANNEL,
  buildConfirmationReminderDedupeKey,
  buildConfirmationReminderDedupePrefixForUser,
  buildNewPartnerDedupeKey,
  buildNewPartnerDedupePrefixForUser,
  clearConfirmationReminderNotificationCredits,
  clearNewPartnerNotificationCredits,
  collectNewPartnerNotificationRecipients,
  confirmationReminderNotificationJobPayloadSchema,
  consumeConfirmationReminderNotificationCredit,
  consumeNewPartnerNotificationCredit,
  createNotificationOpportunity,
  isRecipientPermissionRevoked,
  markNotificationOpportunityScheduled,
  newPartnerNotificationJobPayloadSchema,
  prepareConfirmationReminderNotificationDispatch,
  prepareNewPartnerNotificationDispatch,
  recordConfirmationReminderNotificationDelivery,
  recordNewPartnerNotificationDelivery,
  resolveConfirmationReminderPolicyForRequest,
  resolveConfirmationReminderRunAt,
  shouldScheduleConfirmationReminderNotification,
  toDispatchFailureError,
} from "../../domains/notification";
import { PartnerRepository } from "../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../repositories/PartnerRequestRepository";
import { jobRunner, type JobHandlerContext } from "../jobs";
import {
  newPartnerSchedulePolicy,
  resolveConfirmationReminderSchedulePolicy,
} from "./job-schedule-policy";
import {
  isWeChatSubscriptionNotificationConfigured,
  sendWeChatSubscriptionNotification,
} from "./channels";

const WECHAT_REMINDER_JOB_TYPE = "wechat.reminder.confirmation";
const WECHAT_NEW_PARTNER_JOB_TYPE = "wechat.notification.new-partner";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

let reminderHandlerRegistered = false;
let newPartnerHandlerRegistered = false;

async function handleReminderJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = confirmationReminderNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid wechat reminder job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareConfirmationReminderNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordConfirmationReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const submsgConfigured = await isWeChatSubscriptionNotificationConfigured(
    REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  );
  if (!submsgConfigured) {
    await recordConfirmationReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "REMINDER_CHANNEL_NOT_CONFIGURED",
      errorMessage: "Reminder subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: REMINDER_CONFIRMATION_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    orderContent: prepared.subscriptionMessage.orderContent,
    orderNo: prepared.subscriptionMessage.orderNo,
    appointmentAt: prepared.subscriptionMessage.appointmentAt,
    remark: prepared.subscriptionMessage.remark,
    page: prepared.subscriptionMessage.page,
  });

  if (sendResult.status === "SENT") {
    await recordConfirmationReminderNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeConfirmationReminderNotificationCredit(
      prepared.recipient.id,
    );
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatReminderJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearConfirmationReminderNotificationCredits(prepared.recipient.id);
    await cancelWeChatReminderJobsForUser(prepared.recipient.id);
  }

  await recordConfirmationReminderNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatReminderJobs(): void {
  if (reminderHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_REMINDER_JOB_TYPE, handleReminderJob);
  reminderHandlerRegistered = true;
}

export async function scheduleWeChatReminderJobsForParticipant(
  request: PartnerRequest,
  userId: UserId,
): Promise<void> {
  const policy = await resolveConfirmationReminderPolicyForRequest(request);
  if (!policy) {
    return;
  }

  const shouldSchedule = await shouldScheduleConfirmationReminderNotification({
    userId,
  });
  if (!shouldSchedule) {
    return;
  }

  for (const trigger of CONFIRMATION_REMINDER_TRIGGERS) {
    const runAt = resolveConfirmationReminderRunAt(policy, trigger);
    if (!runAt || runAt.getTime() <= Date.now()) {
      continue;
    }

    const dedupeKey = buildConfirmationReminderDedupeKey(request.id, userId, trigger);
    const scheduleResult = await jobRunner.scheduleOnce({
      jobType: WECHAT_REMINDER_JOB_TYPE,
      runAt,
      ...resolveConfirmationReminderSchedulePolicy(trigger),
      dedupeKey,
      payload: {
        prId: request.id,
        userId,
        trigger,
        scheduledAtIso: runAt.toISOString(),
      },
    });
    await createNotificationOpportunity({
      notificationKind: REMINDER_CONFIRMATION_NOTIFICATION_KIND,
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
        trigger,
      },
    });
    await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
  }
}

export async function cancelWeChatReminderJobsForParticipant(
  prId: PRId,
  userId: UserId,
): Promise<number> {
  let deleted = 0;
  for (const trigger of CONFIRMATION_REMINDER_TRIGGERS) {
    deleted += await jobRunner.deletePendingJobsByDedupe({
      jobType: WECHAT_REMINDER_JOB_TYPE,
      dedupeKey: buildConfirmationReminderDedupeKey(prId, userId, trigger),
    });
  }
  return deleted;
}

export async function cancelWeChatReminderJobsForUser(userId: UserId): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_REMINDER_JOB_TYPE,
    dedupeKeyPrefix: buildConfirmationReminderDedupePrefixForUser(userId),
  });
}

export async function rebuildWeChatReminderJobsForUser(userId: UserId): Promise<void> {
  await cancelWeChatReminderJobsForUser(userId);

  const slots = await partnerRepo.findActiveByUserId(userId);
  const uniquePrIds = Array.from(new Set(slots.map((slot) => slot.prId)));
  const requests = await prRepo.findByIds(uniquePrIds);
  for (const request of requests) {
    await scheduleWeChatReminderJobsForParticipant(request, userId);
  }
}

async function handleNewPartnerJob(
  payloadRaw: Record<string, unknown>,
  context: JobHandlerContext,
): Promise<void> {
  const parseResult = newPartnerNotificationJobPayloadSchema.safeParse(payloadRaw);
  if (!parseResult.success) {
    throw new Error("Invalid new partner notification job payload");
  }
  const payload = parseResult.data;

  const prepared = await prepareNewPartnerNotificationDispatch(payload);
  if (prepared.status !== "READY") {
    await recordNewPartnerNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: prepared.status,
      errorCode: prepared.errorCode,
      errorMessage: prepared.errorMessage,
    });
    return;
  }

  const configured = await isWeChatSubscriptionNotificationConfigured(
    NEW_PARTNER_NOTIFICATION_KIND,
  );
  if (!configured) {
    await recordNewPartnerNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "FAILED",
      errorCode: "NEW_PARTNER_CHANNEL_NOT_CONFIGURED",
      errorMessage: "New partner subscription message channel is not configured",
    });
    return;
  }

  const sendResult = await sendWeChatSubscriptionNotification({
    kind: NEW_PARTNER_NOTIFICATION_KIND,
    openId: prepared.recipient.openId,
    applicantName: prepared.message.applicantName,
    teamName: prepared.message.teamName,
    tip: prepared.message.tip,
    appliedAt: prepared.message.appliedAt,
    page: prepared.message.page,
  });

  if (sendResult.status === "SENT") {
    await recordNewPartnerNotificationDelivery({
      jobId: context.jobId,
      payload,
      result: "SUCCESS",
    });
    const consumeResult = await consumeNewPartnerNotificationCredit(prepared.recipient.id);
    if (consumeResult.consumed && consumeResult.remainingCount <= 0) {
      await cancelWeChatNewPartnerJobsForUser(prepared.recipient.id);
    }
    return;
  }

  if (isRecipientPermissionRevoked(sendResult)) {
    await clearNewPartnerNotificationCredits(prepared.recipient.id);
    await cancelWeChatNewPartnerJobsForUser(prepared.recipient.id);
  }

  await recordNewPartnerNotificationDelivery({
    jobId: context.jobId,
    payload,
    result: "FAILED",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  });
  throw toDispatchFailureError(sendResult);
}

export function registerWeChatNewPartnerJobs(): void {
  if (newPartnerHandlerRegistered) {
    return;
  }
  jobRunner.registerHandler(WECHAT_NEW_PARTNER_JOB_TYPE, handleNewPartnerJob);
  newPartnerHandlerRegistered = true;
}

export async function scheduleWeChatNewPartnerNotificationsForJoin(input: {
  request: PartnerRequest;
  joinedUserId: UserId;
  joinedPartnerId: PartnerId;
  joinedAt: Date;
}): Promise<void> {
  const configured = await isWeChatSubscriptionNotificationConfigured(
    NEW_PARTNER_NOTIFICATION_KIND,
  );
  if (!configured) {
    return;
  }

  const recipientUserIds = await collectNewPartnerNotificationRecipients({
    request: input.request,
    joinedUserId: input.joinedUserId,
  });
  const scheduledAt = new Date();

  for (const recipientUserId of recipientUserIds) {
    const dedupeKey = buildNewPartnerDedupeKey(
      recipientUserId,
      input.request.id,
      input.joinedPartnerId,
    );
    const scheduleResult = await jobRunner.scheduleOnce({
      jobType: WECHAT_NEW_PARTNER_JOB_TYPE,
      runAt: scheduledAt,
      ...newPartnerSchedulePolicy,
      dedupeKey,
      payload: {
        prId: input.request.id,
        recipientUserId,
        joinedUserId: input.joinedUserId,
        joinedPartnerId: input.joinedPartnerId,
        joinedAtIso: input.joinedAt.toISOString(),
        scheduledAtIso: scheduledAt.toISOString(),
      },
    });
    await createNotificationOpportunity({
      notificationKind: NEW_PARTNER_NOTIFICATION_KIND,
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
        joinedUserId: input.joinedUserId,
        joinedPartnerId: input.joinedPartnerId,
      },
    });
    await markNotificationOpportunityScheduled(dedupeKey, scheduleResult.jobId);
  }
}

export async function cancelWeChatNewPartnerJobsForUser(userId: UserId): Promise<number> {
  return jobRunner.deletePendingJobsByDedupe({
    jobType: WECHAT_NEW_PARTNER_JOB_TYPE,
    dedupeKeyPrefix: buildNewPartnerDedupePrefixForUser(userId),
  });
}

export type { ConfirmationReminderTrigger };
