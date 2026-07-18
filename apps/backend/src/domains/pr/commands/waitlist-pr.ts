import type { PRId } from "../../../entities/partner-request";
import type { User } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { assertPRJoinGatesResolvedForUser } from "../services/join-gates.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTypeParticipationFrequencyLimitAllows } from "../services/pr-type-participation-frequency-limit.service";
import { type PublicPR, toPublicPR } from "../services/pr-view.service";
import { countActivePartnersForPR } from "../services/slot-management.service";
import { isWaitlistOpenForRequest } from "../services/waitlist.service";
import { scheduleAlternativeWaitlistNotificationsForSource } from "../services/waitlist-alternative-reminder.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { assertPRDraftAccess } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function waitlistPRAsUser(
  id: PRId,
  user: Pick<User, "id" | "status"> & { role?: User["role"] },
  options: { alternativePrReminderOptIn?: boolean } = {},
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

  if (user.status !== "ACTIVE") {
    return throwHttpProblem({ status: 403, detail: "Current user is not active" });
  }

  const existingActive = await partnerRepo.findActiveByPrIdAndUserId(id, user.id);
  if (existingActive) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
    }
    return toPublicPR(latest, user.id);
  }

  const existingPending = await partnerRepo.findPendingByPrIdAndUserId(id, user.id);
  if (existingPending) {
    const latest = await prRepo.findById(id);
    if (!latest) {
      return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
    }
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
  await assertPRJoinGatesResolvedForUser({
    prId: id,
    userId: user.id,
  });

  const activeCount = await countActivePartnersForPR(id);
  if (
    !isWaitlistOpenForRequest({
      request: refreshedRequest,
      activeCount,
    })
  ) {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot waitlist - partner request is not at waitlistable capacity",
    });
  }

  const latestHistoricalSlot = await partnerRepo.findReusableInactiveByPrIdAndUserId(id, user.id);
  const pendingSlot = latestHistoricalSlot
    ? await partnerRepo.markPending(latestHistoricalSlot.id, {
        alternativePrReminderOptIn: options.alternativePrReminderOptIn,
      })
    : await partnerRepo.createSlot({
        prId: id,
        userId: user.id,
        status: "PENDING",
        alternativePrReminderOptIn: options.alternativePrReminderOptIn,
      });
  if (!pendingSlot) {
    return throwHttpProblem({
      status: 500,
      detail: "Failed to persist waitlist participation record",
    });
  }

  operationLogService.log({
    actorId: user.id,
    action: "partner.waitlist_join",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: {
      partnerId: pendingSlot.id,
      alternativePrReminderOptIn: options.alternativePrReminderOptIn === true,
    },
  });

  if (options.alternativePrReminderOptIn === true) {
    await scheduleAlternativeWaitlistNotificationsForSource({
      sourceRequest: refreshedRequest,
      sourcePartnerId: pendingSlot.id,
      recipientUserId: user.id,
    });
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }
  return toPublicPR(latest, user.id);
}
