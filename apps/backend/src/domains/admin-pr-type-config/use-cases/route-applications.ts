import { type PRRoute, prRouteSchema } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeRouteApplicationRepository } from "../../../repositories/PRTypeRouteApplicationRepository";
import {
  normalizePRTypeRouteRejectReason,
  toPRTypeRouteApplicationView,
  type PRTypeRouteApplicationView,
} from "../../pr-authoring";
import { appendPRTypeConfigRoute, getPRTypeConfigAuthoringPolicy } from "../../pr-type-config";

const applicationRepo = new PRTypeRouteApplicationRepository();

export const listAdminPRTypeRouteApplications = async (): Promise<PRTypeRouteApplicationView[]> =>
  (await applicationRepo.listAll()).map(toPRTypeRouteApplicationView);

/**
 * Admin-only adapter for a user-authored route proposal. The PR Type Config owner owns the current-config
 * mutation; this adapter owns review authorization, application state, and audit logging.
 */
export const reviewAdminPRTypeRouteApplication = async (input: {
  applicationId: number;
  reviewedByUserId: UserId | null;
  status: "ACCEPTED" | "REJECTED";
  rejectReason?: string | null;
  route?: PRRoute;
}): Promise<PRTypeRouteApplicationView> => {
  const application = await applicationRepo.findById(input.applicationId);
  if (!application) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
      code: "PR_TYPE_ROUTE_APPLICATION_NOT_FOUND",
    });
  }
  if (application.status !== "PENDING") {
    return throwHttpProblem({
      status: 409,
      detail: "Route application has already been reviewed",
      code: "PR_TYPE_ROUTE_APPLICATION_ALREADY_REVIEWED",
    });
  }

  let acceptedRoute: PRRoute | undefined;
  if (input.status === "ACCEPTED") {
    acceptedRoute = prRouteSchema.parse(input.route ?? application.route);
    const appendResult = await appendPRTypeConfigRoute({
      type: application.type,
      applicationId: application.id,
      route: acceptedRoute,
    });
    if (appendResult.kind === "TYPE_NOT_FOUND") {
      return throwHttpProblem({
        status: 404,
        detail: "PR type not found",
        code: "PR_TYPE_NOT_FOUND",
      });
    }
    if (appendResult.kind === "LOCATION_POOL") {
      return throwHttpProblem({
        status: 409,
        detail: "PR type uses a location pool",
        code: "PR_AUTHORING_ROUTE_APPLICATION_UNAVAILABLE",
      });
    }
  } else if (!(await getPRTypeConfigAuthoringPolicy(application.type))) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type not found",
      code: "PR_TYPE_NOT_FOUND",
    });
  }

  const updated = await applicationRepo.updateReviewState(application.id, {
    status: input.status,
    reviewedByUserId: input.reviewedByUserId,
    rejectReason:
      input.status === "REJECTED" ? normalizePRTypeRouteRejectReason(input.rejectReason) : null,
    route: input.status === "ACCEPTED" && input.route !== undefined ? acceptedRoute : undefined,
  });
  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
      code: "PR_TYPE_ROUTE_APPLICATION_NOT_FOUND",
    });
  }
  return toPRTypeRouteApplicationView(updated);
};
