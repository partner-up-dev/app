import type { RouteCoordinate } from "@/domains/route/model/route";

export type PickedLocation = {
  name: string;
  address: string | null;
  cityName: string | null;
  gcj02: RouteCoordinate;
};

export type TencentLocationPickerUrlInput = {
  key: string;
  referer: string;
  initialCoordinate?: RouteCoordinate | null;
  search?: boolean;
  mapDraggable?: boolean;
};

type TencentLocationPickerLatLng = {
  lat: unknown;
  lng: unknown;
};

type TencentLocationPickerPayload = {
  module?: unknown;
  latlng?: TencentLocationPickerLatLng;
  poiname?: unknown;
  poiaddress?: unknown;
  cityname?: unknown;
};

const LOCATION_PICKER_ORIGIN = "https://apis.map.qq.com";
const LOCATION_PICKER_PATH = "/tools/locpicker";

const normalizeNullableText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const clonePickedLocation = (
  location: PickedLocation | null | undefined,
): PickedLocation | null =>
  location
    ? {
        name: location.name,
        address: location.address,
        cityName: location.cityName,
        gcj02: [location.gcj02[0], location.gcj02[1]],
      }
    : null;

export const buildTencentLocationPickerUrl = ({
  key,
  referer,
  search = true,
  mapDraggable = true,
}: TencentLocationPickerUrlInput): string => {
  const url = new URL(LOCATION_PICKER_PATH, LOCATION_PICKER_ORIGIN);
  url.searchParams.set("type", "1");
  url.searchParams.set("search", search ? "1" : "0");
  url.searchParams.set("mapdraggable", mapDraggable ? "1" : "0");
  url.searchParams.set("key", key);
  url.searchParams.set("referer", referer);
  return url.toString();
};

export const mapTencentLocationPickerPayload = (
  payload: unknown,
): PickedLocation | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const maybePayload = payload as TencentLocationPickerPayload;
  if (maybePayload.module !== "locationPicker") {
    return null;
  }

  const latlng = maybePayload.latlng;
  if (!latlng || !isFiniteNumber(latlng.lat) || !isFiniteNumber(latlng.lng)) {
    return null;
  }

  const name = normalizeNullableText(maybePayload.poiname);
  if (!name) {
    return null;
  }

  return {
    name,
    address: normalizeNullableText(maybePayload.poiaddress),
    cityName: normalizeNullableText(maybePayload.cityname),
    gcj02: [latlng.lat, latlng.lng],
  };
};

export const serializePickedLocation = (location: PickedLocation): string =>
  JSON.stringify(location);

export const parsePickedLocation = (value: string): PickedLocation | null => {
  try {
    return mapPlainPickedLocation(JSON.parse(value));
  } catch {
    return null;
  }
};

export const mapPlainPickedLocation = (value: unknown): PickedLocation | null => {
  if (!isRecord(value)) {
    return null;
  }
  const gcj02 = value.gcj02;
  if (
    !Array.isArray(gcj02) ||
    gcj02.length !== 2 ||
    !isFiniteNumber(gcj02[0]) ||
    !isFiniteNumber(gcj02[1])
  ) {
    return null;
  }

  const name = normalizeNullableText(value.name);
  if (!name) {
    return null;
  }

  return {
    name,
    address: normalizeNullableText(value.address),
    cityName: normalizeNullableText(value.cityName),
    gcj02: [gcj02[0], gcj02[1]],
  };
};
