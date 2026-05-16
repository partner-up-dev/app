import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
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
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
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

const prRepo = new PartnerRequestRepository();

export interface UpdatePRContentOptions {
  bypassEditableStatusGuard?: boolean;
  bypassTypeImmutableGuard?: boolean;
  bypassUserCreationPolicyGuard?: boolean;
  preserveStatus?: boolean;
}

export type UserUpdatePRContentFields = Omit<PartnerRequestFields, "type">;
export const PR_TYPE_IMMUTABLE_CODE = "PR_TYPE_IMMUTABLE";

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

  if (
    !options.bypassEditableStatusGuard &&
    refreshedRequest.status !== "OPEN" &&
    refreshedRequest.status !== "DRAFT"
  ) {
    return throwHttpProblem({ status: 400, detail: "Cannot edit - only OPEN or DRAFT partner requests can be edited" });
  }

  const minMaxChanged =
    refreshedRequest.minPartners !== normalizedFields.minPartners ||
    refreshedRequest.maxPartners !== normalizedFields.maxPartners;
  const timeChanged =
    refreshedRequest.time[0] !== normalizedFields.time[0] ||
    refreshedRequest.time[1] !== normalizedFields.time[1];
  const typeChanged =
    refreshedRequest.type.trim() !== normalizedFields.type.trim();
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
    const participantUserIds = Array.from(
      new Set(activeParticipants.map((participant) => participant.userId)),
    );

    for (const participantUserId of participantUserIds) {
      await assertNoUserTimeWindowConflict({
        userId: participantUserId,
        targetTimeWindow: normalizedFields.time,
        excludePrId: id,
      });
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
  });

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
  );
}
