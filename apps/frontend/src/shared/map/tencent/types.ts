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
  getZoom(): number;
  fitBounds(bounds: TencentLatLngBounds, options?: TencentFitBoundsOptions): TencentMap;
  easeTo(
    status: { center?: TencentLatLng; zoom?: number },
    options?: { duration?: number },
  ): TencentMap;
  destroy(): void;
};

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
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  size?: number;
  direction?: "center" | "top" | "bottom" | "left" | "right";
  offset?: { x: number; y: number };
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
  content?: string;
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

export type TencentMapSdk = {
  Map: TencentMapConstructor;
  LatLng: TencentLatLngConstructor;
  LatLngBounds: TencentLatLngBoundsConstructor;
  MarkerStyle: TencentMarkerStyleConstructor;
  MultiMarker: TencentMultiMarkerConstructor;
  PolylineStyle: TencentPolylineStyleConstructor;
  MultiPolyline: TencentMultiPolylineConstructor;
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
