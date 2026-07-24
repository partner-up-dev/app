import { throwHttpProblem } from "../../../lib/problem-details";
import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { AdminPoiSnapshot } from "../contracts";
import { toAdminPoiSnapshot } from "../services/admin-poi-projection";
import { normalizePoiRejectReason } from "../services/poi-application";

const poiRepo = new PoiRepository();

export async function publishAdminPoiApplication(input: {
  poiId: number;
  reviewedByUserId: UserId | null;
}): Promise<AdminPoiSnapshot> {
  const updated = await poiRepo.updateReviewState(input.poiId, {
    status: "PUBLISHED",
    reviewedByUserId: input.reviewedByUserId,
  });
  if (!updated) {
    return throwHttpProblem({ status: 404, detail: "POI not found" });
  }

  return toAdminPoiSnapshot(updated);
}

export async function rejectAdminPoiApplication(input: {
  poiId: number;
  reviewedByUserId: UserId | null;
  rejectReason: string | null;
}): Promise<AdminPoiSnapshot> {
  const updated = await poiRepo.updateReviewState(input.poiId, {
    status: "REJECTED",
    reviewedByUserId: input.reviewedByUserId,
    rejectReason: normalizePoiRejectReason(input.rejectReason),
  });
  if (!updated) {
    return throwHttpProblem({ status: 404, detail: "POI not found" });
  }

  return toAdminPoiSnapshot(updated);
}
