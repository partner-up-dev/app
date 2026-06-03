import { z } from "zod";
import type { PRId, PartnerRequest } from "../../../entities/partner-request";
import { userIdSchema, type User, type UserId } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { PR_READY_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const PR_READY_DEDUPE_PREFIX = "wechat-pr-ready";
const PR_READY_STATUS = "已就绪";
const PR_READY_REMARK = "已成团，可下单；不可直接加入退出";

export const prReadyNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  readyAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime().optional(),
});

export type PRReadyNotificationJobPayload = z.infer<
  typeof prReadyNotificationJobPayloadSchema
>;

type PRReadyDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    title: string;
    type: string;
    status: string;
    remark: string;
    page: string | null;
  };
};

type PRReadyDispatchBlocked = {
  status: "SKIPPED" | "FAILED";
  errorCode: string;
  errorMessage: string;
};

export type PRReadyDispatchPreparation =
  | PRReadyDispatchReady
  | PRReadyDispatchBlocked;

export const buildPRReadyDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  readyAt: Date,
): string =>
  `${PR_READY_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${readyAt.getTime()}`;

export const buildPRReadyDedupePrefixForUser = (userId: UserId): string =>
  `${PR_READY_DEDUPE_PREFIX}:${userId}:`;

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

const resolveTitle = (request: PartnerRequest): string =>
  request.title?.trim() || `${request.type}搭子`;

const resolveType = (request: PartnerRequest): string =>
  request.type?.trim() || "搭子活动";

export const collectPRReadyNotificationRecipients = async (
  request: PartnerRequest,
): Promise<UserId[]> => {
  const activeParticipants =
    await partnerRepo.listActiveParticipantSummariesByPrId(request.id);
  const recipientUserIds = Array.from(
    new Set(activeParticipants.map((item) => item.userId)),
  );

  const eligibleRecipientUserIds: UserId[] = [];
  for (const recipientUserId of recipientUserIds) {
    const recipientUser = await userRepo.findById(recipientUserId);
    if (
      !recipientUser ||
      recipientUser.status !== "ACTIVE" ||
      !recipientUser.openId
    ) {
      continue;
    }

    const notificationOpt =
      await userNotificationOptRepo.findByUserId(recipientUserId);
    const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
      notificationOpt,
      PR_READY_NOTIFICATION_KIND,
    );
    if (!snapshot.enabled) {
      continue;
    }

    eligibleRecipientUserIds.push(recipientUserId);
  }

  return eligibleRecipientUserIds;
};

export const preparePRReadyNotificationDispatch = async (
  payload: PRReadyNotificationJobPayload,
): Promise<PRReadyDispatchPreparation> => {
  const recipient = await userRepo.findById(payload.recipientUserId);
  if (!recipient || recipient.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "User is missing or not active",
    };
  }

  if (!recipient.openId) {
    return {
      status: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "User has no bound WeChat openId",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(
    recipient.id,
  );
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    PR_READY_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "PR_READY_OPT_OUT",
      errorMessage: "User disabled PR ready notifications",
    };
  }

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(
    payload.prId,
    recipient.id,
  );
  if (!stillParticipant) {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      errorMessage: "Recipient is no longer an active participant",
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

  if (request.status !== "READY" && request.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "PR_NOT_READY",
      errorMessage: "Partner request is no longer ready",
    };
  }

  return {
    status: "READY",
    recipient: {
      ...recipient,
      openId: recipient.openId,
    },
    message: {
      title: resolveTitle(request),
      type: resolveType(request),
      status: PR_READY_STATUS,
      remark: PR_READY_REMARK,
      page: resolvePrUrl(request),
    },
  };
};

export const recordPRReadyNotificationDelivery = async (input: {
  jobId: number;
  payload: PRReadyNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: PR_READY_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: input.payload.scheduledAtIso
      ? new Date(input.payload.scheduledAtIso)
      : new Date(input.payload.readyAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumePRReadyNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    PR_READY_NOTIFICATION_KIND,
  );

export const clearPRReadyNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    PR_READY_NOTIFICATION_KIND,
  );
};
