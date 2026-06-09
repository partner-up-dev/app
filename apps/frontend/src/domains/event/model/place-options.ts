import type { PRRoute } from "@partner-up-dev/backend";
import type { MapCoordinate } from "@/shared/map/types";
import { buildRouteEndpointLabel, type Route } from "@/domains/route/model/route";

export type AnchorEventPlaceOptionDisabledReason =
  | "NONE"
  | "MAX_REACHED"
  | "TIME_UNAVAILABLE";

export type AnchorEventLocationPlaceOption = {
  kind: "location";
  id: string;
  locationId: string;
  label: string;
  gallery: string[];
  coordinate: MapCoordinate | null;
  availableStartKeys?: string[];
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

export type AnchorEventRoutePlaceOption = {
  kind: "route";
  id: string;
  routePoolEntryId: string;
  label: string;
  route: PRRoute;
  availableStartKeys?: string[];
  remainingQuota: null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

export type AnchorEventPlaceOption =
  | AnchorEventLocationPlaceOption
  | AnchorEventRoutePlaceOption;

export type AnchorEventPlaceSelectorView = {
  kind: "location" | "route" | "none";
  labelKey: string;
  placeholderKey: string;
  ariaLabelKey: string;
  applyActionKey: string | null;
  options: readonly AnchorEventPlaceOption[];
};

export type AnchorEventSelectedPlace =
  | {
      kind: "location";
      locationId: string;
    }
  | {
      kind: "route";
      route: PRRoute;
    };

export type AnchorEventPoiGeometry = {
  name: string;
  gallery?: string[] | null;
  gcj02?: [number, number] | null;
  wgs84?: [number, number] | null;
  bd09?: [number, number] | null;
};

type FormModeLocationInput = {
  id: string;
  gallery: string[];
  availableStartKeys: string[];
};

type FormModeRouteInput = {
  id: string;
  route: PRRoute;
  availableStartKeys: string[];
};

type CreateLocationOptionInput = {
  locationId: string;
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

type CreateRouteOptionInput = {
  routePoolEntryId: string;
  route: PRRoute;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

type CreatePlaceOptionsInput = {
  placeSelector?: AnchorEventPlaceSelectorView | null;
  locationOptions: readonly CreateLocationOptionInput[];
  routeOptions: readonly CreateRouteOptionInput[];
};

const LOCATION_OPTION_PREFIX = "location:";
const ROUTE_OPTION_PREFIX = "route:";

export const buildLocationPlaceOptionId = (locationId: string): string =>
  `${LOCATION_OPTION_PREFIX}${locationId}`;

export const buildRoutePlaceOptionId = (routePoolEntryId: string): string =>
  `${ROUTE_OPTION_PREFIX}${routePoolEntryId}`;

const isFiniteCoordinatePair = (
  coordinate: [number, number] | null | undefined,
): coordinate is [number, number] =>
  Array.isArray(coordinate) &&
  coordinate.length === 2 &&
  Number.isFinite(coordinate[0]) &&
  Number.isFinite(coordinate[1]);

export const resolvePoiMapCoordinate = (
  poi: AnchorEventPoiGeometry | null | undefined,
): MapCoordinate | null => {
  const coordinate = poi?.gcj02 ?? poi?.wgs84 ?? poi?.bd09 ?? null;
  if (!isFiniteCoordinatePair(coordinate)) {
    return null;
  }

  return {
    lat: coordinate[0],
    lng: coordinate[1],
  };
};

const normalizeRouteLabel = (route: Route): string =>
  buildRouteEndpointLabel(route) ?? route[0]?.name?.trim() ?? "";

const cloneCoordinatePair = (
  coordinate: [number, number] | null,
): [number, number] | null =>
  coordinate === null ? null : [coordinate[0], coordinate[1]];

export const cloneAnchorEventRoute = (route: PRRoute): PRRoute =>
  route.map((point) => ({
    ...point,
    wgs84: cloneCoordinatePair(point.wgs84),
    bd09: cloneCoordinatePair(point.bd09),
    gcj02: cloneCoordinatePair(point.gcj02),
  }));

export const reverseAnchorEventRoute = (route: PRRoute): PRRoute =>
  cloneAnchorEventRoute(route).reverse();

const areCoordinatePairsEqual = (
  left: [number, number] | null,
  right: [number, number] | null,
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }

  return left[0] === right[0] && left[1] === right[1];
};

export const areAnchorEventRoutesEqual = (
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

const clonePlaceSelectorOptions = (
  placeSelector: AnchorEventPlaceSelectorView | null | undefined,
): AnchorEventPlaceOption[] | null => {
  if (!placeSelector) {
    return null;
  }

  return placeSelector.options.map((option) => {
    if (option.kind === "location") {
      return {
        ...option,
        gallery: [...option.gallery],
        availableStartKeys: option.availableStartKeys
          ? [...option.availableStartKeys]
          : undefined,
      };
    }

    return {
      ...option,
      route: [...option.route],
      availableStartKeys: option.availableStartKeys
        ? [...option.availableStartKeys]
        : undefined,
    };
  });
};

export const resolveAnchorEventPlaceSelectorKey = (
  placeSelector: AnchorEventPlaceSelectorView | null | undefined,
  key: "labelKey" | "placeholderKey" | "ariaLabelKey" | "applyActionKey",
  fallback: string | null,
): string | null => placeSelector?.[key] ?? fallback;

export const toAnchorEventSelectedPlace = (
  option: AnchorEventPlaceOption | null | undefined,
): AnchorEventSelectedPlace | null => {
  if (!option || option.disabled) {
    return null;
  }

  if (option.kind === "location") {
    return {
      kind: "location",
      locationId: option.locationId,
    };
  }

  return {
    kind: "route",
    route: cloneAnchorEventRoute(option.route),
  };
};

export const findAnchorEventPlaceOption = (
  options: readonly AnchorEventPlaceOption[],
  id: string | null | undefined,
): AnchorEventPlaceOption | null =>
  options.find((option) => option.id === id) ?? null;

export const findAnchorEventPlaceOptionBySelectedPlace = (
  options: readonly AnchorEventPlaceOption[],
  selectedPlace: AnchorEventSelectedPlace | null | undefined,
): AnchorEventPlaceOption | null => {
  if (!selectedPlace) {
    return null;
  }

  if (selectedPlace.kind === "location") {
    return (
      options.find(
        (option): option is AnchorEventLocationPlaceOption =>
          option.kind === "location" &&
          option.locationId === selectedPlace.locationId,
      ) ?? null
    );
  }

  return (
    options.find(
      (option): option is AnchorEventRoutePlaceOption =>
        option.kind === "route" &&
        (areAnchorEventRoutesEqual(option.route, selectedPlace.route) ||
          areAnchorEventRoutesEqual(
            reverseAnchorEventRoute(option.route),
            selectedPlace.route,
          )),
    ) ?? null
  );
};

export const getFirstEnabledPlaceOption = (
  options: readonly AnchorEventPlaceOption[],
): AnchorEventPlaceOption | null =>
  options.find((option) => !option.disabled) ?? null;

const buildFormModeLocationPlaceOptions = (
  locations: readonly FormModeLocationInput[],
): AnchorEventLocationPlaceOption[] =>
  locations.map((location): AnchorEventLocationPlaceOption => ({
    kind: "location",
    id: buildLocationPlaceOptionId(location.id),
    locationId: location.id,
    label: location.id,
    gallery: [...location.gallery],
    coordinate: null,
    availableStartKeys: [...location.availableStartKeys],
    remainingQuota: null,
    disabled: false,
    disabledReason: "NONE",
  }));

const buildFormModeRoutePlaceOptions = (
  routes: readonly FormModeRouteInput[],
): AnchorEventRoutePlaceOption[] =>
  routes.map((route): AnchorEventRoutePlaceOption => ({
    kind: "route",
    id: buildRoutePlaceOptionId(route.id),
    routePoolEntryId: route.id,
    label: normalizeRouteLabel(route.route) || route.id,
    route: route.route,
    availableStartKeys: [...route.availableStartKeys],
    remainingQuota: null,
    disabled: false,
    disabledReason: "NONE",
  }));

export const buildFormModePlaceOptions = ({
  placeSelector,
  locations,
  routes,
}: {
  placeSelector?: AnchorEventPlaceSelectorView | null;
  locations: readonly FormModeLocationInput[];
  routes: readonly FormModeRouteInput[];
}): AnchorEventPlaceOption[] => {
  const placeSelectorOptions = clonePlaceSelectorOptions(placeSelector);
  if (placeSelectorOptions !== null) {
    return placeSelectorOptions;
  }

  return routes.length > 0
    ? buildFormModeRoutePlaceOptions(routes)
    : buildFormModeLocationPlaceOptions(locations);
};

export const getExclusiveCreateTimeWindowLocationOptions = ({
  placeSelector,
  locationOptions,
  routeOptions,
}: CreatePlaceOptionsInput): readonly CreateLocationOptionInput[] => {
  if (placeSelector?.kind === "route") {
    return [];
  }

  if (placeSelector?.kind === "location") {
    return placeSelector.options
      .filter((option): option is AnchorEventLocationPlaceOption => {
        return option.kind === "location";
      })
      .map((option) => ({
        locationId: option.locationId,
        remainingQuota: option.remainingQuota,
        disabled: option.disabled,
        disabledReason: option.disabledReason,
      }));
  }

  return routeOptions.length > 0 ? [] : locationOptions;
};

export const hasEnabledCreateTimeWindowPlaceOption = ({
  placeSelector,
  locationOptions,
  routeOptions,
}: CreatePlaceOptionsInput): boolean => {
  if (placeSelector) {
    return placeSelector.options.some((option) => !option.disabled);
  }

  const activeOptions = routeOptions.length > 0 ? routeOptions : locationOptions;
  return activeOptions.some((option) => !option.disabled);
};

export const buildCreateTimeWindowPlaceOptions = ({
  placeSelector,
  locationOptions,
  routeOptions,
  poiByName,
}: {
  placeSelector?: AnchorEventPlaceSelectorView | null;
  locationOptions: readonly CreateLocationOptionInput[];
  routeOptions: readonly CreateRouteOptionInput[];
  poiByName: ReadonlyMap<string, AnchorEventPoiGeometry>;
}): AnchorEventPlaceOption[] => {
  const placeSelectorOptions = clonePlaceSelectorOptions(placeSelector);
  if (placeSelectorOptions !== null) {
    return placeSelectorOptions;
  }

  if (routeOptions.length > 0) {
    return routeOptions.map((option): AnchorEventRoutePlaceOption => ({
      kind: "route",
      id: buildRoutePlaceOptionId(option.routePoolEntryId),
      routePoolEntryId: option.routePoolEntryId,
      label: normalizeRouteLabel(option.route) || option.routePoolEntryId,
      route: option.route,
      remainingQuota: null,
      disabled: option.disabled,
      disabledReason: option.disabledReason,
    }));
  }

  return locationOptions.map((option): AnchorEventLocationPlaceOption => {
    const poi = poiByName.get(option.locationId) ?? null;
    return {
      kind: "location",
      id: buildLocationPlaceOptionId(option.locationId),
      locationId: option.locationId,
      label: option.locationId,
      gallery: [...(poi?.gallery ?? [])],
      coordinate: resolvePoiMapCoordinate(poi),
      remainingQuota: option.remainingQuota,
      disabled: option.disabled,
      disabledReason: option.disabledReason,
    };
  });
};
