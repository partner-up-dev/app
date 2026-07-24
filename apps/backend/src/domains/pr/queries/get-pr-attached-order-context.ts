import type { PRId } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRAttachedOrderContext } from "../order-attachment-contracts";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";

const prRepo = new PartnerRequestRepository();

export const getPRAttachedOrderContext = async (input: {
  prId: PRId;
  actor: PRDraftActor;
}): Promise<PRAttachedOrderContext> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  assertPRDraftAccess({
    request,
    actor: input.actor,
    operation: "read",
  });

  return {
    prId: request.id,
    orderIds: [...request.orders],
  };
};
