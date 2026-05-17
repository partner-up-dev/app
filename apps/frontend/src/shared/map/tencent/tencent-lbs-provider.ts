import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapGeometryTone,
  MapMarkerIcon,
  MapMarker,
  MapPolyline,
} from "@/shared/map/types";
import { loadTencentLBSSdk } from "./tencent-lbs-loader";
import type {
  TencentLBSMapProvider,
  TencentLBSMapProviderInput,
  TencentLatLng,
  TencentMap,
  TencentMapSdk,
  TencentMultiMarker,
  TencentMultiPolyline,
  TencentPointGeometry,
  TencentPolylineGeometry,
} from "./types";

const DEFAULT_CENTER: MapCoordinate = {
  lat: 31.2304,
  lng: 121.4737,
};
const DEFAULT_ZOOM = 12;
const SINGLE_POINT_ZOOM = 15;

const MARKER_COLORS: Record<MapGeometryTone | "active", string> = {
  primary: "#1D63ED",
  secondary: "#008765",
  muted: "#5F6B7A",
  routePrimary: "#85976e",
  routeSecondary: "#dbe7c8",
  routeInvalid: "#abaca5",
  active: "#C7472F",
};

const POLYLINE_COLORS: Record<MapGeometryTone | "active", string> = {
  primary: "#1D63ED",
  secondary: "#008765",
  muted: "#5F6B7A",
  routePrimary: "#85976e",
  routeSecondary: "#dbe7c8",
  routeInvalid: "#abaca5",
  active: "#C7472F",
};

const ROUTE_MARKER_ICON_SRC: Record<MapMarkerIcon, string> = {
  routeStart: "/route-map/map-marker-from.png",
  routeWaypoint: "/route-map/map-marker-waypoint.png",
  routeEnd: "/route-map/map-marker-to.png",
  routeDriver: "/route-map/map-marker-driver.png",
};

const createMarkerSvg = (color: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path fill="${color}" d="M14 0C6.7 0 .8 5.9.8 13.2c0 9.9 13.2 22.8 13.2 22.8s13.2-12.9 13.2-22.8C27.2 5.9 21.3 0 14 0Z"/><circle cx="14" cy="13.2" r="5.2" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const isFiniteCoordinate = (coordinate: MapCoordinate): boolean =>
  Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng);

const toTencentLatLng = (
  sdk: TencentMapSdk,
  coordinate: MapCoordinate,
): TencentLatLng => new sdk.LatLng(coordinate.lat, coordinate.lng);

const resolveMarkerStyleId = (
  marker: MapMarker,
): MapGeometryTone | MapMarkerIcon | "active" =>
  marker.active ? "active" : (marker.icon ?? marker.tone ?? "primary");

const resolvePolylineStyleId = (
  polyline: MapPolyline,
): MapGeometryTone | "active" =>
  polyline.active ? "active" : (polyline.tone ?? "primary");

