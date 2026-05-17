import {
  normalizeAnchorEventRoutePool,
  normalizeLocationPool,
  type AnchorEventRoutePool,
} from "../../../entities/anchor-event";
import type { PRRoute } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { operationLogService } from "../../../infra/operation-log";
import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventRouteApplicationRepository } from "../../../repositories/AnchorEventRouteApplicationRepository";
import { arePRRoutesEqual } from "../../anchor-event/services/event-scope";
import {
  normalizeRouteRejectReason,
  toAnchorEventRouteApplicationView,
} from "../services/route-application";

const anchorEventRepo = new AnchorEventRepository();
const routeApplicationRepo = new AnchorEventRouteApplicationRepository();

const buildApplicationRouteEntryId = (
  applicationId: number,
  routePool: AnchorEventRoutePool,
): string => {
  const baseId = `application-${applicationId}`;
  const existingIds = new Set(routePool.map((entry) => entry.id));
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
};

export async function acceptAdminAnchorEventRouteApplication(input: {
  applicationId: number;
  reviewedByUserId: UserId | null;
  route?: PRRoute;
}) {
  const application = await routeApplicationRepo.findById(input.applicationId);
  if (!application) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
    });
  }

  if (application.status !== "PENDING") {
    return throwHttpProblem({
      status: 409,
      detail: "Route application has already been reviewed",
    });
  }

  const event = await anchorEventRepo.findById(application.anchorEventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  if (normalizeLocationPool(event.locationPool).length > 0) {
    return throwHttpProblem({
      status: 409,
      detail: "Anchor event uses a location pool",
    });
  }

  const routePool = normalizeAnchorEventRoutePool(event.routePool);
  const acceptedRoute = input.route ?? application.route;
  const hasSameRoute = routePool.some((entry) =>
    arePRRoutesEqual(entry.route, acceptedRoute),
  );
  const nextRoutePool = hasSameRoute
    ? routePool
    : [
        ...routePool,
        {
          id: buildApplicationRouteEntryId(application.id, routePool),
          route: acceptedRoute,
        },
      ];

  await anchorEventRepo.update(event.id, {
    routePool: nextRoutePool,
  });

  const updated = await routeApplicationRepo.updateReviewState(application.id, {
    status: "ACCEPTED",
    reviewedByUserId: input.reviewedByUserId,
    route: input.route === undefined ? undefined : acceptedRoute,
  });
  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
    });
  }

  operationLogService.log({
    actorId: input.reviewedByUserId,
    action: "anchor_event.route_application.accept",
    aggregateType: "anchor_event_route_application",
    aggregateId: String(updated.id),
    detail: {
      anchorEventId: event.id,
      routePoolEntryCreated: !hasSameRoute,
      routeEdited: input.route !== undefined,
      status: updated.status,
    },
  });

  return toAnchorEventRouteApplicationView(updated);
}

export async function rejectAdminAnchorEventRouteApplication(input: {
  applicationId: number;
  reviewedByUserId: UserId | null;
  rejectReason: string | null;
}) {
  const application = await routeApplicationRepo.findById(input.applicationId);
  if (!application) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
    });
  }

  if (application.status !== "PENDING") {
    return throwHttpProblem({
      status: 409,
      detail: "Route application has already been reviewed",
    });
  }

  const updated = await routeApplicationRepo.updateReviewState(application.id, {
    status: "REJECTED",
    reviewedByUserId: input.reviewedByUserId,
    rejectReason: normalizeRouteRejectReason(input.rejectReason),
  });
  if (!updated) {
    return throwHttpProblem({
      status: 404,
      detail: "Route application not found",
    });
  }

  operationLogService.log({
    actorId: input.reviewedByUserId,
    action: "anchor_event.route_application.reject",
    aggregateType: "anchor_event_route_application",
    aggregateId: String(updated.id),
    detail: {
      anchorEventId: updated.anchorEventId,
      rejectReason: updated.rejectReason,
      status: updated.status,
    },
  });

  return toAnchorEventRouteApplicationView(updated);
}
