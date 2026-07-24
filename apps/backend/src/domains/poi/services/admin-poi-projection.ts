import type { Poi, PoiCoordinate } from "../../../entities/poi";
import type { AdminPoiSnapshot } from "../contracts";

const cloneCoordinate = (coordinate: PoiCoordinate | null): PoiCoordinate | null =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

export const toAdminPoiSnapshot = (poi: Poi): AdminPoiSnapshot => ({
  id: poi.id,
  name: poi.name,
  fullAddress: poi.fullAddress,
  status: poi.status,
  gallery: [...poi.gallery],
  gcj02: cloneCoordinate(poi.gcj02),
  wgs84: cloneCoordinate(poi.wgs84),
  bd09: cloneCoordinate(poi.bd09),
  perTimeWindowCap: poi.perTimeWindowCap,
  availabilityRules: structuredClone(poi.availabilityRules),
  meetingPoint: poi.meetingPoint === null ? null : { ...poi.meetingPoint },
  submittedByUserId: poi.submittedByUserId,
  reviewedByUserId: poi.reviewedByUserId,
  reviewedAt: poi.reviewedAt?.toISOString() ?? null,
  rejectReason: poi.rejectReason,
  createdAt: poi.createdAt.toISOString(),
  updatedAt: poi.updatedAt.toISOString(),
});
