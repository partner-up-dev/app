import { throwHttpProblem } from "../../../lib/problem-details";
import {
  normalizeAnchorEventRoutePool,
  normalizeLocationPool,
  type AnchorEventRoutePool,
  type LocationEntry,
} from "../../../entities/anchor-event";

export const ANCHOR_EVENT_PLACE_POOL_CONFLICT_CODE =
  "ANCHOR_EVENT_PLACE_POOL_CONFLICT";

export const assertAnchorEventPlacePoolValid = (input: {
  locationPool: LocationEntry[];
  routePool: AnchorEventRoutePool | null | undefined;
}): void => {
  const locationCount = normalizeLocationPool(input.locationPool).length;
  const routeCount = normalizeAnchorEventRoutePool(input.routePool).length;
  if (locationCount === 0 || routeCount === 0) {
    return;
  }

  return throwHttpProblem({
    status: 400,
    detail: "Anchor event can use either location pool or route pool",
    code: ANCHOR_EVENT_PLACE_POOL_CONFLICT_CODE,
  });
};
