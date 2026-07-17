import { z } from "zod";
import type { PRId, PartnerRequest } from "../../../entities/partner-request";
import { userIdSchema, type User, type UserId } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { MEETING_POINT_UPDATED_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const MEETING_POINT_UPDATED_DEDUPE_PREFIX = "wechat-meeting-point-updated";
const MEETING_POINT_UPDATE_TYPE = "碰头地点";
const MEETING_POINT_OPERATOR_NAME = "系统";

export const meetingPointUpdatedNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  meetingPointDescription: z.string().trim().min(1),
  updatedAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime(),
});

export type MeetingPointUpdatedNotificationJobPayload = z.infer<
  typeof meetingPointUpdatedNotificationJobPayloadSchema
>;

type MeetingPointUpdatedDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    updateType: string;
    operatorName: string;
    updatedAt: string;
    meetingPointDescription: string;
    page: string | null;
  };
};

type MeetingPointUpdatedDispatchBlocked = {
  status: "SKIPPED";
  errorCode: string;
  errorMessage: string;
};

export type MeetingPointUpdatedDispatchPreparation =
  | MeetingPointUpdatedDispatchReady
  | MeetingPointUpdatedDispatchBlocked;

export const buildMeetingPointUpdatedDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  updatedAtIso: string,
): string => `${MEETING_POINT_UPDATED_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${updatedAtIso}`;

export const buildMeetingPointUpdatedDedupePrefixForUser = (userId: UserId): string =>
  `${MEETING_POINT_UPDATED_DEDUPE_PREFIX}:${userId}:`;

const resolvePrUrl = (request: Pick<PartnerRequest, "id">): string | null => {
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

const formatUpdatedAt = (updatedAtIso: string): string =>
  new Date(updatedAtIso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const collectMeetingPointUpdatedNotificationRecipients = async (
  request: Pick<PartnerRequest, "id">,
): Promise<UserId[]> => {
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(request.id);
  const recipientUserIds = Array.from(
    new Set(
      activeParticipants
        .map((item) => item.userId)
        .filter((userId): userId is UserId => userId !== null),
    ),
  );

  const eligibleRecipientUserIds: UserId[] = [];
  for (const recipientUserId of recipientUserIds) {
    const recipientUser = await userRepo.findById(recipientUserId);
    if (!recipientUser || recipientUser.status !== "ACTIVE" || !recipientUser.openId) {
      continue;
    }

    const notificationOpt = await userNotificationOptRepo.findByUserId(recipientUserId);
    const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
      notificationOpt,
      MEETING_POINT_UPDATED_NOTIFICATION_KIND,
    );
    if (!snapshot.enabled) {
      continue;
    }

    eligibleRecipientUserIds.push(recipientUserId);
  }

  return eligibleRecipientUserIds;
};

export const prepareMeetingPointUpdatedNotificationDispatch = async (
  payload: MeetingPointUpdatedNotificationJobPayload,
): Promise<MeetingPointUpdatedDispatchPreparation> => {
  const user = await userRepo.findById(payload.recipientUserId);
  if (!user || user.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    };
  }

  if (!user.openId) {
    return {
      status: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "User has no bound WeChat openId",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(user.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "MEETING_POINT_UPDATED_OPT_OUT",
      errorMessage: "User disabled meeting point update notifications",
    };
  }

  const request = await prRepo.findById(payload.prId);
  if (!request) {
    return {
      status: "SKIPPED",
      errorCode: "PR_MISSING",
      errorMessage: "Partner request is missing",
    };
  }

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(payload.prId, user.id);
  if (!stillParticipant) {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      errorMessage: "Recipient is no longer an active participant",
    };
  }

  return {
    status: "READY",
    recipient: {
      ...user,
      openId: user.openId,
    },
    message: {
      updateType: MEETING_POINT_UPDATE_TYPE,
      operatorName: MEETING_POINT_OPERATOR_NAME,
      updatedAt: formatUpdatedAt(payload.updatedAtIso),
      meetingPointDescription: payload.meetingPointDescription,
      page: resolvePrUrl(request),
    },
  };
};

export const recordMeetingPointUpdatedNotificationDelivery = async (input: {
  jobId: number;
  payload: MeetingPointUpdatedNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: MEETING_POINT_UPDATED_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeMeetingPointUpdatedNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  );

export const clearMeetingPointUpdatedNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    MEETING_POINT_UPDATED_NOTIFICATION_KIND,
  );
};
