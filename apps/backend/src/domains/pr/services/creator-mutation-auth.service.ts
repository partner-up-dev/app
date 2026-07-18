import { throwHttpProblem } from "../../../lib/problem-details";
import type { PRId } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { RequestAuth } from "../../../auth/types";
import { assertPRDraftAccess } from "./draft-access-policy.service";

const prRepo = new PartnerRequestRepository();

export type CreatorMutationMode = "status" | "content";

export type CreatorMutationAuthResult = {
  request: NonNullable<Awaited<ReturnType<PartnerRequestRepository["findById"]>>>;
  actorUserId: UserId | null;
};

export async function authorizeCreatorMutation(
  prId: PRId,
  auth: RequestAuth,
  mode: CreatorMutationMode,
): Promise<CreatorMutationAuthResult> {
  const request = await prRepo.findById(prId);
  if (!request) {
    return throwHttpProblem({ status: 404, detail: "Partner request not found" });
  }

  if (request.status === "DRAFT") {
    assertPRDraftAccess({
      request,
      actor: auth,
      operation: mode === "content" ? "content-mutation" : "status-mutation",
    });
    return {
      request,
      actorUserId: request.createdBy as UserId,
    };
  }

  if (!request.createdBy) {
    return throwHttpProblem({ status: 403, detail: "Partner request has no claimed creator" });
  }

  if (auth.role === "anonymous" || auth.userId !== request.createdBy) {
    return throwHttpProblem({
      status: 403,
      detail: "Only the creator can modify this partner request",
    });
  }

  return {
    request,
    actorUserId: request.createdBy,
  };
}
