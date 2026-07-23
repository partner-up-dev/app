import type { PartnerId } from "../../../entities/partner";
import type { PRId, PRStatusManual, VisibilityStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { cancelNotification } from "../../notification";
import {
  applyParticipantReleaseEffects,
  createPRFromStructured,
  promoteWaitlistedPartners,
  recalculatePRStatus,
  releasePRParticipantByAdmin,
  updatePRContent,
} from "../../pr/commands";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../../pr/ports";
import { reconcileConfirmationRemindersForParticipant } from "../../pr";
import { hasPRTypeConfig } from "../../pr-type-config";
import type { AdminPRContentInput, AdminPRCreateInput } from "../contracts";
import { validateAdminPRTimeWindow } from "../services/validation";
import { createAdminPRMessageWindowLifecycleTransactionPort } from "./pr-message-window-lifecycle-transaction";

const prRepository = new PartnerRequestRepository();
const partnerRepository = new PartnerRepository();
const reliabilityRepository = new UserReliabilityRepository();
const messageWindowLifecycle = createAdminPRMessageWindowLifecycleTransactionPort();

const assertTypeConfigured = async (type: string): Promise<string> => {
  const normalized = type.trim();
  if (!normalized || !(await hasPRTypeConfig(normalized))) {
    return throwHttpProblem({
      status: 422,
      detail: "PR type must be selected from the current type configuration catalog",
      code: "PR_TYPE_CONFIG_REQUIRED",
    });
  }
  return normalized;
};

export const createAdminPR = async (
  input: AdminPRCreateInput & {
    timeWindow: [string | null, string | null];
    actorUserId: UserId | null;
  },
) => {
  const type = await assertTypeConfigured(input.type);
  validateAdminPRTimeWindow(input.timeWindow);
  return createPRFromStructured(
    {
      title: input.title ?? undefined,
      type,
      time: input.timeWindow,
      location: input.location,
      route: input.route,
      minPartners: input.minPartners,
      maxPartners: input.maxPartners,
      partners: [],
      budget: null,
      preferences: input.preferences,
      notes: input.notes,
      meetingPoint: input.meetingPoint ?? null,
    },
    {
      authenticatedUserId: input.actorUserId,
      anonymousUserId: null,
      oauthOpenId: null,
    },
    {
      creationAuthority: "ADMIN",
      createSource: "ADMIN",
      publicationMode: "create-open",
      joinGateConfig: input.joinGateConfig,
      confirmationEnabled: input.confirmationEnabled,
      confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
      confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
      joinLockOffsetMinutes: input.joinLockOffsetMinutes,
      operationLog: {
        action: "pr.admin_create",
      },
    },
  );
};

export const updateAdminPRContent = async (prId: PRId, input: AdminPRContentInput) => {
  const existing = await prRepository.findById(prId);
  if (!existing) return throwHttpProblem({ status: 404, detail: "PR not found" });
  const type = await assertTypeConfigured(input.type);
  validateAdminPRTimeWindow(input.timeWindow);
  await updatePRContent(
    prId,
    {
      title: input.title ?? undefined,
      type,
      time: input.timeWindow,
      location: input.location,
      route: input.route,
      minPartners: input.minPartners,
      maxPartners: input.maxPartners,
      partners: [],
      budget: null,
      preferences: input.preferences,
      notes: input.notes,
      meetingPoint: input.meetingPoint ?? null,
    },
    null,
    {
      bypassEditableStatusGuard: true,
      bypassTypeImmutableGuard: true,
      bypassUserCreationPolicyGuard: true,
      preserveStatus: true,
    },
  );
  await prRepository.updatePartnerRules(prId, {
    confirmationEnabled: input.confirmationEnabled,
    confirmationStartOffsetMinutes: input.confirmationStartOffsetMinutes,
    confirmationEndOffsetMinutes: input.confirmationEndOffsetMinutes,
    joinLockOffsetMinutes: input.joinLockOffsetMinutes,
  });
  const activeParticipants = await partnerRepository.listActiveParticipantSummariesByPrId(prId);
  for (const participant of activeParticipants) {
    await reconcileConfirmationRemindersForParticipant({
      prId,
      slotId: participant.partnerId,
      recipientUserId: participant.userId,
    });
  }
  return prRepository.updateJoinGateConfig(prId, input.joinGateConfig ?? existing.joinGateConfig);
};

export const updateAdminPRStatus = async (prId: PRId, status: PRStatusManual) => {
  if (!(await prRepository.findById(prId))) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  const { updatePRStatus } = await import("../../pr/commands");
  return updatePRStatus(prId, status, null);
};

export const updateAdminPRVisibility = async (
  prId: PRId,
  visibilityStatus: VisibilityStatus,
): Promise<{ ok: true }> => {
  if (!(await prRepository.updateVisibilityStatus(prId, visibilityStatus))) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  return { ok: true };
};

export const deleteAdminPR = async (input: { prId: PRId; actorUserId: UserId | null }) => {
  const result = await messageWindowLifecycle.deleteRoot({ prId: input.prId });
  if (result.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      title: result.request.title,
      type: result.request.type,
      location: result.request.location,
      status: result.request.status,
      partnerCount: result.deletedPartnerCount,
    },
  });
  return {
    ok: true as const,
    prId: input.prId,
    deletedPartnerCount: result.deletedPartnerCount,
  };
};

