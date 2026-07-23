import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { UserRepository } from "../../../repositories/UserRepository";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { createPrAdmissionTransactionPort } from "../adapters/pr-admission-transaction";
import {
  resolvePublishedCreator,
  throwAuthenticatedRequired,
  type CreatorIdentityInput,
} from "../services/creator-identity.service";
import { resolveUserByOpenId } from "../../user";
import { assertNoUserTimeWindowConflict } from "../services/participation-time-conflict.service";
import { assertPRTimeWindowAvailableAtLocation } from "../services/poi-availability.service";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reconciler.service";
import { assertPRStartTimeHasNotPassed } from "../services/pr-time-window-guard.service";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();
const userRepo = new UserRepository();
const prAdmissionTransaction = createPrAdmissionTransactionPort();

export type PublishPRResult = {
  pr: PublicPR;
  createdBy: UserId;
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

  const admission = await prAdmissionTransaction.publishCreator({
    prId: id,
    creatorUserId,
  });
  if (admission.outcome === "PR_MISSING") {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }
  if (admission.outcome === "NOT_DRAFT") {
    return throwHttpProblem({
      status: 400,
      detail: "Only DRAFT partner requests can be published",
    });
  }
  if (admission.outcome === "CREATOR_MISMATCH") {
    return throwHttpProblem({
      status: 403,
      detail: "Only the draft creator can publish this partner request",
    });
  }
  if (admission.outcome === "FULL") {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot publish - creator cannot be admitted within partner capacity",
    });
  }
  if (admission.outcome === "INELIGIBLE") {
    return throwHttpProblem({
      status: admission.reason === "USER_INACTIVE" ? 401 : 409,
      detail:
        admission.reason === "USER_INACTIVE"
          ? "Invalid authenticated user"
          : "Cannot publish - creator now conflicts with another joined partner request",
      code:
        admission.reason === "USER_INACTIVE"
          ? "PR_ADMISSION_ELIGIBILITY_CHANGED"
          : "JOIN_TIME_WINDOW_CONFLICT",
    });
  }

  const latest = await prRepo.findById(id);
  if (!latest) {
    return throwHttpProblem({ status: 500, detail: "Failed to reload partner request" });
  }

  await reconcileAlternativeWaitlistNotificationsForCandidate(latest);

  return {
    pr: await toPublicPR(latest, creatorUserId),
    createdBy: creatorUserId,
  };
}
