import { z } from "zod";
import type { PartnerId } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import { type User, type UserId, userIdSchema } from "../../../entities/user";
import { env } from "../../../lib/env";
import { NotificationDeliveryRepository } from "../../../repositories/NotificationDeliveryRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserNotificationOptRepository } from "../../../repositories/UserNotificationOptRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import { hasParticipationPolicy } from "../../pr/services";
import { NEW_PARTNER_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const NEW_PARTNER_DEDUPE_PREFIX = "wechat-new-partner";
const NEW_PARTNER_TIP = "有新搭子加入";

export const newPartnerNotificationJobPayloadSchema = z.object({
  prId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  joinedUserId: userIdSchema,
  joinedPartnerId: z.coerce.number().int().positive(),
  joinedAtIso: z.string().datetime(),
  scheduledAtIso: z.string().datetime().optional(),
});

export type NewPartnerNotificationJobPayload = z.infer<
  typeof newPartnerNotificationJobPayloadSchema
>;

type NewPartnerDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    applicantName: string;
    teamName: string;
    tip: string;
    appliedAt: string;
    page: string | null;
  };
};

type NewPartnerDispatchBlocked = {
  status: "SKIPPED" | "FAILED";
  errorCode: string;
  errorMessage: string;
};

export type NewPartnerDispatchPreparation = NewPartnerDispatchReady | NewPartnerDispatchBlocked;

export const buildNewPartnerDedupeKey = (
  recipientUserId: UserId,
  prId: PRId,
  joinedPartnerId: PartnerId,
): string => `${NEW_PARTNER_DEDUPE_PREFIX}:${recipientUserId}:${prId}:${joinedPartnerId}`;

export const buildNewPartnerDedupePrefixForUser = (userId: UserId): string =>
  `${NEW_PARTNER_DEDUPE_PREFIX}:${userId}:`;

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

const resolveTeamName = (request: PartnerRequest): string =>
  request.title?.trim() || request.type || `PR#${request.id}`;

const resolveApplicantName = (nickname: string | null): string => {
  const normalized = nickname?.trim();
  if (!normalized) return "新搭子";
  return normalized;
};

const formatAppliedAt = (joinedAtIso: string): string =>
  new Date(joinedAtIso).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const collectNewPartnerNotificationRecipients = async (input: {
  request: PartnerRequest;
  joinedUserId: UserId;
}): Promise<UserId[]> => {
  if (!hasParticipationPolicy(input.request)) {
    return [];
  }

  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    input.request.id,
  );
  const recipientUserIds = Array.from(
    new Set(
      activeParticipants
        .map((item) => item.userId)
        .filter((userId): userId is UserId => userId !== null && userId !== input.joinedUserId),
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
      NEW_PARTNER_NOTIFICATION_KIND,
    );
    if (!snapshot.enabled) {
      continue;
    }

    eligibleRecipientUserIds.push(recipientUserId);
  }

  return eligibleRecipientUserIds;
};

export const prepareNewPartnerNotificationDispatch = async (
  payload: NewPartnerNotificationJobPayload,
): Promise<NewPartnerDispatchPreparation> => {
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
    NEW_PARTNER_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "NEW_PARTNER_OPT_OUT",
      errorMessage: "User disabled new partner notifications",
    };
  }

  const stillParticipant = await partnerRepo.findActiveByPrIdAndUserId(payload.prId, recipient.id);
  if (!stillParticipant) {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_NOT_ACTIVE_PARTICIPANT",
      errorMessage: "Recipient is no longer an active participant",
    };
  }

  const request = await prRepo.findById(payload.prId);
  if (!request || !hasParticipationPolicy(request)) {
    return {
      status: "SKIPPED",
      errorCode: "PR_MISSING_OR_UNSUPPORTED",
      errorMessage: "Partner request has no participation notification support",
    };
  }

  const joinedUser = await userRepo.findById(payload.joinedUserId);

  return {
    status: "READY",
    recipient: {
      ...recipient,
      openId: recipient.openId,
    },
    message: {
      applicantName: resolveApplicantName(joinedUser?.nickname ?? null),
      teamName: resolveTeamName(request),
      tip: NEW_PARTNER_TIP,
      appliedAt: formatAppliedAt(payload.joinedAtIso),
      page: resolvePrUrl(request),
    },
  };
};

export const recordNewPartnerNotificationDelivery = async (input: {
  jobId: number;
  payload: NewPartnerNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.prId,
    userId: input.payload.recipientUserId,
    notificationKind: NEW_PARTNER_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: input.payload.scheduledAtIso
      ? new Date(input.payload.scheduledAtIso)
      : new Date(input.payload.joinedAtIso),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeNewPartnerNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    NEW_PARTNER_NOTIFICATION_KIND,
  );

export const clearNewPartnerNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    NEW_PARTNER_NOTIFICATION_KIND,
  );
};
