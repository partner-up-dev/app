import type { AnchorEventRoutePool } from "../../../entities/anchor-event";
import type { Poi, PoiCoordinate } from "../../../entities/poi";
import { buildPRRouteSummary } from "../../pr-core/services/pr-place-mode.service";

export type AnchorEventPlaceOptionDisabledReason =
  | "NONE"
  | "MAX_REACHED"
  | "TIME_UNAVAILABLE";

export type AnchorEventPlaceSelectorCopyKey =
  | "anchorEvent.placeSelector.locationLabel"
  | "anchorEvent.placeSelector.locationPlaceholder"
  | "anchorEvent.placeSelector.locationAriaLabel"
  | "anchorEvent.placeSelector.applyLocation"
  | "anchorEvent.placeSelector.routeLabel"
  | "anchorEvent.placeSelector.routePlaceholder"
  | "anchorEvent.placeSelector.routeAriaLabel"
  | "anchorEvent.placeSelector.applyRoute"
  | "anchorEvent.placeSelector.emptyPlaceholder";

type MapCoordinateView = {
  lat: number;
  lng: number;
};

export type AnchorEventLocationPlaceOptionView = {
  kind: "location";
  id: string;
  locationId: string;
  label: string;
  gallery: string[];
  coordinate: MapCoordinateView | null;
  availableStartKeys?: string[];
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

export type AnchorEventRoutePlaceOptionView = {
  kind: "route";
  id: string;
  routePoolEntryId: string;
  label: string;
  route: AnchorEventRoutePool[number]["route"];
  availableStartKeys?: string[];
  remainingQuota: null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
};

export type AnchorEventPlaceOptionView =
  | AnchorEventLocationPlaceOptionView
  | AnchorEventRoutePlaceOptionView;

export type AnchorEventPlaceSelectorView =
  | {
      kind: "location";
      labelKey: "anchorEvent.placeSelector.locationLabel";
      placeholderKey: "anchorEvent.placeSelector.locationPlaceholder";
      ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel";
      applyActionKey: "anchorEvent.placeSelector.applyLocation";
      options: AnchorEventLocationPlaceOptionView[];
    }
  | {
      kind: "route";
      labelKey: "anchorEvent.placeSelector.routeLabel";
      placeholderKey: "anchorEvent.placeSelector.routePlaceholder";
      ariaLabelKey: "anchorEvent.placeSelector.routeAriaLabel";
      applyActionKey: "anchorEvent.placeSelector.applyRoute";
      options: AnchorEventRoutePlaceOptionView[];
    }
  | {
      kind: "none";
      labelKey: "anchorEvent.placeSelector.locationLabel";
      placeholderKey: "anchorEvent.placeSelector.emptyPlaceholder";
      ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel";
      applyActionKey: null;
      options: [];
    };

const LOCATION_OPTION_PREFIX = "location:";
const ROUTE_OPTION_PREFIX = "route:";

export const buildAnchorEventLocationPlaceOptionId = (
  locationId: string,
): string => `${LOCATION_OPTION_PREFIX}${locationId}`;

export const buildAnchorEventRoutePlaceOptionId = (
  routePoolEntryId: string,
): string => `${ROUTE_OPTION_PREFIX}${routePoolEntryId}`;

const isFiniteCoordinatePair = (
  coordinate: PoiCoordinate | null | undefined,
): coordinate is PoiCoordinate =>
  Array.isArray(coordinate) &&
  coordinate.length === 2 &&
  Number.isFinite(coordinate[0]) &&
  Number.isFinite(coordinate[1]);

const resolvePoiMapCoordinate = (
  poi: Pick<Poi, "gcj02" | "wgs84" | "bd09"> | null | undefined,
): MapCoordinateView | null => {
  const coordinate = poi?.gcj02 ?? poi?.wgs84 ?? poi?.bd09 ?? null;
  if (!isFiniteCoordinatePair(coordinate)) {
    return null;
  }

  return {
    lat: coordinate[0],
    lng: coordinate[1],
  };
};

const resolveRouteLabel = (
  routePoolEntryId: string,
  route: AnchorEventRoutePool[number]["route"],
): string =>
  buildPRRouteSummary(route) ?? route[0]?.name?.trim() ?? routePoolEntryId;

export const toAnchorEventLocationPlaceOptionView = (input: {
  locationId: string;
  poi: Pick<Poi, "gallery" | "gcj02" | "wgs84" | "bd09"> | null | undefined;
  availableStartKeys?: string[];
  remainingQuota: number | null;
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
}): AnchorEventLocationPlaceOptionView => ({
  kind: "location",
  id: buildAnchorEventLocationPlaceOptionId(input.locationId),
  locationId: input.locationId,
  label: input.locationId,
  gallery: [...(input.poi?.gallery ?? [])],
  coordinate: resolvePoiMapCoordinate(input.poi),
  availableStartKeys: input.availableStartKeys
    ? [...input.availableStartKeys]
    : undefined,
  remainingQuota: input.remainingQuota,
  disabled: input.disabled,
  disabledReason: input.disabledReason,
});

export const toAnchorEventRoutePlaceOptionView = (input: {
  routePoolEntryId: string;
  route: AnchorEventRoutePool[number]["route"];
  availableStartKeys?: string[];
  disabled: boolean;
  disabledReason: AnchorEventPlaceOptionDisabledReason;
}): AnchorEventRoutePlaceOptionView => ({
  kind: "route",
  id: buildAnchorEventRoutePlaceOptionId(input.routePoolEntryId),
  routePoolEntryId: input.routePoolEntryId,
  label: resolveRouteLabel(input.routePoolEntryId, input.route),
  route: input.route,
  availableStartKeys: input.availableStartKeys
    ? [...input.availableStartKeys]
    : undefined,
  remainingQuota: null,
  disabled: input.disabled,
  disabledReason: input.disabledReason,
});

export const buildAnchorEventPlaceSelectorView = (input: {
  locationOptions: AnchorEventLocationPlaceOptionView[];
  routeOptions: AnchorEventRoutePlaceOptionView[];
}): AnchorEventPlaceSelectorView => {
  if (input.routeOptions.length > 0) {
    return {
      kind: "route",
      labelKey: "anchorEvent.placeSelector.routeLabel",
      placeholderKey: "anchorEvent.placeSelector.routePlaceholder",
      ariaLabelKey: "anchorEvent.placeSelector.routeAriaLabel",
      applyActionKey: "anchorEvent.placeSelector.applyRoute",
      options: input.routeOptions,
    };
  }

  if (input.locationOptions.length > 0) {
    return {
      kind: "location",
      labelKey: "anchorEvent.placeSelector.locationLabel",
      placeholderKey: "anchorEvent.placeSelector.locationPlaceholder",
      ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel",
      applyActionKey: "anchorEvent.placeSelector.applyLocation",
      options: input.locationOptions,
    };
  }

  return {
    kind: "none",
    labelKey: "anchorEvent.placeSelector.locationLabel",
    placeholderKey: "anchorEvent.placeSelector.emptyPlaceholder",
    ariaLabelKey: "anchorEvent.placeSelector.locationAriaLabel",
    applyActionKey: null,
    options: [],
  };
};
