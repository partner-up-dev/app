import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PartnerRequestFields } from "../contracts/partner-request";
import { createPRContentMeetingPointTransactionPort } from "../adapters/pr-content-meeting-point-transaction";
import { createCoreFieldChangePRMessage } from "./create-pr-message";
import {
  cancelActivityStartReminderForParticipant,
  reconcileActivityStartReminderForParticipant,
} from "../services/activity-start-reminder-reconciler.service";
import {
  cancelConfirmationRemindersForParticipant,
  reconcileConfirmationRemindersForParticipant,
} from "../services/confirmation-reminder-reconciler.service";
import {
  assertNoUserTimeWindowConflict,
  findUserTimeWindowConflict,
} from "../services/participation-time-conflict.service";
import { assertManualPartnerBoundsValid } from "../services/partner-bounds.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import {
  assertPRContentEditable,
  resolveChangedPRContentFields,
} from "../services/pr-edit-capability.service";
import { normalizePartnerRequestFieldsForPersistence } from "../services/pr-place-mode.service";
import { canonicalizePartnerRequestFieldsTime } from "../services/pr-time-window-instant.service";
import { assertPRTypeCreationAllowed } from "../services/pr-type-creation-policy.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import {
  countActivePartnersForPR,
  listActiveParticipantSummariesForPR,
} from "../services/slot-management.service";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reconciler.service";
import { promoteWaitlistedPartners } from "../services/waitlist.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const prContentMeetingPointTransaction = createPRContentMeetingPointTransactionPort();
const RELEASE_REASON_TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE =
  "TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE";
export const PARTICIPANT_RELEASE_REQUIRED_CODE = "PARTICIPANT_RELEASE_REQUIRED";

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
    .map(
      (field) =>
        CORE_FIELD_NOTIFICATION_LABELS[field as keyof typeof CORE_FIELD_NOTIFICATION_LABELS] ??
        null,
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
  actor?: PRDraftActor,
): Promise<PublicPR> {
  const normalizedFields = normalizePartnerRequestFieldsForPersistence(
    canonicalizePartnerRequestFieldsTime(fields),
  );
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (actor) {
    assertPRDraftAccess({ request, actor, operation: "content-mutation" });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const minMaxChanged =
    refreshedRequest.minPartners !== normalizedFields.minPartners ||
    refreshedRequest.maxPartners !== normalizedFields.maxPartners;
  const timeChanged =
    refreshedRequest.time[0] !== normalizedFields.time[0] ||
    refreshedRequest.time[1] !== normalizedFields.time[1];
  const typeChanged = refreshedRequest.type.trim() !== normalizedFields.type.trim();
  const changedFields = resolveChangedPRContentFields(refreshedRequest, normalizedFields);
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
    await assertPRTypeCreationAllowed({
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
  let releasedParticipants: Awaited<ReturnType<typeof listActiveParticipantSummariesForPR>> = [];

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
          detail:
            "Cannot release conflicted participants because the PR would fall below minPartners",
          code: "PARTICIPANT_RELEASE_BELOW_MIN_PARTNERS",
        });
      }

      releasedParticipants = conflictedParticipants;
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

  const transactionResult = await prContentMeetingPointTransaction.update({
    prId: id,
    fields: normalizedFields,
    releaseParticipants: releasedParticipants.map((participant) => ({
      partnerId: participant.partnerId,
      releaseReason: RELEASE_REASON_TIME_CONFLICT_AFTER_CORE_FIELD_CHANGE,
    })),
    validateSlotCapacity: minMaxChanged,
    recalculateStatus:
      minMaxChanged && refreshedRequest.status !== "DRAFT" && !options.preserveStatus,
  });
  if (transactionResult.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  const releasedPartnerIds = new Set(transactionResult.releasedPartnerIds);
  const committedReleasedParticipants = releasedParticipants.filter((participant) =>
    releasedPartnerIds.has(participant.partnerId),
  );

  for (const participant of committedReleasedParticipants) {
    await cancelActivityStartReminderForParticipant({
      prId: id,
      recipientUserId: participant.userId,
    });
    await cancelConfirmationRemindersForParticipant({
      prId: id,
      slotId: participant.partnerId,
      recipientUserId: participant.userId,
    });
  }

  if (committedReleasedParticipants.length > 0) {
    await promoteWaitlistedPartners(id);
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  if (timeChanged && refreshedRequest.status !== "DRAFT") {
    const remainingParticipants = await listActiveParticipantSummariesForPR(id);
    for (const participant of remainingParticipants) {
      await reconcileActivityStartReminderForParticipant({
        prId: id,
        recipientUserId: participant.userId,
      });
      await reconcileConfirmationRemindersForParticipant({
        prId: id,
        slotId: participant.partnerId,
        recipientUserId: participant.userId,
      });
    }
  }

  const coreFieldChangeMessageBody =
    refreshedRequest.status === "DRAFT" ? null : buildCoreFieldChangeMessageBody(changedFields);
  if (coreFieldChangeMessageBody !== null && actorUserId !== null) {
    await createCoreFieldChangePRMessage({
      prId: id,
      authorUserId: actorUserId,
      body: coreFieldChangeMessageBody,
    });
  }

  await reconcileAlternativeWaitlistNotificationsForCandidate(latest);

  return toPublicPR(latest, null);
}

export async function updateUserPRContent(
  id: PRId,
  fields: UserUpdatePRContentFields,
  actorUserId: UserId | null,
  options: Pick<UpdatePRContentOptions, "allowRelease"> = {},
  actor?: PRDraftActor,
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
    actor,
  );
}
