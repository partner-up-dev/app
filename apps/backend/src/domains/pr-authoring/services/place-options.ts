import type { PRRoute } from "../../../entities/partner-request";
import type { Poi, PoiCoordinate } from "../../../entities/poi";
import type {
  PRAuthoringLocationOption,
  PRAuthoringMapCoordinate,
  PRAuthoringPlaceDisabledReason,
  PRAuthoringRouteOption,
} from "../contracts";

const isFiniteCoordinate = (value: PoiCoordinate | null | undefined): value is PoiCoordinate =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

const resolveMapCoordinate = (
  poi: Pick<Poi, "gcj02" | "wgs84" | "bd09"> | null,
): PRAuthoringMapCoordinate | null => {
  const coordinate = poi?.gcj02 ?? poi?.wgs84 ?? poi?.bd09 ?? null;
  return isFiniteCoordinate(coordinate) ? { lat: coordinate[0], lng: coordinate[1] } : null;
};

const normalizeRoutePointText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

const resolveRouteLabel = (id: string, route: PRRoute): string => {
  const first = normalizeRoutePointText(route[0]?.name);
  const last = normalizeRoutePointText(route[route.length - 1]?.name);
  if (first && last) return `${first}~${last}`;
  return first || id;
};

export const buildPRAuthoringLocationOptions = (input: {
  locations: readonly string[];
  pois: readonly Poi[];
  availableStartKeysByLocation: ReadonlyMap<string, readonly string[]>;
  availabilityByLocation?: ReadonlyMap<
    string,
    {
      remainingQuota: number | null;
      disabled: boolean;
      disabledReason: PRAuthoringPlaceDisabledReason;
    }
  >;
}): PRAuthoringLocationOption[] => {
  const poiByName = new Map(input.pois.map((poi) => [poi.name, poi]));
  return input.locations.map((location) => {
    const poi = poiByName.get(location);
    const availability = input.availabilityByLocation?.get(location);
    return {
      kind: "location" as const,
      id: location,
      locationId: location,
      label: location,
      fullAddress: poi?.fullAddress?.trim() || null,
      gallery: [...(poi?.gallery ?? [])],
      coordinate: resolveMapCoordinate(poi ?? null),
      availableStartKeys: [...(input.availableStartKeysByLocation.get(location) ?? [])],
      remainingQuota: availability?.remainingQuota ?? null,
      disabled: availability?.disabled ?? false,
      disabledReason: availability?.disabledReason ?? "NONE",
    };
  });
};

export const buildPRAuthoringRouteOptions = (input: {
  routes: readonly { id: string; route: PRRoute }[];
  availableStartKeys: readonly string[];
}): PRAuthoringRouteOption[] =>
  input.routes.map((entry) => ({
    kind: "route",
    id: entry.id,
    routePoolEntryId: entry.id,
    label: resolveRouteLabel(entry.id, entry.route),
    route: entry.route,
    availableStartKeys: [...input.availableStartKeys],
    remainingQuota: null,
    disabled: false,
    disabledReason: "NONE",
  }));