const createMarkerStyles = (sdk: TencentMapSdk) => ({
  primary: new sdk.MarkerStyle({
    width: 28,
    height: 36,
    anchor: { x: 14, y: 36 },
    src: createMarkerSvg(MARKER_COLORS.primary),
    color: "#FFFFFF",
    strokeColor: "rgba(0,0,0,0)",
    size: 12,
    direction: "center",
    offset: { x: 0, y: -7 },
  }),
  secondary: new sdk.MarkerStyle({
    width: 28,
    height: 36,
    anchor: { x: 14, y: 36 },
    src: createMarkerSvg(MARKER_COLORS.secondary),
    color: "#FFFFFF",
    strokeColor: "rgba(0,0,0,0)",
    size: 12,
    direction: "center",
    offset: { x: 0, y: -7 },
  }),
  muted: new sdk.MarkerStyle({
    width: 28,
    height: 36,
    anchor: { x: 14, y: 36 },
    src: createMarkerSvg(MARKER_COLORS.muted),
    color: "#FFFFFF",
    strokeColor: "rgba(0,0,0,0)",
    size: 12,
    direction: "center",
    offset: { x: 0, y: -7 },
  }),
  active: new sdk.MarkerStyle({
    width: 32,
    height: 40,
    anchor: { x: 16, y: 40 },
    src: createMarkerSvg(MARKER_COLORS.active),
    color: "#FFFFFF",
    strokeColor: "rgba(0,0,0,0)",
    size: 12,
    direction: "center",
    offset: { x: 0, y: -8 },
  }),
  routeStart: new sdk.MarkerStyle({
    width: 24,
    height: 24,
    anchor: { x: 12, y: 12 },
    src: ROUTE_MARKER_ICON_SRC.routeStart,
  }),
  routeWaypoint: new sdk.MarkerStyle({
    width: 24,
    height: 24,
    anchor: { x: 12, y: 12 },
    src: ROUTE_MARKER_ICON_SRC.routeWaypoint,
  }),
  routeEnd: new sdk.MarkerStyle({
    width: 24,
    height: 24,
    anchor: { x: 12, y: 12 },
    src: ROUTE_MARKER_ICON_SRC.routeEnd,
  }),
  routeDriver: new sdk.MarkerStyle({
    width: 38,
    height: 38,
    anchor: { x: 19, y: 19 },
    src: ROUTE_MARKER_ICON_SRC.routeDriver,
  }),
});

const createPolylineStyles = (sdk: TencentMapSdk) => ({
  primary: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.primary,
    width: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    lineCap: "round",
  }),
  secondary: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.secondary,
    width: 5,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    lineCap: "round",
  }),
  muted: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.muted,
    width: 4,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.88)",
    lineCap: "round",
    dashArray: [8, 8],
  }),
  routePrimary: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.routePrimary,
    width: 7,
    borderWidth: 1,
    borderColor: "#ffffff",
    lineCap: "round",
    showArrow: true,
  }),
  routeSecondary: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.routeSecondary,
    width: 7,
    borderWidth: 1,
    borderColor: "#ffffff",
    lineCap: "round",
    showArrow: true,
  }),
  routeInvalid: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.routeInvalid,
    width: 7,
    borderWidth: 1,
    borderColor: "#5e5f59",
    lineCap: "round",
    showArrow: true,
  }),
  active: new sdk.PolylineStyle({
    color: POLYLINE_COLORS.active,
    width: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.95)",
    lineCap: "round",
  }),
});

const toMarkerGeometries = (
  sdk: TencentMapSdk,
  markers: readonly MapMarker[],
): TencentPointGeometry[] =>
  markers
    .filter((marker) => isFiniteCoordinate(marker.position))
    .map((marker, index) => {
      const geometry: TencentPointGeometry = {
        id: marker.id,
        styleId: resolveMarkerStyleId(marker),
        position: toTencentLatLng(sdk, marker.position),
        rank: marker.active ? 10_000 : index,
        properties: {
          title: marker.title ?? marker.label ?? marker.id,
        },
      };
      if (typeof marker.label === "string" && marker.label.length > 0) {
        geometry.content = marker.label;
      }
      return geometry;
    });

const toPolylineGeometries = (
  sdk: TencentMapSdk,
  polylines: readonly MapPolyline[],
): TencentPolylineGeometry[] =>
  polylines
    .map((polyline, index) => ({
      id: polyline.id,
      styleId: resolvePolylineStyleId(polyline),
      paths: polyline.path
        .filter(isFiniteCoordinate)
        .map((point) => toTencentLatLng(sdk, point)),
      rank: polyline.active ? 10_000 : index,
      properties: {
        title: polyline.title ?? polyline.id,
      },
    }))
    .filter((geometry) => geometry.paths.length >= 2);

