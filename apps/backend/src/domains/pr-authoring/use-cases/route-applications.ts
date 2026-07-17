import { type PRRoute, prRouteSchema } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeConfigRepository } from "../../../repositories/PRTypeConfigRepository";
import { PRTypeRouteApplicationRepository } from "../../../repositories/PRTypeRouteApplicationRepository";
import type { PRTypeRouteApplicationView } from "../services/route-application";
import {
  normalizePRTypeRouteRejectReason,
  toPRTypeRouteApplicationView,
} from "../services/route-application";

const configRepo = new PRTypeConfigRepository();
const applicationRepo = new PRTypeRouteApplicationRepository();

const normalizeType = (value: string): string => value.trim();

export const listAdminPRTypeRouteApplications = async (): Promise<PRTypeRouteApplicationView[]> =>
  (await applicationRepo.listAll()).map(toPRTypeRouteApplicationView);

export const listMyPRTypeRouteApplications = async (
  userId: UserId,
): Promise<PRTypeRouteApplicationView[]> =>
  (await applicationRepo.findBySubmitter(userId)).map(toPRTypeRouteApplicationView);

export const submitPRTypeRouteApplication = async (input: {
  type: string;
  route: PRRoute;
  submittedByUserId: UserId;
}): Promise<PRTypeRouteApplicationView> => {
  const type = normalizeType(input.type);
  const config = await configRepo.findByType(type);
  if (!config) {
    return throwHttpProblem({
      status: 404,
      detail: "PR type not found",
      code: "PR_AUTHORING_TYPE_NOT_FOUND",
    });
  }
  if (config.locationPool.length > 0) {
    return throwHttpProblem({
      status: 409,
      detail: "PR type is not accepting route applications",
      code: "PR_AUTHORING_ROUTE_APPLICATION_UNAVAILABLE",
    });
  }
  const route = prRouteSchema.parse(input.route);
  const created = await applicationRepo.create({
    type,
    route,
    submittedByUserId: input.submittedByUserId,
  });
  operationLogService.log({
    actorId: input.submittedByUserId,
    action: "pr_type.route_application.submit",
    aggregateType: "pr_type_route_application",
    aggregateId: String(created.id),
    detail: { type, status: created.status },
  });
  return toPRTypeRouteApplicationView(created);
};

const buildRoutePoolEntryId = (
  applicationId: number,
  routePool: readonly { id: string }[],
): string => {
  const baseId = `application-${applicationId}`;
  const existingIds = new Set(routePool.map((entry) => entry.id));
  if (!existingIds.has(baseId)) return baseId;
  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
};

const areRoutesEqual = (left: PRRoute, right: PRRoute): boolean =>
  left.length === right.length &&
  left.every((point, index) => {
    const other = right[index];
    return Boolean(
      other &&
      point.name === other.name &&
      point.full_address === other.full_address &&
      JSON.stringify(point.wgs84) === JSON.stringify(other.wgs84) &&
      JSON.stringify(point.bd09) === JSON.stringify(other.bd09) &&
      JSON.stringify(point.gcj02) === JSON.stringify(other.gcj02),
    );
  });

export const reviewAdminPRTypeRouteApplication = async (input: {
  applicationId: number;
  reviewedByUserId: UserId | null;
  status: "ACCEPTED" | "REJECTED";
  rejectReason?: string | null;
  route?: PRRoute;
}): Promise<PRTypeRouteApplicationView> => {
  const application = await applicationRepo.findById(input.applicationId);
  if (!application)
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
      code: "PR_TYPE_ROUTE_APPLICATION_NOT_FOUND",
    });
  if (application.status !== "PENDING") {
    return throwHttpProblem({
      status: 409,
      detail: "Route application has already been reviewed",
      code: "PR_TYPE_ROUTE_APPLICATION_ALREADY_REVIEWED",
    });
  }
  const config = await configRepo.findByType(application.type);
  if (!config)
    return throwHttpProblem({
      status: 404,
      detail: "PR type not found",
      code: "PR_TYPE_NOT_FOUND",
    });

  let acceptedRoute: PRRoute | undefined;
  if (input.status === "ACCEPTED") {
    if (config.locationPool.length > 0) {
      return throwHttpProblem({
        status: 409,
        detail: "PR type uses a location pool",
        code: "PR_AUTHORING_ROUTE_APPLICATION_UNAVAILABLE",
      });
    }
    acceptedRoute = prRouteSchema.parse(input.route ?? application.route);
    const hasSameRoute = config.routePool.some((entry) =>
      areRoutesEqual(entry.route, acceptedRoute!),
    );
    if (!hasSameRoute) {
      const updatedConfig = await configRepo.updateByType(application.type, {
        routePool: [
          ...config.routePool,
          { id: buildRoutePoolEntryId(application.id, config.routePool), route: acceptedRoute },
        ],
      });
      if (!updatedConfig)
        return throwHttpProblem({
          status: 404,
          detail: "PR type not found",
          code: "PR_TYPE_NOT_FOUND",
        });
    }
  }

  const updated = await applicationRepo.updateReviewState(application.id, {
    status: input.status,
    reviewedByUserId: input.reviewedByUserId,
    rejectReason:
      input.status === "REJECTED" ? normalizePRTypeRouteRejectReason(input.rejectReason) : null,
    route: input.status === "ACCEPTED" && input.route !== undefined ? acceptedRoute : undefined,
  });
  if (!updated)
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
      code: "PR_TYPE_ROUTE_APPLICATION_NOT_FOUND",
    });
  operationLogService.log({
    actorId: input.reviewedByUserId,
    action: `pr_type.route_application.${input.status === "ACCEPTED" ? "accept" : "reject"}`,
    aggregateType: "pr_type_route_application",
    aggregateId: String(updated.id),
    detail: { type: updated.type, status: updated.status, rejectReason: updated.rejectReason },
  });
  return toPRTypeRouteApplicationView(updated);
};
