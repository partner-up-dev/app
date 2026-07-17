import type { PRRoute } from "@partner-up-dev/backend";
import type { PRDiscoveryPlaceSelection } from "@/domains/pr/model/pr-discovery-form";
import { buildRouteEndpointLabel, type Route } from "@/domains/route/model/route";
import type { MapCoordinate } from "@/shared/map/types";

export type { PRDiscoveryPlaceSelection } from "@/domains/pr/model/pr-discovery-form";

export type PRDiscoveryPlaceOptionDisabledReason = "NONE" | "MAX_REACHED" | "TIME_UNAVAILABLE";
export type PRDiscoveryLocationPlaceOption = {
  kind: "location";
  id: string;
  locationId: string;
  label: string;
  gallery: string[];
  coordinate: MapCoordinate | null;
  availableStartKeys?: string[];
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: PRDiscoveryPlaceOptionDisabledReason;
};
export type PRDiscoveryRoutePlaceOption = {
  kind: "route";
  id: string;
  routePoolEntryId: string;
  label: string;
  route: PRRoute;
  availableStartKeys?: string[];
  remainingQuota: null;
  disabled: boolean;
  disabledReason: PRDiscoveryPlaceOptionDisabledReason;
};
export type PRDiscoveryPlaceOption = PRDiscoveryLocationPlaceOption | PRDiscoveryRoutePlaceOption;
export type PRDiscoveryPlaceSelectorView = {
  kind: "location" | "route" | "none";
  labelKey: string;
  placeholderKey: string;
  ariaLabelKey: string;
  applyActionKey: string | null;
  options: readonly PRDiscoveryPlaceOption[];
};
export type PRDiscoveryPoiGeometry = {
  name: string;
  gallery?: string[] | null;
  gcj02?: [number, number] | null;
  wgs84?: [number, number] | null;
  bd09?: [number, number] | null;
};

const routeLabel = (route: Route): string =>
  buildRouteEndpointLabel(route) ?? route[0]?.name?.trim() ?? "";
const coordinate = (value: [number, number] | null | undefined): value is [number, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);
export const resolvePRDiscoveryPoiCoordinate = (
  poi: PRDiscoveryPoiGeometry | null | undefined,
): MapCoordinate | null => {
  const value = poi?.gcj02 ?? poi?.wgs84 ?? poi?.bd09 ?? null;
  return coordinate(value) ? { lat: value[0], lng: value[1] } : null;
};
export const buildPRDiscoveryLocationOptionId = (id: string): string => `location:${id}`;
export const buildPRDiscoveryRouteOptionId = (id: string): string => `route:${id}`;
export const clonePRDiscoveryRoute = (route: PRRoute): PRRoute =>
  route.map((point) => ({
    ...point,
    wgs84: point.wgs84 ? ([...point.wgs84] as [number, number]) : null,
    bd09: point.bd09 ? ([...point.bd09] as [number, number]) : null,
    gcj02: point.gcj02 ? ([...point.gcj02] as [number, number]) : null,
  }));
export const reversePRDiscoveryRoute = (route: PRRoute): PRRoute =>
  clonePRDiscoveryRoute(route).reverse();
const eqCoordinates = (left: [number, number] | null, right: [number, number] | null): boolean =>
  left === right || Boolean(left && right && left[0] === right[0] && left[1] === right[1]);
export const arePRDiscoveryRoutesEqual = (
  left: PRRoute | null | undefined,
  right: PRRoute | null | undefined,
): boolean =>
  Boolean(
    left &&
    right &&
    left.length === right.length &&
    left.every((point, index) => {
      const other = right[index];
      return Boolean(
        other &&
        point.name === other.name &&
        point.full_address === other.full_address &&
        eqCoordinates(point.wgs84, other.wgs84) &&
        eqCoordinates(point.bd09, other.bd09) &&
        eqCoordinates(point.gcj02, other.gcj02),
      );
    }),
  );
export const toPRDiscoverySelectedPlace = (
  option: PRDiscoveryPlaceOption | null | undefined,
): PRDiscoveryPlaceSelection | null =>
  option && !option.disabled
    ? option.kind === "location"
      ? { kind: "location", location: option.locationId }
      : { kind: "route", route: clonePRDiscoveryRoute(option.route) }
    : null;
export const findPRDiscoveryPlaceOptionById = (
  options: readonly PRDiscoveryPlaceOption[],
  id: string | null | undefined,
): PRDiscoveryPlaceOption | null => options.find((option) => option.id === id) ?? null;
export const findPRDiscoveryPlaceOption = (
  options: readonly PRDiscoveryPlaceOption[],
  selected: PRDiscoveryPlaceSelection | null | undefined,
): PRDiscoveryPlaceOption | null => {
  if (!selected) return null;
  if (selected.kind === "location")
    return (
      options.find(
        (option): option is PRDiscoveryLocationPlaceOption =>
          option.kind === "location" && option.locationId === selected.location,
      ) ?? null
    );
  return (
    options.find(
      (option): option is PRDiscoveryRoutePlaceOption =>
        option.kind === "route" &&
        (arePRDiscoveryRoutesEqual(option.route, selected.route) ||
          arePRDiscoveryRoutesEqual(reversePRDiscoveryRoute(option.route), selected.route)),
    ) ?? null
  );
};
export const getFirstEnabledPRDiscoveryPlaceOption = (
  options: readonly PRDiscoveryPlaceOption[],
): PRDiscoveryPlaceOption | null => options.find((option) => !option.disabled) ?? null;

export const buildPRDiscoveryPlaceOptions = (input: {
  placeSelector?: PRDiscoveryPlaceSelectorView | null;
  locations: readonly (Omit<PRDiscoveryLocationPlaceOption, "id"> & { id: string })[];
  routes: readonly (Omit<PRDiscoveryRoutePlaceOption, "id"> & { id: string })[];
}): PRDiscoveryPlaceOption[] => {
  if (input.placeSelector)
    return input.placeSelector.options.map((option) =>
      option.kind === "location"
        ? {
            ...option,
            gallery: [...option.gallery],
            availableStartKeys: option.availableStartKeys
              ? [...option.availableStartKeys]
              : undefined,
          }
        : {
            ...option,
            route: clonePRDiscoveryRoute(option.route),
            availableStartKeys: option.availableStartKeys
              ? [...option.availableStartKeys]
              : undefined,
          },
    );
  if (input.routes.length)
    return input.routes.map((option) => ({
      ...option,
      kind: "route" as const,
      id: buildPRDiscoveryRouteOptionId(option.id),
      routePoolEntryId: option.routePoolEntryId ?? option.id,
      label: option.label || routeLabel(option.route as Route) || option.id,
      route: clonePRDiscoveryRoute(option.route),
      availableStartKeys: [...(option.availableStartKeys ?? [])],
    }));
  return input.locations.map((option) => ({
    ...option,
    kind: "location" as const,
    id: buildPRDiscoveryLocationOptionId(option.id),
    locationId: option.locationId ?? option.id,
    label: option.label || option.id,
    gallery: [...(option.gallery ?? [])],
    availableStartKeys: [...(option.availableStartKeys ?? [])],
  }));
};
