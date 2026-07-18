import type { PRRoute, PRRoutePoint } from "@partner-up-dev/backend/contracts";
import type { Route, RoutePoint, RouteValidationIssue } from "@/domains/route/model/route";
import {
  cloneRoute,
  createEmptyRouteDraft,
  getRouteValidationIssue,
  normalizeRouteForSubmit,
} from "@/domains/route/model/route";

export type PRPlaceMode = "location" | "route";
export type PRRouteValidationIssue = RouteValidationIssue;

const toPRCoordinate = (coordinate: RoutePoint["gcj02"]): PRRoutePoint["gcj02"] =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

export const toPRRoutePoint = (point: RoutePoint): PRRoutePoint => ({
  wgs84: toPRCoordinate(point.wgs84),
  bd09: toPRCoordinate(point.bd09),
  gcj02: toPRCoordinate(point.gcj02),
  name: point.name,
  full_address: point.full_address,
});

export const toPRRoute = (route: Route | null | undefined): PRRoute | null =>
  route ? route.map(toPRRoutePoint) : null;

export const fromPRRoute = (route: PRRoute | null | undefined): Route | null => cloneRoute(route);

export const createEmptyPRRouteDraft = (): PRRoute => createEmptyRouteDraft().map(toPRRoutePoint);

export const clonePRRoute = (route: PRRoute | null | undefined): PRRoute | null =>
  toPRRoute(cloneRoute(route));

export const resolvePRPlaceMode = ({
  route,
}: {
  location: string | null;
  route: PRRoute | null | undefined;
}): PRPlaceMode => (route && route.length >= 2 ? "route" : "location");

export const getPRRouteValidationIssue = (
  route: PRRoute | null | undefined,
): PRRouteValidationIssue | null => getRouteValidationIssue(route);

export const normalizePRRouteForSubmit = (route: PRRoute | null | undefined): PRRoute | null =>
  toPRRoute(normalizeRouteForSubmit(route));
