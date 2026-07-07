import type { MapCoordinate, MapFitPadding, MapMarker, MapPolyline } from "@/shared/map/types";

export type TencentLBSLibrary =
  | "visualization"
  | "tools"
  | "geometry"
  | "model"
  | "view"
  | "service";

export type TencentFitBoundsOptions = {
  padding?: MapFitPadding;
  minZoom?: number;
  maxZoom?: number;
  ease?: {
    duration?: number;
  };
};

export type TencentMapOptions = {
  center: TencentLatLng;
  zoom?: number;
  rotation?: number;
  minZoom?: number;
  maxZoom?: number;
  mapStyleId?: string;
  viewMode?: "2D" | "3D";
  showControl?: boolean;
  draggable?: boolean;
  scrollable?: boolean;
  touchZoomable?: boolean;
  doubleClickZoom?: boolean;
};

export type TencentLatLng = {
  getLat(): number;
  getLng(): number;
};

export type TencentLatLngConstructor = {
  new (lat: number, lng: number, height?: number): TencentLatLng;
};

export type TencentLatLngBounds = {
  extend(latLng: TencentLatLng): TencentLatLngBounds;
  isEmpty(): boolean;
};

export type TencentLatLngBoundsConstructor = {
  new (sw: TencentLatLng, ne: TencentLatLng): TencentLatLngBounds;
};

export type TencentMap = {
  setCenter(center: TencentLatLng): TencentMap;
  setZoom(zoom: number): TencentMap;
  setRotation(rotation: number): TencentMap;
  getZoom(): number;
  getRotation(): number;
  getCenter(): TencentLatLng;
  fitBounds(bounds: TencentLatLngBounds, options?: TencentFitBoundsOptions): TencentMap;
  easeTo(
    status: { center?: TencentLatLng; zoom?: number; rotation?: number },
    options?: { duration?: number },
  ): TencentMap;
  on(eventName: TencentMapEventName, listener: TencentMapListener): TencentMap;
  off(eventName: TencentMapEventName, listener: TencentMapListener): TencentMap;
  destroy(): void;
};

export type TencentMapEventName = "dragstart" | "touchmove" | "dblclick" | "zoom" | "click";

export type TencentMapEvent = {
  latLng?: TencentLatLng;
  latlng?: TencentLatLng;
};

export type TencentMapListener = (event?: TencentMapEvent) => void;

export type TencentMapConstructor = {
  new (container: HTMLElement | string, options: TencentMapOptions): TencentMap;
};

export type TencentMarkerStyleOptions = {
  width: number;
  height: number;
  anchor?: { x: number; y: number };
  src?: string;
  faceTo?: "map" | "screen";
  rotate?: number;
};

export type TencentMarkerStyle = object;

export type TencentMarkerStyleConstructor = {
  new (options: TencentMarkerStyleOptions): TencentMarkerStyle;
};

export type TencentPointGeometry = {
  id: string;
  styleId: string;
  position: TencentLatLng;
  rank?: number;
  properties?: Record<string, string>;
};

export type TencentMoveAlongParam = {
  path: TencentLatLng[];
  duration?: number;
  speed?: number;
};

export type TencentMoveAlongParamSet = Record<string, TencentMoveAlongParam>;

export type TencentMoveAlongOptions = {
  autoRotation?: boolean;
};

export type TencentMultiMarker = {
  setGeometries(geometries: TencentPointGeometry[]): TencentMultiMarker;
  setStyles(styles: Record<string, TencentMarkerStyle>): TencentMultiMarker;
  moveAlong(param: TencentMoveAlongParamSet, options?: TencentMoveAlongOptions): TencentMultiMarker;
  stopMove(): TencentMultiMarker;
  setMap(map: TencentMap | null): TencentMultiMarker;
  on(eventName: "click", handler: (event: TencentMarkerClickEvent) => void): TencentMultiMarker;
  off(eventName: "click", handler: (event: TencentMarkerClickEvent) => void): TencentMultiMarker;
};

export type TencentMarkerClickEvent = {
  geometry?: {
    id?: string;
  };
};

