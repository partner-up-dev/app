import type { PartnerId } from "../../../entities/partner";
import type { PRId, PRStatusManual, VisibilityStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import { UserReliabilityRepository } from "../../../repositories/UserReliabilityRepository";
import { updatePRContent } from "../../pr";
import {
  applyParticipantReleaseEffects,
  promoteWaitlistedPartners,
  recalculatePRStatus,
} from "../../pr/services";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../../pr-core/services/waitlist-alternative-reminder.service";
import { createPRFromStructured } from "../../pr-core/use-cases/create-pr-structured";
import type { AdminPRContentInput, AdminPRCreateInput } from "../contracts";
import { validateAdminPRTimeWindow } from "../services/validation";

const prRepository = new PartnerRequestRepository();
const typeConfigRepository = new PRTypeConfigRepository();
const partnerRepository = new PartnerRepository();
const reliabilityRepository = new UserReliabilityRepository();

const assertTypeConfigured = async (type: string): Promise<string> => {
  const normalized = type.trim();
  if (!normalized || !(await typeConfigRepository.findByType(normalized))) {
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
  return prRepository.updateJoinGateConfig(prId, input.joinGateConfig ?? existing.joinGateConfig);
};

export const updateAdminPRStatus = async (prId: PRId, status: PRStatusManual) => {
  if (!(await prRepository.findById(prId))) {
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  }
  const { updatePRStatus } = await import("../../pr");
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
  const existing = await prRepository.findById(input.prId);
  if (!existing) return throwHttpProblem({ status: 404, detail: "PR not found" });
  const partnerCount = await partnerRepository.countTotalByPrId(input.prId);
  const deleted = await prRepository.deleteById(input.prId);
  if (!deleted) return throwHttpProblem({ status: 500, detail: "Failed to delete PR" });
  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      title: existing.title,
      type: existing.type,
      location: existing.location,
      status: existing.status,
      partnerCount,
    },
  });
  return { ok: true as const, prId: input.prId, deletedPartnerCount: partnerCount };
};

const releaseableStatuses = new Set(["JOINED", "CONFIRMED"]);

export const releaseAdminPRParticipant = async (input: {
  prId: PRId;
  partnerId: PartnerId;
  reason: string;
  actorUserId: UserId | null;
}) => {
  const reason = input.reason.trim();
  if (!reason) return throwHttpProblem({ status: 400, detail: "Release reason is required" });
  if (!(await prRepository.findById(input.prId)))
    return throwHttpProblem({ status: 404, detail: "PR not found" });
  const slot = await partnerRepository.findById(input.partnerId);
  if (!slot || slot.prId !== input.prId)
    return throwHttpProblem({ status: 404, detail: "Partner slot not found" });
  if (!releaseableStatuses.has(slot.status)) {
    return throwHttpProblem({
      status: 400,
      detail: "Only JOINED or CONFIRMED slots can be released manually",
    });
  }
  const releasedSlot = await partnerRepository.markReleased(slot.id, { releaseReason: reason });
  if (!releasedSlot)
    return throwHttpProblem({ status: 500, detail: "Failed to release partner slot" });
  await reliabilityRepository.applyDelta(slot.userId, { released: 1 });
  await cancelWeChatReminderJobsForParticipant(input.prId, slot.userId);
  await cancelWeChatActivityStartReminderJobsForParticipant(input.prId, slot.userId);
  await recalculatePRStatus(input.prId);
  await promoteWaitlistedPartners(input.prId);
  const effects = await applyParticipantReleaseEffects({
    prId: input.prId,
    releasedUserIds: [slot.userId],
  });
  operationLogService.log({
    actorId: input.actorUserId,
    action: "partner.admin_manual_release",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: { partnerId: releasedSlot.id, reason, trigger: "admin_manual", manual: true },
  });
  const latest = await prRepository.findById(input.prId);
  if (latest) await scheduleAlternativeWaitlistNotificationsForCandidate(latest);
  return {
    ok: true as const,
    prId: input.prId,
    partnerId: releasedSlot.id,
    previousStatus: slot.status,
    currentStatus: releasedSlot.status,
    reason,
    creatorTransferredToUserId: effects.creatorTransferredToUserId,
  };
};
