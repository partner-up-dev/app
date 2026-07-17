import { throwHttpProblem } from "../../../lib/problem-details";
import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { operationLogService } from "../../../infra/operation-log";
import { normalizePoiRejectReason, toPoiApplicationView } from "../services/poi-application";

const poiRepo = new PoiRepository();

export async function publishAdminPoiApplication(input: {
  poiId: number;
  reviewedByUserId: UserId | null;
}) {
  const updated = await poiRepo.updateReviewState(input.poiId, {
    status: "PUBLISHED",
    reviewedByUserId: input.reviewedByUserId,
  });
  if (!updated) {
    return throwHttpProblem({ status: 404, detail: "POI not found" });
  }

  operationLogService.log({
    actorId: input.reviewedByUserId,
    action: "poi.application.publish",
    aggregateType: "poi",
    aggregateId: String(updated.id),
    detail: {
      status: updated.status,
    },
  });

  return toPoiApplicationView(updated);
}

export async function rejectAdminPoiApplication(input: {
  poiId: number;
  reviewedByUserId: UserId | null;
  rejectReason: string | null;
}) {
  const updated = await poiRepo.updateReviewState(input.poiId, {
    status: "REJECTED",
    reviewedByUserId: input.reviewedByUserId,
    rejectReason: normalizePoiRejectReason(input.rejectReason),
  });
  if (!updated) {
    return throwHttpProblem({ status: 404, detail: "POI not found" });
  }

  operationLogService.log({
    actorId: input.reviewedByUserId,
    action: "poi.application.reject",
    aggregateType: "poi",
    aggregateId: String(updated.id),
    detail: {
      status: updated.status,
      rejectReason: updated.rejectReason,
    },
  });

  return toPoiApplicationView(updated);
}
