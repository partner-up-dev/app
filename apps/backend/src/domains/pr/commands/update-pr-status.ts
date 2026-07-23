import { throwHttpProblem } from "../../../lib/problem-details";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatusManual } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { toPublicPR, type PublicPR } from "../services/pr-view.service";
import { refreshTemporalStatus } from "../temporal-refresh";
import { reconcileAlternativeWaitlistNotificationsForCandidate } from "../services/waitlist-alternative-reconciler.service";
import { assertPRDraftAccess, type PRDraftActor } from "../services/draft-access-policy.service";
import { createPRReadyTransitionTransactionPort } from "../adapters/pr-ready-transition-transaction";
import { createPRTerminalTransitionTransactionPort } from "../adapters/pr-terminal-transition-transaction";

const prRepo = new PartnerRequestRepository();
const prReadyTransition = createPRReadyTransitionTransactionPort();
const prTerminalTransition = createPRTerminalTransitionTransactionPort();

export async function updatePRStatus(
  id: PRId,
  status: PRStatusManual,
  actorUserId: UserId | null,
  actor?: PRDraftActor,
): Promise<PublicPR> {
  const request = await prRepo.findById(id);
  if (!request) {
    return throwHttpProblem({
      status: 404,
      detail: "Partner request not found",
    });
  }
  if (actor) {
    assertPRDraftAccess({ request, actor, operation: "status-mutation" });
  }
  // This command can be reached outside the controller preflight. Do not let
  // its temporal refresh create a READY transition before rejecting the actor.
  if (status === "READY" && actorUserId !== null && request.createdBy !== actorUserId) {
    return throwHttpProblem({
      status: 403,
      detail: "Only the creator can mark this partner request ready",
    });
  }
  const refreshedRequest = await refreshTemporalStatus(request);

  const currentStatus = refreshedRequest.status as string;

  if (
    status === "ACTIVE" &&
    currentStatus !== "ACTIVE" &&
    currentStatus !== "OPEN" &&
    currentStatus !== "READY"
  ) {
    return throwHttpProblem({
      status: 400,
      detail: "Cannot set ACTIVE - only OPEN or READY can become ACTIVE",
    });
  }

  const updated =
    status === "READY"
      ? await (async () => {
          const transition = await prReadyTransition.transitionManual({ prId: id });
          return transition.outcome === "PR_MISSING" ? null : transition.request;
        })()
      : status === "CLOSED"
        ? await (async () => {
            const transition = await prTerminalTransition.closeManually({ prId: id });
            return transition.outcome === "PR_MISSING" ? null : transition.request;
          })()
        : await prRepo.updateStatus(id, status);
  if (!updated) {
    return throwHttpProblem({
      status: 500,
      detail: "Failed to update status",
    });
  }

  await reconcileAlternativeWaitlistNotificationsForCandidate(updated);

  return toPublicPR(updated, null);
}