export type TencentMultiMarkerConstructor = {
  new (options: {
    id?: string;
    map: TencentMap;
    zIndex?: number;
    styles: Record<string, TencentMarkerStyle>;
    geometries: TencentPointGeometry[];
    disableInteractive?: boolean;
  }): TencentMultiMarker;
};

export type TencentPolylineStyleOptions = {
  color?: string;
  width?: number;
  borderWidth?: number;
  borderColor?: string;
  lineCap?: "butt" | "round" | "square";
  dashArray?: number[];
  showArrow?: boolean;
};

export type TencentPolylineStyle = object;

export type TencentPolylineStyleConstructor = {
  new (options: TencentPolylineStyleOptions): TencentPolylineStyle;
};

export type TencentPolylineGeometry = {
  id: string;
  styleId: string;
  paths: TencentLatLng[];
  rank?: number;
  properties?: Record<string, string>;
};

export type TencentMultiPolyline = {
  setGeometries(geometries: TencentPolylineGeometry[]): TencentMultiPolyline;
  setMap(map: TencentMap | null): TencentMultiPolyline;
};

export type TencentMultiPolylineConstructor = {
  new (options: {
    id?: string;
    map: TencentMap;
    zIndex?: number;
    styles: Record<string, TencentPolylineStyle>;
    geometries: TencentPolylineGeometry[];
    disableInteractive?: boolean;
  }): TencentMultiPolyline;
};

export type TencentSuggestionRequest = {
  keyword: string;
  location?: TencentLatLng;
  region?: string;
};

export type TencentSearchRequest = {
  keyword: string;
  location?: TencentLatLng;
  region?: string;
};

export type TencentGeocoderRequest = {
  location: TencentLatLng;
  getPoi?: boolean;
};

export type TencentSuggestionService = {
  getSuggestions(input: TencentSuggestionRequest): Promise<unknown>;
};

export type TencentSearchService = {
  searchRectangle?(input: TencentSearchRequest): Promise<unknown>;
  searchRegion?(input: TencentSearchRequest): Promise<unknown>;
};

export type TencentGeocoderService = {
  getAddress(input: TencentGeocoderRequest): Promise<unknown>;
};

export type TencentSuggestionServiceConstructor = {
  new (options?: { pageSize?: number; region?: string }): TencentSuggestionService;
};

export type TencentSearchServiceConstructor = {
  new (options?: { pageSize?: number; region?: string }): TencentSearchService;
};

export type TencentGeocoderServiceConstructor = {
  new (): TencentGeocoderService;
};

export type TencentServiceNamespace = {
  Suggestion: TencentSuggestionServiceConstructor;
  Search?: TencentSearchServiceConstructor;
  Geocoder: TencentGeocoderServiceConstructor;
};

export type TencentMapSdk = {
  Map: TencentMapConstructor;
  LatLng: TencentLatLngConstructor;
  LatLngBounds: TencentLatLngBoundsConstructor;
  MarkerStyle: TencentMarkerStyleConstructor;
  MultiMarker: TencentMultiMarkerConstructor;
  PolylineStyle: TencentPolylineStyleConstructor;
  MultiPolyline: TencentMultiPolylineConstructor;
  service?: TencentServiceNamespace;
};

export type TencentLBSMapProviderInput = {
  container: HTMLElement;
  apiKey: string;
  libraries?: readonly TencentLBSLibrary[];
  center?: MapCoordinate;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  showDefaultControls?: boolean;
  onMarkerClick?: (markerId: string) => void;
  onUserViewportInteraction?: () => void;
};

export type TencentLBSMapProvider = {
  setMarkers(markers: readonly MapMarker[]): void;
  setPolylines(polylines: readonly MapPolyline[]): void;
  fitGeometry(input: {
    markers: readonly MapMarker[];
    polylines: readonly MapPolyline[];
    activeGeometry?: import("@/shared/map/types").MapActiveGeometry;
    padding?: MapFitPadding;
    maxZoom?: number;
  }): void;
  fitMarker(input: { marker: MapMarker; padding?: MapFitPadding; zoom: number }): void;
  setViewport(input: { center?: MapCoordinate; zoom?: number }): void;
  zoomIn(): void;
  zoomOut(): void;
  destroy(): void;
};

declare global {
  interface Window {
    TMap?: TencentMapSdk;
  }
}
