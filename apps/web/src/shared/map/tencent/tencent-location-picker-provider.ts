import type { MapCoordinate } from "@/shared/map/types";
import { loadTencentLBSSdk } from "./tencent-lbs-loader";
import type {
  TencentLatLng,
  TencentMapEvent,
  TencentMapListener,
  TencentMapSdk,
  TencentMultiMarker,
  TencentPointGeometry,
} from "./types";

export type TencentLocationSearchCandidate = {
  id: string;
  name: string;
  address: string | null;
  cityName: string | null;
  coordinate: MapCoordinate;
};

export type TencentReverseGeocodeResult = {
  name: string;
  address: string | null;
  cityName: string | null;
  coordinate: MapCoordinate;
};

export type TencentLocationPickerProviderInput = {
  container: HTMLElement;
  apiKey: string;
  initialCoordinate?: MapCoordinate | null;
  onMapPick?: (coordinate: MapCoordinate) => void;
};

export type TencentLocationPickerProvider = {
  search(keyword: string): Promise<TencentLocationSearchCandidate[]>;
  reverseGeocode(coordinate: MapCoordinate): Promise<TencentReverseGeocodeResult>;
  setSelectedCoordinate(coordinate: MapCoordinate | null): void;
  focusCoordinate(coordinate: MapCoordinate, zoom?: number): void;
  getCenter(): MapCoordinate | null;
  destroy(): void;
};

