import type { PRId } from "../../../entities/partner-request";
import type { User } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { resolveUserByOpenId } from "../../user";
import { createPrAdmissionTransactionPort } from "../adapters/pr-admission-transaction";
import { reconcileActivityStartReminderForParticipant } from "../services/activity-start-reminder-reconciler.service";
import { reconcileConfirmationRemindersForParticipant } from "../services/confirmation-reminder-reconciler.service";
import { reconcileCurrentCreator } from "../services/current-creator.service";
import { assertPRJoinGatesResolvedForUser } from "../services/join-gates.service";
import {
  hasParticipationPolicy,
  isJoinLockedByPolicy,
  resolveParticipationPolicy,
} from "../services/participation-policy.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTypeParticipationFrequencyLimitAllows } from "../services/pr-type-participation-frequency-limit.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { countActivePartnersForPR } from "../services/slot-management.service";
import { isPRJoinableStatus } from "../services/status-rules";
import { closeAlternativeWaitlistSourcesAfterJoin } from "../services/waitlist-alternative-reminder.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { expandFullCapacityPR } from "./expand-full-capacity-pr";
import { assertPRDraftAccess } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const prAdmissionTransaction = createPrAdmissionTransactionPort();

export async function joinPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status"> & { role?: User["role"] },
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  assertPRDraftAccess({
    request,
    actor: { userId: user.id, roles: user.role ?? ["anonymous"] },
    operation: "participant-flow",
  });
  const refreshedRequest = await refreshTemporalStatus(request);

  if (hasParticipationPolicy(refreshedRequest)) {
    const policy = resolveParticipationPolicy(refreshedRequest, refreshedRequest.time);
    if (isJoinLockedByPolicy(policy)) {
      return throwHttpProblem({
        status: 400,
        detail: "Cannot join - partner request is locked after join lock",
      });
    }
  }

  if (!isPRJoinableStatus(refreshedRequest.status as string)) {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is not open" });
  }

  if (user.status !== "ACTIVE") {
    return throwHttpProblem({ status: 403, detail: "Current user is not active" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (existing) {
    await reconcileCurrentCreator(id);
    const latest = await prRepo.findById(id);
    if (!latest) {
      return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
    }
    await reconcileActivityStartReminderForParticipant({ prId: id, recipientUserId: user.id });
    await reconcileConfirmationRemindersForParticipant({
      prId: id,
      slotId: existing.id,
      recipientUserId: user.id,
    });
    return toPublicPR(latest, user.id);
  }

  await assertNoUserTimeWindowConflict({
    userId: user.id,
    targetTimeWindow: refreshedRequest.time,
    excludePrId: id,
  });
  await assertPRTypeParticipationFrequencyLimitAllows({
    request: refreshedRequest,
    userId: user.id,
  });

  const activeCount = await countActivePartnersForPR(id);

  await assertPRJoinGatesResolvedForUser({
    prId: id,
    userId: user.id,
  });

  if (refreshedRequest.maxPartners !== null && activeCount >= refreshedRequest.maxPartners) {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is full" });
  }
  const admission = await prAdmissionTransaction.admitDirect({
    prId: id,
    userId: user.id,
  });
  if (admission.outcome === "ALREADY_ACTIVE") {
    await reconcileCurrentCreator(id);
    const latest = await prRepo.findById(id);
    if (!latest) {
      return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
    }
    await reconcileActivityStartReminderForParticipant({ prId: id, recipientUserId: user.id });
    await reconcileConfirmationRemindersForParticipant({
      prId: id,
      slotId: admission.slot.id,
      recipientUserId: user.id,
    });
    return toPublicPR(latest, user.id);
  }
  if (admission.outcome === "ALREADY_WAITLISTED") {
    return throwHttpProblem({
      status: 409,
      detail: "Cannot join directly while this user has a pending waitlist entry",
      code: "PR_WAITLIST_ENTRY_PENDING",
    });
  }
  if (admission.outcome === "WAITLIST_PRIORITY") {
    return throwHttpProblem({
      status: 409,
      detail: "Cannot join directly while an eligible waitlisted participant has priority",
      code: "PR_WAITLIST_PRIORITY",
    });
  }
  if (admission.outcome === "FULL") {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is full" });
  }
  if (admission.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (admission.outcome === "NOT_JOINABLE") {
    return throwHttpProblem({ status: 400, detail: "Cannot join - partner request is not open" });
  }
  if (admission.outcome === "INELIGIBLE") {
    return throwHttpProblem({
      status: 409,
      detail: "Cannot join - admission eligibility changed; refresh and try again",
      code: "PR_ADMISSION_ELIGIBILITY_CHANGED",
    });
  }
  if (admission.outcome !== "ADMITTED") {
    return throwHttpProblem({ status: 500, detail: "Unexpected direct admission outcome" });
  }

  const assignedPartnerId = admission.slot.id;
  await reconcileCurrentCreator(id);

  const afterRecalculate = await prRepo.findById(id);
  const activeCountAfterJoin = await countActivePartnersForPR(id);
  if (
    afterRecalculate &&
    afterRecalculate.maxPartners !== null &&
    activeCountAfterJoin >= afterRecalculate.maxPartners
  ) {
    await expandFullCapacityPR(id);
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  await reconcileActivityStartReminderForParticipant({ prId: id, recipientUserId: user.id });
  await reconcileConfirmationRemindersForParticipant({
    prId: id,
    slotId: assignedPartnerId,
    recipientUserId: user.id,
  });
  await closeAlternativeWaitlistSourcesAfterJoin({
    alternativeRequest: latest,
    userId: user.id,
    alternativePartnerId: assignedPartnerId,
  });
  return toPublicPR(latest, user.id);
}

export async function joinPR(id: PRId, openId: string): Promise<PublicPR> {
  const user = await resolveUserByOpenId(openId);
  return joinPRAsUser(id, user);
}
