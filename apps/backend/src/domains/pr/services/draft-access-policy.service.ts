import type { RequestAuth } from "../../../auth/types";
import type { PartnerRequest } from "../../../entities/partner-request";
import { throwHttpProblem } from "../../../lib/problem-details";

export type PRDraftAccessOperation =
  | "read"
  | "content-mutation"
  | "status-mutation"
  | "publish"
  | "participant-flow";

export type PRDraftActor = {
  userId: RequestAuth["userId"];
  roles: readonly RequestAuth["roles"][number][];
};

// Keep the transport code deliberately status-agnostic so a denial does not
// disclose that the row is a DRAFT.
export const PR_DRAFT_NOT_ACCESSIBLE_CODE = "PR_NOT_ACCESSIBLE";

/**
 * Enforces ordinary PR access to legacy DRAFT rows without performing I/O.
 * Raw repository/admin/analytics readers deliberately remain outside this policy.
 */
export const assertPRDraftAccess = (input: {
  request: Pick<PartnerRequest, "status" | "createdBy">;
  actor: PRDraftActor;
  operation: PRDraftAccessOperation;
}): void => {
  if (input.request.status !== "DRAFT") return;

  if (
    input.operation !== "participant-flow" &&
    input.actor.roles.includes("authenticated") &&
    !input.actor.roles.includes("service") &&
    !input.actor.roles.includes("analytics") &&
    input.actor.userId !== null &&
    input.actor.userId === input.request.createdBy
  ) {
    return;
  }

  return throwHttpProblem({
    status: 404,
    detail: "Partner request not found",
    code: PR_DRAFT_NOT_ACCESSIBLE_CODE,
  });
};
