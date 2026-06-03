import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  PRId,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import {
  countActivePartnersForPR,
  listActiveParticipantSummariesForPR,
  syncSlotCapacity,
  recalculatePRStatus,
} from "../services/slot-management.service";
import { assertManualPartnerBoundsValid } from "../services/partner-bounds.service";
import {
  assertNoUserTimeWindowConflict,
  findUserTimeWindowConflict,
} from "../services/participation-time-conflict.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import {
  captureEffectiveMeetingPointsForRequests,
  scheduleMeetingPointNotificationsForChangedRequests,
} from "../services/meeting-point-change-notifier.service";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { operationLogService } from "../../../infra/operation-log";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reminder.service";
import { assertUserPRCreationAllowedForAnchorEvent } from "../services/event-pr-creation-policy.service";
import { normalizePartnerRequestFieldsForPersistence } from "../services/pr-place-mode.service";
import {
  assertPRContentEditable,
  resolveChangedPRContentFields,
} from "../services/pr-edit-capability.service";
import {
  cancelWeChatActivityStartReminderJobsForParticipant,
  cancelWeChatReminderJobsForParticipant,
} from "../../../infra/notifications";
import { createPersistedPRMessage } from "../../pr/message/create-pr-message";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const RELEASE_REASON_TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE =
  "TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE";
export const PARTICIPANT_RELEASE_REQUIRED_CODE =
  "PARTICIPANT_RELEASE_REQUIRED";

export interface UpdatePRContentOptions {
  bypassEditableStatusGuard?: boolean;
  bypassTypeImmutableGuard?: boolean;
  bypassUserCreationPolicyGuard?: boolean;
  preserveStatus?: boolean;
  allowRelease?: boolean;
}

export type UserUpdatePRContentFields = Omit<PartnerRequestFields, "type">;
export const PR_TYPE_IMMUTABLE_CODE = "PR_TYPE_IMMUTABLE";

const CORE_FIELD_NOTIFICATION_LABELS: Partial<
  Record<keyof PartnerRequestFields | "meetingPoint", string>
> = {
  time: "时间",
  location: "地点",
  route: "路线",
  meetingPoint: "集合点",
};

const buildCoreFieldChangeMessageBody = (changedFields: string[]): string | null => {
  const labels = changedFields
    .map((field) =>
      CORE_FIELD_NOTIFICATION_LABELS[
        field as keyof typeof CORE_FIELD_NOTIFICATION_LABELS
      ] ?? null,
    )
    .filter((label): label is string => label !== null);

  if (labels.length === 0) {
    return null;
  }

  return `活动信息已更新：${Array.from(new Set(labels)).join("、")}。请打开 PR 查看最新安排。`;
};

const throwTypeImmutable = (): never => {
  return throwHttpProblem({
    status: 400,
    detail: "PR type cannot be changed after creation",
    code: PR_TYPE_IMMUTABLE_CODE,
  });
};

