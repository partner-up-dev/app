import { type PRRoute, prRouteSchema } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { PRTypeRouteApplicationRepository } from "../../../repositories/PRTypeRouteApplicationRepository";
import { getPRTypeConfigAuthoringPolicy } from "../../pr-type-config";
import type { PRTypeRouteApplicationView } from "../services/route-application";
import { toPRTypeRouteApplicationView } from "../services/route-application";

const applicationRepo = new PRTypeRouteApplicationRepository();

const normalizeType = (value: string): string => value.trim();

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
  const config = await getPRTypeConfigAuthoringPolicy(type);
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
