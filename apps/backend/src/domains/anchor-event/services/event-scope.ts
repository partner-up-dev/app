import {
  normalizeAnchorEventRoutePool,
  normalizeLocationPool,
  type AnchorEvent,
  type AnchorEventRoutePoolEntry,
} from "../../../entities/anchor-event";
import type { CoordinatePair, PRRoute } from "../../../entities/partner-request";
import { isPublishedPoi } from "../../../entities/poi";
import { findPoisByNames } from "../../poi";

export const isEventScopedLocation = (
  event: AnchorEvent,
  location: string | null,
): boolean => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  return normalizeLocationPool(event.locationPool).includes(normalized);
};

export const resolvePublicEventLocationPool = async (
  event: AnchorEvent,
): Promise<string[]> => {
  const locationPool = normalizeLocationPool(event.locationPool);
  const pois = await findPoisByNames(locationPool, {
    includeUnpublished: true,
  });
  const poiByName = new Map(pois.map((poi) => [poi.name, poi]));

  return locationPool.filter((location) => {
    const poi = poiByName.get(location);
    return !poi || isPublishedPoi(poi);
  });
};

export const isPublicEventScopedLocation = async (
  event: AnchorEvent,
  location: string | null,
): Promise<boolean> => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  const publicLocationPool = await resolvePublicEventLocationPool(event);
  return publicLocationPool.includes(normalized);
};

export const resolveEventRoutePool = (
  event: AnchorEvent,
): AnchorEventRoutePoolEntry[] => normalizeAnchorEventRoutePool(event.routePool);

export const findEventRoutePoolEntry = (
  event: AnchorEvent,
  routePoolEntryId: string | null | undefined,
): AnchorEventRoutePoolEntry | null => {
  const normalizedId = routePoolEntryId?.trim() ?? "";
  if (!normalizedId) {
    return null;
  }

  return (
    resolveEventRoutePool(event).find((entry) => entry.id === normalizedId) ??
    null
  );
};

const areCoordinatePairsEqual = (
  left: CoordinatePair | null,
  right: CoordinatePair | null,
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }

  return left[0] === right[0] && left[1] === right[1];
};

export const arePRRoutesEqual = (
  left: PRRoute | null | undefined,
  right: PRRoute | null | undefined,
): boolean => {
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((leftPoint, index) => {
    const rightPoint = right[index];
    return (
      rightPoint !== undefined &&
      leftPoint.name === rightPoint.name &&
      leftPoint.full_address === rightPoint.full_address &&
      areCoordinatePairsEqual(leftPoint.wgs84, rightPoint.wgs84) &&
      areCoordinatePairsEqual(leftPoint.bd09, rightPoint.bd09) &&
      areCoordinatePairsEqual(leftPoint.gcj02, rightPoint.gcj02)
    );
  });
};

export const findEventRoutePoolEntryByRoute = (
  event: AnchorEvent,
  route: PRRoute | null | undefined,
): AnchorEventRoutePoolEntry | null =>
  resolveEventRoutePool(event).find((entry) => arePRRoutesEqual(entry.route, route)) ??
  null;
