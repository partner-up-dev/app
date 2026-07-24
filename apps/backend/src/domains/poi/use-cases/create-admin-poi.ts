import { throwHttpProblem } from "../../../lib/problem-details";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { AdminPoiSnapshot, AdminPoiWriteInput } from "../contracts";
import { toAdminPoiSnapshot } from "../services/admin-poi-projection";

const poiRepo = new PoiRepository();

export const createAdminPoi = async (input: AdminPoiWriteInput): Promise<AdminPoiSnapshot> => {
  const poi = await poiRepo.createByName(input.name, {
    fullAddress: input.fullAddress,
    gallery: input.gallery,
    gcj02: input.gcj02,
    wgs84: input.wgs84,
    bd09: input.bd09,
    perTimeWindowCap: input.perTimeWindowCap,
    availabilityRules: input.availabilityRules ?? [],
    meetingPoint: input.meetingPoint ?? null,
  });
  if (!poi) {
    return throwHttpProblem({ status: 409, detail: "POI already exists" });
  }

  return toAdminPoiSnapshot(poi);
};
