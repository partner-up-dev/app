import type { CoordinatePair, PRRoute } from "../../../entities/partner-request";
import type {
  PRTypeRouteApplication,
  PRTypeRouteApplicationStatus,
} from "../../../entities/pr-type-route-application";

export type PRTypeRouteApplicationView = {
  id: number;
  type: string;
  route: PRRoute;
  status: PRTypeRouteApplicationStatus;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const copyCoordinate = (coordinate: CoordinatePair | null): CoordinatePair | null =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

const copyRoute = (route: PRRoute): PRRoute =>
  route.map((point) => ({
    name: point.name,
    full_address: point.full_address,
    wgs84: copyCoordinate(point.wgs84),
    bd09: copyCoordinate(point.bd09),
    gcj02: copyCoordinate(point.gcj02),
  }));

export const normalizePRTypeRouteRejectReason = (
  value: string | null | undefined,
): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const toPRTypeRouteApplicationView = (
  application: PRTypeRouteApplication,
): PRTypeRouteApplicationView => ({
  id: application.id,
  type: application.type,
  route: copyRoute(application.route),
  status: application.status,
  submittedByUserId: application.submittedByUserId,
  reviewedByUserId: application.reviewedByUserId,
  reviewedAt: application.reviewedAt?.toISOString() ?? null,
  rejectReason: application.rejectReason,
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString(),
});