const DEFAULT_CENTER: MapCoordinate = {
  lat: 31.2304,
  lng: 121.4737,
};
const DEFAULT_ZOOM = 14;
const PICKED_ZOOM = 16;
const SELECTED_MARKER_ID = "selected-location";
const SELECTED_MARKER_STYLE_ID = "selected";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeNullableText = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const readRecord = (
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null => {
  const value = record[key];
  return isRecord(value) ? value : null;
};

const readNullableText = (
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null => {
  for (const key of keys) {
    const value = normalizeNullableText(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
};

const readFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const toMapCoordinate = (value: unknown): MapCoordinate | null => {
  if (!value) {
    return null;
  }

  if (isRecord(value) && typeof value.getLat === "function" && typeof value.getLng === "function") {
    const lat = readFiniteNumber(value.getLat());
    const lng = readFiniteNumber(value.getLng());
    return lat !== null && lng !== null ? { lat, lng } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const lat = readFiniteNumber(value.lat);
  const lng = readFiniteNumber(value.lng);
  return lat !== null && lng !== null ? { lat, lng } : null;
};

const toTencentLatLng = (sdk: TencentMapSdk, coordinate: MapCoordinate): TencentLatLng =>
  new sdk.LatLng(coordinate.lat, coordinate.lng);

const createMarkerSvg = (): string => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path fill="#96d945" d="M16 0C7.9 0 1.3 6.6 1.3 14.7 1.3 25.7 16 42 16 42s14.7-16.3 14.7-27.3C30.7 6.6 24.1 0 16 0Z"/><circle cx="16" cy="14.7" r="6" fill="white"/></svg>';
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const toSelectedGeometry = (
  sdk: TencentMapSdk,
  coordinate: MapCoordinate,
): TencentPointGeometry => ({
  id: SELECTED_MARKER_ID,
  styleId: SELECTED_MARKER_STYLE_ID,
  position: toTencentLatLng(sdk, coordinate),
  rank: 10_000,
  properties: {
    title: "Selected location",
  },
});

const collectPayloadItems = (payload: unknown): Record<string, unknown>[] => {
  if (!isRecord(payload)) {
    return [];
  }

  const result = readRecord(payload, "result");
  const candidates = [payload.data, result?.data, result?.pois, payload.pois];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  return [];
};

export const normalizeTencentSuggestionPayload = (
  payload: unknown,
): TencentLocationSearchCandidate[] =>
  collectPayloadItems(payload)
    .map((item, index): TencentLocationSearchCandidate | null => {
      const coordinate = toMapCoordinate(item.location);
      const name = readNullableText(item, ["title", "name"]);
      if (!coordinate || !name) {
        return null;
      }

      const explicitId = readNullableText(item, ["id", "uid"]);
      return {
        id: explicitId ?? `${name}-${coordinate.lat}-${coordinate.lng}-${index}`,
        name,
        address: readNullableText(item, ["address", "addr"]),
        cityName: readNullableText(item, ["city", "cityname"]),
        coordinate,
      };
    })
    .filter((item): item is TencentLocationSearchCandidate => item !== null);

export const normalizeTencentReverseGeocodePayload = (
  payload: unknown,
  coordinate: MapCoordinate,
): TencentReverseGeocodeResult => {
  const root = isRecord(payload) ? payload : {};
  const result = readRecord(root, "result") ?? root;
  const formattedAddresses = readRecord(result, "formatted_addresses");
  const addressComponent = readRecord(result, "address_component");
  const pois = Array.isArray(result.pois) ? result.pois.filter(isRecord) : [];
  const firstPoi = pois[0] ?? null;

  const address =
    readNullableText(result, ["address"]) ??
    (formattedAddresses ? readNullableText(formattedAddresses, ["recommend", "rough"]) : null);
  const name =
    (firstPoi ? readNullableText(firstPoi, ["title", "name"]) : null) ??
    (formattedAddresses ? readNullableText(formattedAddresses, ["recommend"]) : null) ??
    address ??
    "地图选点";

  return {
    name,
    address,
    cityName: addressComponent ? readNullableText(addressComponent, ["city"]) : null,
    coordinate,
  };
};

export const createTencentLocationPickerProvider = async ({
  container,
  apiKey,
  initialCoordinate,
  onMapPick,
}: TencentLocationPickerProviderInput): Promise<TencentLocationPickerProvider> => {
  const sdk = await loadTencentLBSSdk({
    key: apiKey,
    libraries: ["service"],
  });
  if (!sdk.service) {
    throw new Error("Tencent LBS service library is unavailable");
  }

  const center = initialCoordinate ?? DEFAULT_CENTER;
  const map = new sdk.Map(container, {
    center: toTencentLatLng(sdk, center),
    zoom: initialCoordinate ? PICKED_ZOOM : DEFAULT_ZOOM,
    mapStyleId: "style1",
    viewMode: "2D",
    showControl: false,
    draggable: true,
    scrollable: true,
    touchZoomable: true,
    doubleClickZoom: true,
  });

  const markerLayer: TencentMultiMarker = new sdk.MultiMarker({
    id: "partner-up-location-picker-marker-layer",
    map,
    zIndex: 30,
    styles: {
      [SELECTED_MARKER_STYLE_ID]: new sdk.MarkerStyle({
        width: 32,
        height: 42,
        anchor: { x: 16, y: 42 },
        src: createMarkerSvg(),
      }),
    },
    geometries: initialCoordinate ? [toSelectedGeometry(sdk, initialCoordinate)] : [],
    disableInteractive: true,
  });

  const suggestion = new sdk.service.Suggestion({ pageSize: 10 });
  const geocoder = new sdk.service.Geocoder();

  const readCenter = (): MapCoordinate | null => toMapCoordinate(map.getCenter());
  const readEventCoordinate = (event?: TencentMapEvent): MapCoordinate | null =>
    toMapCoordinate(event?.latLng ?? event?.latlng);
  const handleMapClick: TencentMapListener = (event) => {
    const coordinate = readEventCoordinate(event);
    if (!coordinate) {
      return;
    }
    onMapPick?.(coordinate);
  };
  map.on("click", handleMapClick);

  return {
    async search(keyword) {
      const normalizedKeyword = keyword.trim();
      if (normalizedKeyword.length === 0) {
        return [];
      }

      const currentCenter = readCenter();
      const payload = await suggestion.getSuggestions({
        keyword: normalizedKeyword,
        ...(currentCenter
          ? {
              location: toTencentLatLng(sdk, currentCenter),
            }
          : {}),
      });
      return normalizeTencentSuggestionPayload(payload);
    },
    async reverseGeocode(coordinate) {
      const payload = await geocoder.getAddress({
        location: toTencentLatLng(sdk, coordinate),
        getPoi: true,
      });
      return normalizeTencentReverseGeocodePayload(payload, coordinate);
    },
    setSelectedCoordinate(coordinate) {
      markerLayer.setGeometries(coordinate ? [toSelectedGeometry(sdk, coordinate)] : []);
    },
    focusCoordinate(coordinate, zoom = PICKED_ZOOM) {
      map.easeTo(
        {
          center: toTencentLatLng(sdk, coordinate),
          zoom,
        },
        { duration: 240 },
      );
    },
    getCenter() {
      return readCenter();
    },
    destroy() {
      map.off("click", handleMapClick);
      markerLayer.setMap(null);
      map.destroy();
    },
  };
};
