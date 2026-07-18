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
import { refreshTemporalStatus } from "../../pr/commands";
import { assertNoUserTimeWindowConflict, isPRJoinableStatus } from "../../pr/queries";
import { WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND } from "../model/notification-kind";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();
const userNotificationOptRepo = new UserNotificationOptRepository();
const deliveryRepo = new NotificationDeliveryRepository();

const WAITLIST_ALTERNATIVE_AVAILABLE_DEDUPE_PREFIX = "wechat-waitlist-alternative";
const WAITLIST_ALTERNATIVE_AVAILABLE_STATUS = "有可加入名额";
const WAITLIST_ALTERNATIVE_AVAILABLE_REMARK = "同类同地点有其它 PR 可加入";

const normalizeText = (value: string | null): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const waitlistAlternativeAvailableNotificationJobPayloadSchema = z.object({
  sourcePrId: z.coerce.number().int().positive(),
  sourcePartnerId: z.coerce.number().int().positive(),
  candidatePrId: z.coerce.number().int().positive(),
  recipientUserId: userIdSchema,
  scheduledAtIso: z.string().datetime().optional(),
});

export type WaitlistAlternativeAvailableNotificationJobPayload = z.infer<
  typeof waitlistAlternativeAvailableNotificationJobPayloadSchema
>;

type WaitlistAlternativeAvailableDispatchReady = {
  status: "READY";
  recipient: User & { openId: string };
  message: {
    title: string;
    status: string;
    remark: string;
    page: string | null;
  };
};

type WaitlistAlternativeAvailableDispatchBlocked = {
  status: "SKIPPED" | "FAILED";
  errorCode: string;
  errorMessage: string;
};

export type WaitlistAlternativeAvailableDispatchPreparation =
  | WaitlistAlternativeAvailableDispatchReady
  | WaitlistAlternativeAvailableDispatchBlocked;

export const buildWaitlistAlternativeAvailableDedupeKey = (
  recipientUserId: UserId,
  sourcePartnerId: PartnerId,
  candidatePrId: PRId,
): string =>
  `${WAITLIST_ALTERNATIVE_AVAILABLE_DEDUPE_PREFIX}:${recipientUserId}:${sourcePartnerId}:${candidatePrId}`;

export const buildWaitlistAlternativeAvailableDedupePrefixForUser = (userId: UserId): string =>
  `${WAITLIST_ALTERNATIVE_AVAILABLE_DEDUPE_PREFIX}:${userId}:`;

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
  const location = request.location?.trim();
  if (location) return location;
  const typeLabel = request.type?.trim();
  if (typeLabel) return `${typeLabel}搭子`;
  return `PR#${request.id}`;
};

const isCandidateJoinable = async (request: PartnerRequest): Promise<boolean> => {
  if (request.visibilityStatus !== "VISIBLE") {
    return false;
  }
  if (!isPRJoinableStatus(request.status)) {
    return false;
  }
  if (request.maxPartners === null) {
    return true;
  }
  const activeCount = await partnerRepo.countActiveByPrId(request.id);
  return activeCount < request.maxPartners;
};

