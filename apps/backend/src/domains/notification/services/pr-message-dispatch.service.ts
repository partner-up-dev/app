import type { PartnerRequest } from "../../../entities/partner-request";
import { resolvePrimaryUserRole, type User, type UserRole } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import {
  PR_MESSAGE_NOTIFICATION_KIND,
  type PRMessageNotificationJobPayload,
} from "../model/pr-message-notification";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();
const messageRepo = new PRMessageRepository();
const deliveryRepo = new NotificationDeliveryRepository();

type PRMessageDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    threadTitle: string;
    authorName: string;
    sentAt: string;
    messageSummary: string;
    page: string | null;
  };
};

type PRMessageDispatchBlocked = {
  status: "SKIPPED" | "FAILED";
  errorCode: string;
  errorMessage: string;
};

export type PRMessageDispatchPreparation = PRMessageDispatchReady | PRMessageDispatchBlocked;

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

const resolveThreadTitle = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `PR#${request.id}`;

const resolveAuthorName = (nickname: string | null, role: UserRole | null): string =>
  role === "service" ? "系统消息" : nickname?.trim() || "搭子";

const formatUnreadMessageSummary = (messageCount: number): string =>
  `${Math.max(1, messageCount)}条留言，请尽快查看`;

const formatMessageSentAt = (messageCreatedAtIso: string): string =>
  new Date(messageCreatedAtIso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const recordPRMessageNotificationDelivery = async (input: {
  jobId: number;
  payload: PRMessageNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: PR_MESSAGE_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: new Date(input.payload.scheduledAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const preparePRMessageNotificationDispatch = async (
  payload: PRMessageNotificationJobPayload,
): Promise<PRMessageDispatchPreparation> => {
  const recipient = await userRepo.findById(payload.recipientUserId);
  if (!recipient || recipient.status !== "ACTIVE") {
    return {
      status: "SKIPPED",
      errorCode: "USER_INACTIVE_OR_MISSING",
      errorMessage: "Recipient is missing or not active",
    };
  }

  if (!recipient.openId) {
    return {
      status: "SKIPPED",
      errorCode: "USER_OPENID_MISSING",
      errorMessage: "Recipient has no bound WeChat openId",
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

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(
    payload.prId,
    payload.recipientUserId,
  );
  if (!stillParticipant) {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      errorMessage: "Recipient is no longer an active participant",
    };
  }

  const inboxState = await inboxStateRepo.findByPrIdAndUserId(
    payload.prId,
    payload.recipientUserId,
  );
  if ((inboxState?.lastNotifiedMessageId ?? null) !== payload.waveStartMessageId) {
    return {
      status: "SKIPPED",
      errorCode: "UNREAD_WAVE_NO_LONGER_PENDING",
      errorMessage: "Unread wave is no longer pending for this message id",
    };
  }

  if ((inboxState?.lastReadMessageId ?? 0) >= payload.waveStartMessageId) {
    return {
      status: "SKIPPED",
      errorCode: "UNREAD_WAVE_ALREADY_HANDLED",
      errorMessage: "Recipient already handled this unread wave",
    };
  }

  const notificationOpt = await userNotificationOptRepo.findByUserId(recipient.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    PR_MESSAGE_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "PR_MESSAGE_OPT_OUT",
      errorMessage: "Recipient disabled PR message notifications",
    };
  }

  const unreadAfterMessageId = inboxState?.lastReadMessageId ?? null;
  const [latestUnreadMessage, unreadMessageCount, fallbackAuthor] = await Promise.all([
    messageRepo.findLatestWithAuthorAfterId(payload.prId, unreadAfterMessageId),
    messageRepo.countByPrIdAfterId(payload.prId, unreadAfterMessageId),
    userRepo.findById(payload.waveStartAuthorUserId),
  ]);

  const latestUnreadMessageCreatedAtIso =
    latestUnreadMessage?.createdAt.toISOString() ?? payload.firstUnreadMessageCreatedAtIso;
  const latestUnreadAuthorName = latestUnreadMessage
    ? resolveAuthorName(latestUnreadMessage.authorNickname, latestUnreadMessage.authorRole)
    : resolveAuthorName(
        fallbackAuthor?.nickname ?? null,
        fallbackAuthor?.role ? resolvePrimaryUserRole(fallbackAuthor.role) : null,
      );

  return {
    status: "READY",
    recipient: {
      ...recipient,
      openId: recipient.openId,
    },
    message: {
      threadTitle: resolveThreadTitle(request),
      authorName: latestUnreadAuthorName,
      sentAt: formatMessageSentAt(latestUnreadMessageCreatedAtIso),
      messageSummary: formatUnreadMessageSummary(unreadMessageCount),
      page: resolvePrUrl(request),
    },
  };
};

export const consumePRMessageNotificationCredit = async (
  recipientUserId: User["id"],
): Promise<{ remainingCount: number; consumed: boolean }> => {
  const consumeResult = await userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    PR_MESSAGE_NOTIFICATION_KIND,
  );
  return {
    consumed: consumeResult.consumed,
    remainingCount: consumeResult.remainingCount,
  };
};

export const clearPRMessageNotificationCredits = async (
  recipientUserId: User["id"],
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    PR_MESSAGE_NOTIFICATION_KIND,
  );
};
