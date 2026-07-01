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

export type MapGeometryTone = "primary" | "secondary" | "tertiary" | "danger" | "muted";

export type MapPolylineTone = "primary" | "secondary" | "tertiary" | "danger";

export type MapViewportFollowMode = "none" | "active-marker";

export type MapMarkerIcon = "routeStart" | "routeWaypoint" | "routeEnd" | "routeDriver";

export type MapMarker = {
  id: string;
  position: MapCoordinate;
  label?: string;
  calloutLabel?: string;
  title?: string;
  tone?: MapGeometryTone;
  icon?: MapMarkerIcon;
  headingDegrees?: number | null;
  active?: boolean;
};

export type MapPolyline = {
  id: string;
  path: readonly MapCoordinate[];
  title?: string;
  tone?: MapPolylineTone;
  active?: boolean;
};

export type MapActiveGeometry =
  | {
      kind: "marker" | "polyline";
      id: string;
    }
  | {
      kind: "selection";
      markerIds?: readonly string[];
      polylineIds?: readonly string[];
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
