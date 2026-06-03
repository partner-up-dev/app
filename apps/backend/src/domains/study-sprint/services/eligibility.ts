import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { Partner, PartnerId } from "../../../entities/partner";
import type { PartnerRequest, PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { STUDY_SPRINT_PR_TYPE } from "../model";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export type StudySprintEligibility = {
  pr: PartnerRequest;
  partner: Partner & { id: PartnerId };
};

export const requireStudySprintActiveParticipant = async (input: {
  prId: PRId;
  userId: UserId;
}): Promise<StudySprintEligibility> => {
  const pr = await prRepo.findById(input.prId);
  if (!pr) {
    return throwHttpProblem({
      status: 404,
      detail: "Partner request not found",
    });
  }

  if (pr.type !== STUDY_SPRINT_PR_TYPE) {
    return throwHttpProblem({
      status: 404,
      detail: "Study sprint room not found",
    });
  }

  if (pr.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 403,
      detail: "Study sprint room is available only when PR is ACTIVE",
    });
  }

  const partner = await partnerRepo.findActiveByPrIdAndUserId(
    input.prId,
    input.userId,
  );
  if (!partner) {
    return throwHttpProblem({
      status: 403,
      detail: "Only current active participants can access study sprint room",
    });
  }

  return { pr, partner };
};

export const listStudySprintActiveParticipants = (prId: PRId) =>
  partnerRepo.listActiveParticipantSummariesByPrId(prId);
