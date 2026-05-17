import type {
  AnchorEventRouteApplication,
  AnchorEventRouteApplicationStatus,
} from "../../../entities/anchor-event-route-application";
import type { CoordinatePair, PRRoute } from "../../../entities/partner-request";

export type AnchorEventRouteApplicationView = {
  id: number;
  anchorEventId: number;
  route: PRRoute;
  status: AnchorEventRouteApplicationStatus;
  submittedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
};

const copyCoordinate = (
  coordinate: CoordinatePair | null,
): CoordinatePair | null =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

const copyRoute = (route: PRRoute): PRRoute =>
  route.map((point) => ({
    name: point.name,
    full_address: point.full_address,
    wgs84: copyCoordinate(point.wgs84),
    bd09: copyCoordinate(point.bd09),
    gcj02: copyCoordinate(point.gcj02),
  }));

export const normalizeRouteRejectReason = (
  value: string | null | undefined,
): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

export const toAnchorEventRouteApplicationView = (
  application: AnchorEventRouteApplication,
): AnchorEventRouteApplicationView => ({
  id: application.id,
  anchorEventId: application.anchorEventId,
  route: copyRoute(application.route),
  status: application.status,
  submittedByUserId: application.submittedByUserId,
  reviewedByUserId: application.reviewedByUserId,
  reviewedAt: application.reviewedAt?.toISOString() ?? null,
  rejectReason: application.rejectReason,
  createdAt: application.createdAt.toISOString(),
  updatedAt: application.updatedAt.toISOString(),
});