export const releaseAdminPRParticipant = async (input: {
  prId: PRId;
  partnerId: PartnerId;
  reason: string;
  actorUserId: UserId | null;
}) => {
  const reason = input.reason.trim();
  if (!reason) return throwHttpProblem({ status: 400, detail: "Release reason is required" });
  const releaseResult = await releasePRParticipantByAdmin({
    prId: input.prId,
    partnerId: input.partnerId,
    releaseReason: reason,
  });
  if (releaseResult.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  if (releaseResult.outcome === "PARTICIPANT_NOT_FOUND") {
    return throwHttpProblem({ status: 404, detail: "Partner slot not found" });
  }
  if (releaseResult.outcome === "PARTICIPANT_NOT_RELEASEABLE") {
    return throwHttpProblem({
      status: 400,
      detail: "Only JOINED or CONFIRMED slots can be released manually",
    });
  }
  const releasedSlot = releaseResult.slot;
  await reliabilityRepository.applyDelta(releasedSlot.userId, { released: 1 });
  await cancelNotification({
    template: "pr.activity-start-reminder",
    recipientUserId: releasedSlot.userId,
    scope: {
      kind: "AGGREGATE",
      aggregate: { type: "partner_request", id: String(input.prId) },
    },
  });
  await cancelNotification({
    template: "pr.confirmation-reminder",
    recipientUserId: releasedSlot.userId,
    scope: {
      kind: "AGGREGATE",
      aggregate: { type: "partner_request", id: String(input.prId) },
    },
  });
  await recalculatePRStatus(input.prId);
  await promoteWaitlistedPartners(input.prId);
  const effects = await applyParticipantReleaseEffects({
    prId: input.prId,
    releasedUserIds: [releasedSlot.userId],
  });
  operationLogService.log({
    actorId: input.actorUserId,
    action: "partner.admin_manual_release",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: { partnerId: releasedSlot.id, reason, trigger: "admin_manual", manual: true },
  });
  const latest = await prRepository.findById(input.prId);
  if (latest) await reconcileAlternativeWaitlistNotificationsForCandidate(latest);
  return {
    ok: true as const,
    prId: input.prId,
    partnerId: releasedSlot.id,
    previousStatus: releaseResult.previousStatus,
    currentStatus: releasedSlot.status,
    reason,
    creatorTransferredToUserId: effects.creatorTransferredToUserId,
  };
};
