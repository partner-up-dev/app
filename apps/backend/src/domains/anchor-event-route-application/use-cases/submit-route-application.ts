import { normalizeLocationPool } from "../../../entities/anchor-event";
import { prRouteSchema, type PRRoute } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventRouteApplicationRepository } from "../../../repositories/AnchorEventRouteApplicationRepository";
import { toAnchorEventRouteApplicationView } from "../services/route-application";

const anchorEventRepo = new AnchorEventRepository();
const routeApplicationRepo = new AnchorEventRouteApplicationRepository();

export async function submitAnchorEventRouteApplication(input: {
  anchorEventId: number;
  route: PRRoute;
  submittedByUserId: UserId;
}) {
  const event = await anchorEventRepo.findById(input.anchorEventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  if (event.status !== "ACTIVE") {
    return throwHttpProblem({
      status: 400,
      detail: "Anchor event is not accepting route applications",
      code: "ANCHOR_EVENT_ROUTE_APPLICATION_UNAVAILABLE",
    });
  }

  if (normalizeLocationPool(event.locationPool).length > 0) {
    return throwHttpProblem({
      status: 400,
      detail: "Anchor event is not accepting route applications",
      code: "ANCHOR_EVENT_ROUTE_APPLICATION_UNAVAILABLE",
    });
  }

  const route = prRouteSchema.parse(input.route);
  const created = await routeApplicationRepo.create({
    anchorEventId: event.id,
    route,
    submittedByUserId: input.submittedByUserId,
  });

  operationLogService.log({
    actorId: input.submittedByUserId,
    action: "anchor_event.route_application.submit",
    aggregateType: "anchor_event_route_application",
    aggregateId: String(created.id),
    detail: {
      anchorEventId: event.id,
      status: created.status,
    },
  });

  return toAnchorEventRouteApplicationView(created);
}