export const prepareWaitlistAlternativeAvailableNotificationDispatch = async (
  payload: WaitlistAlternativeAvailableNotificationJobPayload,
): Promise<WaitlistAlternativeAvailableDispatchPreparation> => {
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
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );
  if (!snapshot.enabled) {
    return {
      status: "SKIPPED",
      errorCode: "WAITLIST_ALTERNATIVE_AVAILABLE_OPT_OUT",
      errorMessage: "User disabled waitlist alternative notifications",
    };
  }

  const sourceSlot = await partnerRepo.findById(payload.sourcePartnerId as PartnerId);
  if (
    !sourceSlot ||
    sourceSlot.prId !== payload.sourcePrId ||
    sourceSlot.userId !== recipient.id ||
    sourceSlot.status !== "PENDING" ||
    !sourceSlot.alternativePrReminderOptIn
  ) {
    return {
      status: "SKIPPED",
      errorCode: "SOURCE_WAITLIST_SLOT_NOT_PENDING",
      errorMessage: "Source waitlist slot is no longer pending",
    };
  }

  const sourceRequest = await prRepo.findById(payload.sourcePrId);
  if (!sourceRequest) {
    return {
      status: "SKIPPED",
      errorCode: "SOURCE_PR_MISSING",
      errorMessage: "Source partner request is missing",
    };
  }

  const candidate = await prRepo.findById(payload.candidatePrId);
  if (!candidate) {
    return {
      status: "SKIPPED",
      errorCode: "CANDIDATE_PR_MISSING",
      errorMessage: "Alternative partner request is missing",
    };
  }
  const sourceType = normalizeText(sourceRequest.type);
  const sourceLocation = normalizeText(sourceRequest.location);
  const candidateType = normalizeText(candidate.type);
  const candidateLocation = normalizeText(candidate.location);
  if (
    candidate.id === sourceRequest.id ||
    !sourceType ||
    !sourceLocation ||
    candidateType !== sourceType ||
    candidateLocation !== sourceLocation
  ) {
    return {
      status: "SKIPPED",
      errorCode: "CANDIDATE_PR_MISMATCH",
      errorMessage: "Alternative partner request no longer matches source",
    };
  }
  const refreshedCandidate = await refreshTemporalStatus(candidate);
  if (!(await isCandidateJoinable(refreshedCandidate))) {
    return {
      status: "SKIPPED",
      errorCode: "CANDIDATE_PR_NOT_JOINABLE",
      errorMessage: "Alternative partner request is no longer joinable",
    };
  }

  try {
    await assertNoUserTimeWindowConflict({
      userId: recipient.id,
      targetTimeWindow: refreshedCandidate.time,
      excludePrId: refreshedCandidate.id,
    });
  } catch {
    return {
      status: "SKIPPED",
      errorCode: "RECIPIENT_TIME_CONFLICT",
      errorMessage: "Recipient has an active time conflict",
    };
  }

  return {
    status: "READY",
    recipient: {
      ...recipient,
      openId: recipient.openId,
    },
    message: {
      title: resolveTitle(refreshedCandidate),
      status: WAITLIST_ALTERNATIVE_AVAILABLE_STATUS,
      remark: WAITLIST_ALTERNATIVE_AVAILABLE_REMARK,
      page: resolvePrUrl(refreshedCandidate),
    },
  };
};

export const recordWaitlistAlternativeAvailableNotificationDelivery = async (input: {
  jobId: number;
  payload: WaitlistAlternativeAvailableNotificationJobPayload;
  result: "SUCCESS" | "FAILED" | "SKIPPED";
  errorCode?: string | null;
  errorMessage?: string | null;
}): Promise<void> => {
  await deliveryRepo.create({
    jobId: input.jobId,
    prId: input.payload.candidatePrId,
    userId: input.payload.recipientUserId,
    notificationKind: WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
    notificationTrigger: null,
    scheduledAt: input.payload.scheduledAtIso ? new Date(input.payload.scheduledAtIso) : new Date(),
    sentAt: new Date(),
    result: input.result,
    errorCode: input.errorCode ?? null,
    errorMessage: input.errorMessage ?? null,
  });
};

export const consumeWaitlistAlternativeAvailableNotificationCredit = async (
  recipientUserId: UserId,
): Promise<{ consumed: boolean; remainingCount: number }> =>
  userNotificationOptRepo.consumeOneWechatNotificationCredit(
    recipientUserId,
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );

export const clearWaitlistAlternativeAvailableNotificationCredits = async (
  recipientUserId: UserId,
): Promise<void> => {
  await userNotificationOptRepo.clearWechatNotificationCredits(
    recipientUserId,
    WAITLIST_ALTERNATIVE_AVAILABLE_NOTIFICATION_KIND,
  );
};
