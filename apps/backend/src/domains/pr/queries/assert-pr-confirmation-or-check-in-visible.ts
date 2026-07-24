import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();

/**
 * Preserves the legacy route sequence: PR existence/draft opacity is resolved
 * before transport checks the caller's WeChat binding. The write commands
 * still repeat their own access and current-state checks near mutation.
 */
export const assertPRConfirmationOrCheckInVisible = async (input: {
  prId: PRId;
  actor: PRDraftActor;
}): Promise<void> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({
    request,
    actor: input.actor,
    operation: "participant-flow",
  });
};
