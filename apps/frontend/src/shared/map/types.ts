export type MapCoordinate = {
  lat: number;
  lng: number;
};

export type MapFitPadding =
  | number
  | {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };

export type MapGeometryTone =
  | "primary"
  | "secondary"
  | "muted"
  | "routePrimary"
  | "routeSecondary"
  | "routeInvalid";

export type MapMarkerIcon =
  | "routeStart"
  | "routeWaypoint"
  | "routeEnd"
  | "routeDriver";

export type MapMarker = {
  id: string;
  position: MapCoordinate;
  label?: string;
  title?: string;
  tone?: MapGeometryTone;
  icon?: MapMarkerIcon;
  active?: boolean;
};

export type MapPolyline = {
  id: string;
  path: readonly MapCoordinate[];
  title?: string;
  tone?: MapGeometryTone;
  active?: boolean;
};

export type MapActiveGeometry =
  | {
      kind: "marker" | "polyline";
      id: string;
    }
  | {
      kind: "all";
    }
  | null;

export type MapViewport = {
  center?: MapCoordinate;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  fitPadding?: MapFitPadding;
  activeGeometry?: MapActiveGeometry;
};

export type MapProviderStatus = "idle" | "loading" | "ready" | "error";
