import { z } from "zod";
import {
  type ConfirmationReminderTrigger,
  confirmationReminderTriggerSchema,
} from "../../../entities/notification-delivery";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import { type User, type UserId, userIdSchema } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  getTimeWindowStart,
  hasEnabledConfirmationPolicy,
  hasParticipationPolicy,
  resolveParticipationPolicy,
} from "../../pr/queries";
import { REMINDER_CONFIRMATION_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const REMINDER_DEDUPE_PREFIX = "wechat-reminder";
const CONFIRMATION_END_REMINDER_LEAD_MS = 30 * 60 * 1000;

export const CONFIRMATION_REMINDER_TRIGGERS: readonly ConfirmationReminderTrigger[] = [
  "CONFIRM_START",
  "CONFIRM_END_MINUS_30M",
];

export const confirmationReminderNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  userId: userIdSchema,
  trigger: confirmationReminderTriggerSchema,
  scheduledAtIso: z.string().datetime(),
});

export type ConfirmationReminderNotificationJobPayload = z.infer<
  typeof confirmationReminderNotificationJobPayloadSchema
>;

type ConfirmationReminderDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  subscriptionMessage: {
    orderContent: string;
    orderNo: string;
    appointmentAt: string;
    remark: string;
    page: string | null;
  };
};

type ConfirmationReminderDispatchBlocked = {
  status: "SKIPPED";
  errorCode: string;
  errorMessage: string;
};

export type ConfirmationReminderDispatchPreparation =
  | ConfirmationReminderDispatchReady
  | ConfirmationReminderDispatchBlocked;

export const buildConfirmationReminderDedupeKey = (
  prId: PRId,
  userId: UserId,
  trigger: ConfirmationReminderTrigger,
): string => `${REMINDER_DEDUPE_PREFIX}:${userId}:${prId}:${trigger}`;

export const buildConfirmationReminderDedupePrefixForUser = (userId: UserId): string =>
  `${REMINDER_DEDUPE_PREFIX}:${userId}:`;

export const resolveConfirmationReminderRunAt = (
  policy: Pick<
    ReturnType<typeof resolveParticipationPolicy>,
    "confirmationStartAt" | "confirmationEndAt"
  >,
  trigger: ConfirmationReminderTrigger,
): Date | null => {
  if (trigger === "CONFIRM_START") {
    return policy.confirmationStartAt;
  }

  if (!policy.confirmationEndAt) {
    return null;
  }
  return new Date(policy.confirmationEndAt.getTime() - CONFIRMATION_END_REMINDER_LEAD_MS);
};

const resolvePrUrl = (request: PartnerRequest): string | null => {
  const frontendUrl = env.FRONTEND_URL?.trim();
  if (!frontendUrl) return null;
  try {
    const url = new URL(frontendUrl);
    url.pathname = `/pr/${request.id}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const formatReminderDateField = (startAt: Date): string => {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(startAt);
  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
};

const resolveReminderTitle = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `活动 #${request.id}`;

const resolveReminderOrderNo = (request: PartnerRequest, userId: UserId): string =>
  `PR-${request.id}-${userId.slice(-6)}`;

const resolveReminderRemark = (trigger: ConfirmationReminderTrigger): string =>
  trigger === "CONFIRM_START"
    ? "请尽快确认参与活动，超时您的席位将被释放"
    : "请尽快前往确认参与活动，还有30分钟就要截止了";

export const resolveConfirmationReminderPolicyForRequest = async (
  request: PartnerRequest,
): Promise<ReturnType<typeof resolveParticipationPolicy> | null> => {
  if (!hasParticipationPolicy(request) || !hasEnabledConfirmationPolicy(request)) {
    return null;
  }
  return resolveParticipationPolicy(request, request.time);
};

export const shouldScheduleConfirmationReminderNotification = async (input: {
  userId: UserId;
}): Promise<boolean> => {
  const user = await userRepo.findById(input.userId);
  const notificationOpt = user ? await userNotificationOptRepo.findByUserId(input.userId) : null;
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  );
  return Boolean(user && snapshot.enabled);
};

export const prepareConfirmationReminderNotificationDispatch = async (
  payload: ConfirmationReminderNotificationJobPayload,
): Promise<ConfirmationReminderDispatchPreparation> => {
  const user = await userRepo.findById(payload.userId);
  if (!user || user.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  const reminderSnapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  );
  if (!reminderSnapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "REMINDER_OPT_OUT",
      errorMessage: "User disabled wechat reminders",
    };
  }

  const request = await prRepo.findById(payload.prId);
  if (!request) {
    return {
      status: "SKIPPED",
      errorCode: "PR_MISSING",
      errorMessage: "Partner request not found",
    };
  }

  if (!user.openId) {
    return {
      status: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "User has no bound WeChat openId",
    };
  }

  const startAt = getTimeWindowStart(request.time);
  if (!startAt || startAt.getTime() <= Date.now()) {
    return {
      status: "SKIPPED",
      errorCode: "PR_NOT_UPCOMING",
      errorMessage: "Partner request has no future start time",
    };
  }

  const slot = await partnerRepo.findActiveByPrIdAndUserId(request.id, user.id);
  if (!slot) {
    return {
      status: "SKIPPED",
      errorCode: "SLOT_NOT_ACTIVE",
      errorMessage: "Partner slot is no longer active",
    };
  }

  const page = resolvePrUrl(request);

  return {
    status: "READY",
    recipient: {
      ...user,
      openId: user.openId,
    },
    subscriptionMessage: {
      orderContent: resolveReminderTitle(request),
      orderNo: resolveReminderOrderNo(request, user.id),
      appointmentAt: formatReminderDateField(startAt),
      remark: resolveReminderRemark(payload.trigger),
      page,
    },
  };
};

export const recordConfirmationReminderNotificationDelivery = async (input: {
  jobId: number;
  payload: ConfirmationReminderNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.userId,
    notificationKind: REMINDER_CONFIRMATION_NOTIFICATION_KIND,
    notificationTrigger: input.payload.trigger,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeConfirmationReminderNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  );

export const clearConfirmationReminderNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    REMINDER_CONFIRMATION_NOTIFICATION_KIND,
  );
};