export async function updatePRContent(
  id: PRId,
  fields: PartnerRequestFields,
  actorUserId: UserId | null,
  options: UpdatePRContentOptions = {},
): Promise<PublicPR> {
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(fields);
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const minMaxChanged =
    refreshedRequest.minPartners !== normalizedFields.minPartners ||
    refreshedRequest.maxPartners !== normalizedFields.maxPartners;
  const timeChanged =
    refreshedRequest.time[0] !== normalizedFields.time[0] ||
    refreshedRequest.time[1] !== normalizedFields.time[1];
  const typeChanged =
    refreshedRequest.type.trim() !== normalizedFields.type.trim();
  const changedFields = resolveChangedPRContentFields(
    refreshedRequest,
    normalizedFields,
  );
  assertPRContentEditable({
    request: refreshedRequest,
    fields: normalizedFields,
    changedFields,
    bypassEditableStatusGuard: options.bypassEditableStatusGuard,
  });
  if (typeChanged && !options.bypassTypeImmutableGuard) {
    throwTypeImmutable();
  }
  if (typeChanged && !options.bypassUserCreationPolicyGuard) {
    await assertUserPRCreationAllowedForAnchorEvent({
      type: normalizedFields.type,
    });
  }
  const currentParticipants = await countActivePartnersForPR(id);
  assertManualPartnerBoundsValid(
    normalizedFields.minPartners,
    normalizedFields.maxPartners,
    currentParticipants,
  );
  await assertPRTimeWindowAvailableAtLocation({
    location: normalizedFields.location,
    timeWindow: normalizedFields.time,
  });
  const previousMeetingPoints = await captureEffectiveMeetingPointsForRequests([
    refreshedRequest,
  ]);

  if (timeChanged && refreshedRequest.status !== "DRAFT") {
    const activeParticipants = await listActiveParticipantSummariesForPR(id);
    const conflictedParticipants = [];

    for (const participant of activeParticipants) {
      const conflictPrId = await findUserTimeWindowConflict({
        userId: participant.userId,
        targetTimeWindow: normalizedFields.time,
        excludePrId: id,
      });
      if (conflictPrId !== null) {
        conflictedParticipants.push(participant);
      }
    }

    if (conflictedParticipants.length > 0 && options.allowRelease !== true) {
      return throwHttpProblem({
        status: 409,
        detail: `This change would release ${conflictedParticipants.length} participant(s) because of time conflicts`,
        code: PARTICIPANT_RELEASE_REQUIRED_CODE,
      });
    }

    if (conflictedParticipants.length > 0) {
      const minPartners = normalizedFields.minPartners ?? 1;
      if (activeParticipants.length - conflictedParticipants.length < minPartners) {
        return throwHttpProblem({
          status: 409,
          detail: "Cannot release conflicted participants because the PR would fall below minPartners",
          code: "PARTICIPANT_RELEASE_BELOW_MIN_PARTNERS",
        });
      }

      for (const participant of conflictedParticipants) {
        const released = await partnerRepo.markReleased(participant.partnerId, {
          releaseReason: RELEASE_REASON_TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE,
        });
        if (!released) {
          return throwHttpProblem({
            status: 500,
            detail: "Failed to release conflicted participant",
          });
        }
        await cancelWeChatReminderJobsForParticipant(id, participant.userId);
        await cancelWeChatActivityStartReminderJobsForParticipant(
          id,
          participant.userId,
        );
        operationLogService.log({
          actorId: actorUserId,
          action: "partner.release_after_pr_core_field_change",
          aggregateType: "partner_request",
          aggregateId: String(id),
          detail: {
            partnerId: participant.partnerId,
            releasedUserId: participant.userId,
            reason: RELEASE_REASON_TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE,
          },
        });
      }
    } else {
      for (const participant of activeParticipants) {
        await assertNoUserTimeWindowConflict({
          userId: participant.userId,
          targetTimeWindow: normalizedFields.time,
          excludePrId: id,
        });
      }
    }
  }

  const updated = await prRepo.updateFields(id, normalizedFields);
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to update content" });
  }

  if (minMaxChanged) {
    await syncSlotCapacity(id, normalizedFields.maxPartners);
  }
  await prRepo.clearPosterCache(id);

  if (
    minMaxChanged &&
    refreshedRequest.status !== "DRAFT" &&
    !options.preserveStatus
  ) {
    await recalculatePRStatus(id);
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  operationLogService.log({
    actorId: actorUserId,
    action: "pr.update_content",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: {
      changedFields: changedFields.join(","),
    },
  });

  const coreFieldChangeMessageBody =
    refreshedRequest.status === "DRAFT"
      ? null
      : buildCoreFieldChangeMessageBody(changedFields);
  if (coreFieldChangeMessageBody !== null && actorUserId !== null) {
    await createPersistedPRMessage({
      request: latest,
      prId: id,
      authorUserId: actorUserId,
      body: coreFieldChangeMessageBody,
      actorUserId,
      action: "pr.notify_core_field_change",
      markAuthorRead: true,
    });
  }

  await scheduleMeetingPointNotificationsForChangedRequests({
    previous: previousMeetingPoints,
    requests: [latest],
    updatedAt: new Date(),
  });
  await scheduleAlternativeWaitlistNotificationsForCandidate(latest);

  return toPublicPR(latest, null);
}

export async function updateUserPRContent(
  id: PRId,
  fields: UserUpdatePRContentFields,
  actorUserId: UserId | null,
  options: Pick<UpdatePRContentOptions, "allowRelease"> = {},
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  return updatePRContent(
    id,
    {
      ...fields,
      type: request.type,
    },
    actorUserId,
    options,
  );
}
