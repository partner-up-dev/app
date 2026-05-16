import { z } from "zod";
import type { PRId, PartnerRequest } from "../../../entities/partner-request";
import { userIdSchema, type User, type UserId } from "../../../entities/user";
import {
  getTimeWindowStart,
  hasAnchorParticipationPolicy,
  resolvePRPlaceDisplayName,
} from "../../pr/services";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { ACTIVITY_START_REMINDER_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const ACTIVITY_START_REMINDER_DEDUPE_PREFIX =
  "wechat-activity-start-reminder";
const ACTIVITY_START_REMINDER_LEAD_MS = 20 * 60 * 1000;
const ACTIVITY_START_REMARK = "提前时间更充足";

export const activityStartReminderNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  userId: userIdSchema,
  scheduledAtIso: z.string().datetime(),
});

export type ActivityStartReminderNotificationJobPayload = z.infer<
  typeof activityStartReminderNotificationJobPayloadSchema
>;

type ActivityStartReminderDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    activityName: string;
    startAt: string;
    location: string;
    remark: string;
    page: string | null;
  };
};

type ActivityStartReminderDispatchBlocked = {
  status: "SKIPPED";
  errorCode: string;
  errorMessage: string;
};

export type ActivityStartReminderDispatchPreparation =
  | ActivityStartReminderDispatchReady
  | ActivityStartReminderDispatchBlocked;

export const buildActivityStartReminderDedupeKey = (
  prId: PRId,
  userId: UserId,
): string => `${ACTIVITY_START_REMINDER_DEDUPE_PREFIX}:${userId}:${prId}`;

export const buildActivityStartReminderDedupePrefixForUser = (
  userId: UserId,
): string => `${ACTIVITY_START_REMINDER_DEDUPE_PREFIX}:${userId}:`;

export const resolveActivityStartReminderRunAt = (
  request: Pick<PartnerRequest, "time">,
): Date | null => {
  const startAt = getTimeWindowStart(request.time);
  if (!startAt) {
    return null;
  }
  return new Date(startAt.getTime() - ACTIVITY_START_REMINDER_LEAD_MS);
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

const resolveActivityName = (request: PartnerRequest): string => {
  const type = request.type?.trim() ?? "";
  const title = request.title?.trim() ?? "";
  const parts = [type, title].filter(
    (value, index, values) => value.length > 0 && values.indexOf(value) === index,
  );
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return `活动 #${request.id}`;
};

export const resolveActivityStartReminderLocation = (
  request: Pick<PartnerRequest, "location" | "route">,
): string => resolvePRPlaceDisplayName(request) ?? "地点待定";

export const shouldScheduleActivityStartReminderNotification = async (input: {
  request: PartnerRequest;
  userId: UserId;
}): Promise<boolean> => {
  if (!hasAnchorParticipationPolicy(input.request)) {
    return false;
  }

  const user = await userRepo.findById(input.userId);
  const notificationOpt = user
    ? await userNotificationOptRepo.findByUserId(input.userId)
    : null;
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  );
  return Boolean(user && snapshot.enabled);
};

export const prepareActivityStartReminderNotificationDispatch = async (
  payload: ActivityStartReminderNotificationJobPayload,
): Promise<ActivityStartReminderDispatchPreparation> => {
  const user = await userRepo.findById(payload.userId);
  if (!user || user.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "ACTIVITY_START_REMINDER_OPT_OUT",
      errorMessage: "User disabled activity start reminders",
    };
  }

  const request = await prRepo.findById(payload.prId);
  if (!request || !hasAnchorParticipationPolicy(request)) {
    return {
      status: "SKIPPED",
      errorCode: "PR_MISSING_OR_UNSUPPORTED",
      errorMessage: "Partner request has no activity reminder support",
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

  return {
    status: "READY",
    recipient: {
      ...user,
      openId: user.openId,
    },
    message: {
      activityName: resolveActivityName(request),
      startAt: formatReminderDateField(startAt),
      location: resolveActivityStartReminderLocation(request),
      remark: ACTIVITY_START_REMARK,
      page: resolvePrUrl(request),
    },
  };
};

export const recordActivityStartReminderNotificationDelivery = async (input: {
  jobId: number;
  payload: ActivityStartReminderNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.userId,
    notificationKind: ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeActivityStartReminderNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  );

export const clearActivityStartReminderNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    ACTIVITY_START_REMINDER_NOTIFICATION_KIND,
  );
};
