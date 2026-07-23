import { throwHttpProblem } from "../../../lib/problem-details";
import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
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

  return toPoiApplicationView(updated);
}