const collectActiveCoordinates = ({
  markers,
  polylines,
  activeGeometry,
}: {
  markers: readonly MapMarker[];
  polylines: readonly MapPolyline[];
  activeGeometry?: MapActiveGeometry;
}): MapCoordinate[] => {
  if (!activeGeometry || activeGeometry.kind === "all") {
    return [
      ...markers.map((marker) => marker.position),
      ...polylines.flatMap((polyline) => polyline.path),
    ].filter(isFiniteCoordinate);
  }

  if (activeGeometry.kind === "marker") {
    const marker = markers.find((item) => item.id === activeGeometry.id);
    return marker && isFiniteCoordinate(marker.position)
      ? [marker.position]
      : [];
  }

  const polyline = polylines.find((item) => item.id === activeGeometry.id);
  return polyline ? polyline.path.filter(isFiniteCoordinate) : [];
};

const fitCoordinates = ({
  sdk,
  map,
  coordinates,
  padding,
  maxZoom,
}: {
  sdk: TencentMapSdk;
  map: TencentMap;
  coordinates: readonly MapCoordinate[];
  padding?: MapFitPadding;
  maxZoom?: number;
}) => {
  const validCoordinates = coordinates.filter(isFiniteCoordinate);
  const firstCoordinate = validCoordinates[0];
  if (!firstCoordinate) {
    return;
  }

  const firstLatLng = toTencentLatLng(sdk, firstCoordinate);
  if (validCoordinates.length === 1) {
    map.easeTo(
      {
        center: firstLatLng,
        zoom: Math.min(maxZoom ?? SINGLE_POINT_ZOOM, SINGLE_POINT_ZOOM),
      },
      { duration: 240 },
    );
    return;
  }

  const bounds = new sdk.LatLngBounds(firstLatLng, firstLatLng);
  validCoordinates.slice(1).forEach((coordinate) => {
    bounds.extend(toTencentLatLng(sdk, coordinate));
  });
  map.fitBounds(bounds, {
    padding,
    maxZoom,
    ease: { duration: 240 },
  });
};

export const createTencentLBSMapProvider = async ({
  container,
  apiKey,
  libraries,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  minZoom,
  maxZoom,
  interactive = true,
}: TencentLBSMapProviderInput): Promise<TencentLBSMapProvider> => {
  const sdk = await loadTencentLBSSdk({ key: apiKey, libraries });
  const map = new sdk.Map(container, {
    center: toTencentLatLng(sdk, center),
    zoom,
    minZoom,
    maxZoom,
    viewMode: "2D",
    showControl: interactive,
    draggable: interactive,
    scrollable: interactive,
    touchZoomable: interactive,
    doubleClickZoom: interactive,
  });

  let markerLayer: TencentMultiMarker | null = new sdk.MultiMarker({
    id: "partner-up-marker-layer",
    map,
    zIndex: 20,
    styles: createMarkerStyles(sdk),
    geometries: [],
    disableInteractive: false,
  });

  let polylineLayer: TencentMultiPolyline | null = new sdk.MultiPolyline({
    id: "partner-up-polyline-layer",
    map,
    zIndex: 10,
    styles: createPolylineStyles(sdk),
    geometries: [],
    disableInteractive: false,
  });

  return {
    setMarkers(markers) {
      markerLayer?.setGeometries(toMarkerGeometries(sdk, markers));
    },
    setPolylines(polylines) {
      polylineLayer?.setGeometries(toPolylineGeometries(sdk, polylines));
    },
    fitGeometry({ markers, polylines, activeGeometry, padding, maxZoom }) {
      fitCoordinates({
        sdk,
        map,
        coordinates: collectActiveCoordinates({
          markers,
          polylines,
          activeGeometry,
        }),
        padding,
        maxZoom,
      });
    },
    setViewport({ center: nextCenter, zoom: nextZoom }) {
      if (nextCenter) {
        map.setCenter(toTencentLatLng(sdk, nextCenter));
      }
      if (typeof nextZoom === "number") {
        map.setZoom(nextZoom);
      }
    },
    destroy() {
      markerLayer?.setMap(null);
      markerLayer = null;
      polylineLayer?.setMap(null);
      polylineLayer = null;
      map.destroy();
    },
  };
};
