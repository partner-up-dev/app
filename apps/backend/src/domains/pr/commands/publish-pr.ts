import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import {
  resolvePublishedCreator,
  throwAuthenticatedRequired,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { resolveUserByOpenId } from "../../user";
import { recalculatePRStatus } from "../services/slot-management.service";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import { operationLogService } from "../../../infra/operation-log";
import { scheduleAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reminder.service";
import { assertPRStartTimeHasNotPassed } from "../services/pr-time-window-guard.service";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();
const userRepo = new UserRepository();

export type PublishPRResult = {
  pr: PublicPR;
  createdBy: UserId;
};

const ensureCreatorSlotJoined = async (prId: PRId, creatorUserId: UserId) => {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  const existing = await partnerRepo.findActiveByPrIdAndUserId(prId, creatorUserId);
  if (existing) {
    return;
  }

  const targetStatus = "JOINED";
  const created = await partnerRepo.createSlot({
    prId,
    userId: creatorUserId,
    status: targetStatus,
  });
  if (!created) {
    return throwHttpProblem({ status: 500, detail: "Failed to create creator partner slot" });
  }

  await recalculatePRStatus(prId);
};

export async function publishPR(
  id: PRId,
  creatorIdentity: CreatorIdentityInput,
  actor?: PRDraftActor,
): Promise<PublishPRResult> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  if (request.status !== "DRAFT") {
    return throwHttpProblem({
      status: 400,
      detail: "Only DRAFT partner requests can be published",
    });
  }

  assertPRDraftAccess({
    request,
    actor:
      actor ??
      (creatorIdentity.authenticatedUserId
        ? { userId: creatorIdentity.authenticatedUserId, roles: ["authenticated"] }
        : { userId: null, roles: ["anonymous"] }),
    operation: "publish",
  });

  let creatorUserId: UserId;

  if (request.createdBy) {
    if (creatorIdentity.authenticatedUserId) {
      if (creatorIdentity.authenticatedUserId !== request.createdBy) {
        return throwHttpProblem({
          status: 403,
          detail: "Only the draft creator can publish this partner request",
        });
      }
      const user = await userRepo.findById(request.createdBy);
      if (!user) {
        return throwHttpProblem({ status: 404, detail: "Draft creator user not found" });
      }
      creatorUserId = user.id;
    } else if (creatorIdentity.oauthOpenId) {
      const oauthUser = await resolveUserByOpenId(creatorIdentity.oauthOpenId);
      if (oauthUser.id !== request.createdBy) {
        return throwHttpProblem({
          status: 403,
          detail: "Only the draft creator can publish this partner request",
        });
      }
      creatorUserId = oauthUser.id;
    } else {
      return throwAuthenticatedRequired();
    }
  } else {
    const creator = await resolvePublishedCreator(creatorIdentity);
    creatorUserId = creator.user.id;
  }

  await assertNoUserTimeWindowConflict({
    userId: creatorUserId,
    targetTimeWindow: request.time,
    excludePrId: id,
  });
  assertPRStartTimeHasNotPassed(request.time);
  await assertPRTimeWindowAvailableAtLocation({
    location: request.location,
    timeWindow: request.time,
  });

  if (!request.createdBy) {
    await prRepo.setCreatedBy(id, creatorUserId);
  }

  const updated = await prRepo.updateStatus(id, "OPEN");
  if (!updated) {
    return throwHttpProblem({ status: 500, detail: "Failed to publish partner request" });
  }

  await ensureCreatorSlotJoined(id, creatorUserId);

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  operationLogService.log({
    actorId: creatorUserId,
    action: "pr.publish",
    aggregateType: "partner_request",
    aggregateId: String(id),
    detail: { fromStatus: "DRAFT", toStatus: latest.status },
  });

  await scheduleAlternativeWaitlistNotificationsForCandidate(latest);

  return {
    pr: await toPublicPR(latest, creatorUserId),
    createdBy: creatorUserId,
  };
}
