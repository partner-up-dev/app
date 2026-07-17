import { z } from "zod";
import type { PartnerId } from "../../../entities/partner";
import type { PRId, PartnerRequest } from "../../../entities/partner-request";
import { userIdSchema, type User, type UserId } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { WAITLIST_PROMOTED_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const WAITLIST_PROMOTED_DEDUPE_PREFIX = "wechat-waitlist-promoted";
const WAITLIST_PROMOTED_STATUS = "候补成功";
const WAITLIST_PROMOTED_REMARK = "已为你保留名额";

export const waitlistPromotedNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  partnerId: z.coerce.number().int().positive(),
  promotedAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime().optional(),
});

export type WaitlistPromotedNotificationJobPayload = z.infer<
  typeof waitlistPromotedNotificationJobPayloadSchema
>;

type WaitlistPromotedDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    title: string;
    status: string;
    remark: string;
    page: string | null;
  };
};

type WaitlistPromotedDispatchBlocked = {
  status: "SKIPPED" | "FAILED";
  errorCode: string;
  errorMessage: string;
};

export type WaitlistPromotedDispatchPreparation =
  | WaitlistPromotedDispatchReady
  | WaitlistPromotedDispatchBlocked;

export const buildWaitlistPromotedDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  partnerId: PartnerId,
): string => `${WAITLIST_PROMOTED_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${partnerId}`;

export const buildWaitlistPromotedDedupePrefixForUser = (userId: UserId): string =>
  `${WAITLIST_PROMOTED_DEDUPE_PREFIX}:${userId}:`;

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

const resolveTitle = (request: PartnerRequest): string => {
  const title = request.title?.trim();
  if (title) return title;
  const typeLabel = request.type?.trim();
  if (typeLabel) return `${typeLabel}搭子`;
  return `PR#${request.id}`;
};

export const prepareWaitlistPromotedNotificationDispatch = async (
  payload: WaitlistPromotedNotificationJobPayload,
): Promise<WaitlistPromotedDispatchPreparation> => {
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

  const notificationOpt = await userNotificationOptRepo.findByUserId(recipient.id);
  const snapshot = userNotificationOptRepo.getSubscriptionSnapshot(
    notificationOpt,
    WAITLIST_PROMOTED_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "WAITLIST_PROMOTED_OPT_OUT",
      errorMessage: "User disabled waitlist promoted notifications",
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

  const promotedSlot = await partnerRepo.findActiveParticipantSummaryByPrIdAndPartnerId(
    payload.prId,
    payload.partnerId as PartnerId,
  );
  if (!promotedSlot || promotedSlot.userId !== recipient.id) {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_NOT_PROMOTED_PARTICIPANT",
      errorMessage: "Recipient is no longer the promoted active participant",
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
      status: WAITLIST_PROMOTED_STATUS,
      remark: WAITLIST_PROMOTED_REMARK,
      page: resolvePrUrl(request),
    },
  };
};

export const recordWaitlistPromotedNotificationDelivery = async (input: {
  jobId: number;
  payload: WaitlistPromotedNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: WAITLIST_PROMOTED_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: input.payload.scheduledAtIso
      ? new Date(input.payload.scheduledAtIso)
      : new Date(input.payload.promotedAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeWaitlistPromotedNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    WAITLIST_PROMOTED_NOTIFICATION_KIND,
  );

export const clearWaitlistPromotedNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    WAITLIST_PROMOTED_NOTIFICATION_KIND,
  );
};
