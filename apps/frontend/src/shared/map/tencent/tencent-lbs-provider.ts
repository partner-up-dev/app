import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapGeometryTone,
  MapMarker,
  MapMarkerIcon,
  MapPolyline,
} from "@/shared/map/types";
import { loadTencentLBSSdk } from "./tencent-lbs-loader";
import type {
  TencentLatLng,
  TencentLatLngBounds,
  TencentLBSMapProvider,
  TencentLBSMapProviderInput,
  TencentMap,
  TencentMapOptions,
  TencentMapSdk,
  TencentMarkerClickEvent,
  TencentMarkerStyle,
  TencentMarkerStyleOptions,
  TencentMoveAlongParamSet,
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
const SINGLE_POINT_BOUNDS_DELTA = 0.0001;
const TENCENT_MAP_STYLE_ID = "style1";
const DRIVER_MARKER_MOVE_DURATION_MS = 1_900;
const MARKER_MOVE_COORDINATE_EPSILON = 0.000001;

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
const ROUTE_DRIVER_HEADING_STYLE_PREFIX = "routeDriverHeading";

const createMarkerSvg = (color: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path fill="${color}" d="M14 0C6.7 0 .8 5.9.8 13.2c0 9.9 13.2 22.8 13.2 22.8s13.2-12.9 13.2-22.8C27.2 5.9 21.3 0 14 0Z"/><circle cx="14" cy="13.2" r="5.2" fill="white"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const isFiniteCoordinate = (coordinate: MapCoordinate): boolean =>
  Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng);

const coordinatesEqual = (first: MapCoordinate, second: MapCoordinate): boolean =>
  Math.abs(first.lat - second.lat) < MARKER_MOVE_COORDINATE_EPSILON &&
  Math.abs(first.lng - second.lng) < MARKER_MOVE_COORDINATE_EPSILON;

const toTencentLatLng = (sdk: TencentMapSdk, coordinate: MapCoordinate): TencentLatLng =>
  new sdk.LatLng(coordinate.lat, coordinate.lng);

const createSinglePointBounds = (
  sdk: TencentMapSdk,
  coordinate: MapCoordinate,
): TencentLatLngBounds => {
  // Tencent fitBounds is the viewport API that honors padding; give one point a tiny area.
  return new sdk.LatLngBounds(
    toTencentLatLng(sdk, {
      lat: coordinate.lat - SINGLE_POINT_BOUNDS_DELTA,
      lng: coordinate.lng - SINGLE_POINT_BOUNDS_DELTA,
    }),
    toTencentLatLng(sdk, {
      lat: coordinate.lat + SINGLE_POINT_BOUNDS_DELTA,
      lng: coordinate.lng + SINGLE_POINT_BOUNDS_DELTA,
    }),
  );
};

export const toTencentMarkerRotateDegrees = (
  headingDegrees: number | null | undefined,
): number | null => {
  if (typeof headingDegrees !== "number" || !Number.isFinite(headingDegrees)) return null;
  const normalizedHeading = ((headingDegrees % 360) + 360) % 360;
  return (360 - normalizedHeading) % 360;
};

export const resolveTencentMarkerStyleId = (
  marker: MapMarker,
): MapGeometryTone | MapMarkerIcon | "active" | string => {
  if (marker.icon === "routeDriver") {
    const rotateDegrees = toTencentMarkerRotateDegrees(marker.headingDegrees);
    return typeof rotateDegrees === "number"
      ? `${ROUTE_DRIVER_HEADING_STYLE_PREFIX}-${Math.round(rotateDegrees)}`
      : "routeDriver";
  }
  return marker.icon ?? (marker.active ? "active" : (marker.tone ?? "primary"));
};

const resolvePolylineStyleId = (polyline: MapPolyline): MapGeometryTone | "active" =>
  polyline.active ? "active" : (polyline.tone ?? "primary");

const createRouteDriverMarkerStyle = (
  sdk: TencentMapSdk,
  rotateDegrees?: number,
): TencentMarkerStyle => {
  const options: TencentMarkerStyleOptions = {
    width: 38,
    height: 38,
    anchor: { x: 19, y: 19 },
    faceTo: "map",
    src: ROUTE_MARKER_ICON_SRC.routeDriver,
  };
  if (typeof rotateDegrees === "number") {
    options.rotate = rotateDegrees;
  }
  return new sdk.MarkerStyle(options);
};

const createMarkerStyles = (
  sdk: TencentMapSdk,
  markers: readonly MapMarker[] = [],
): Record<string, TencentMarkerStyle> => {
  const styles: Record<string, TencentMarkerStyle> = {
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
    routeDriver: createRouteDriverMarkerStyle(sdk),
  };
  for (const marker of markers) {
    if (marker.icon !== "routeDriver") continue;
    const rotateDegrees = toTencentMarkerRotateDegrees(marker.headingDegrees);
    if (typeof rotateDegrees !== "number") continue;
    styles[resolveTencentMarkerStyleId(marker)] = createRouteDriverMarkerStyle(
      sdk,
      Math.round(rotateDegrees),
    );
  }
  return styles;
};

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
        styleId: resolveTencentMarkerStyleId(marker),
        position: toTencentLatLng(sdk, marker.position),
        rank: marker.active ? 10_000 : index,
        properties: {
          title: marker.title ?? marker.label ?? marker.id,
        },
      };
      const content = marker.calloutLabel ?? marker.label ?? "";
      if (content.length > 0) {
        geometry.content = content;
      }
      return geometry;
    });

export const shouldAnimateTencentMarkerMove = (input: {
  previous: MapMarker | null | undefined;
  next: MapMarker;
}): boolean => {
  if (input.next.icon !== "routeDriver") return false;
  if (!input.previous || input.previous.icon !== "routeDriver") return false;
  if (!isFiniteCoordinate(input.previous.position) || !isFiniteCoordinate(input.next.position)) {
    return false;
  }
  return !coordinatesEqual(input.previous.position, input.next.position);
};

const toRenderedMarkerForMove = (
  marker: MapMarker,
  previousMarkersById: ReadonlyMap<string, MapMarker>,
): MapMarker => {
  const previous = previousMarkersById.get(marker.id);
  if (!shouldAnimateTencentMarkerMove({ next: marker, previous }) || !previous) {
    return marker;
  }
  return {
    ...marker,
    position: previous.position,
  };
};

const toMarkerMoveAlongParams = (
  sdk: TencentMapSdk,
  markers: readonly MapMarker[],
  previousMarkersById: ReadonlyMap<string, MapMarker>,
): TencentMoveAlongParamSet => {
  const params: TencentMoveAlongParamSet = {};
  for (const marker of markers) {
    const previous = previousMarkersById.get(marker.id);
    if (!shouldAnimateTencentMarkerMove({ next: marker, previous }) || !previous) continue;
    params[marker.id] = {
      duration: DRIVER_MARKER_MOVE_DURATION_MS,
      path: [toTencentLatLng(sdk, previous.position), toTencentLatLng(sdk, marker.position)],
    };
  }
  return params;
};

const toMarkerMap = (markers: readonly MapMarker[]): Map<string, MapMarker> =>
  new Map(markers.map((marker) => [marker.id, marker]));

const toPolylineGeometries = (
  sdk: TencentMapSdk,
  polylines: readonly MapPolyline[],
): TencentPolylineGeometry[] =>
  polylines
    .map((polyline, index) => ({
      id: polyline.id,
      styleId: resolvePolylineStyleId(polyline),
      paths: polyline.path.filter(isFiniteCoordinate).map((point) => toTencentLatLng(sdk, point)),
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
    return marker && isFiniteCoordinate(marker.position) ? [marker.position] : [];
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
  const bounds =
    validCoordinates.length === 1
      ? createSinglePointBounds(sdk, firstCoordinate)
      : new sdk.LatLngBounds(firstLatLng, firstLatLng);
  if (validCoordinates.length > 1) {
    validCoordinates.slice(1).forEach((coordinate) => {
      bounds.extend(toTencentLatLng(sdk, coordinate));
    });
  }
  map.fitBounds(bounds, {
    padding,
    maxZoom:
      validCoordinates.length === 1
        ? Math.min(maxZoom ?? SINGLE_POINT_ZOOM, SINGLE_POINT_ZOOM)
        : maxZoom,
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
  showDefaultControls = true,
  onMarkerClick,
}: TencentLBSMapProviderInput): Promise<TencentLBSMapProvider> => {
  const sdk = await loadTencentLBSSdk({ key: apiKey, libraries });
  const mapOptions: TencentMapOptions = {
    center: toTencentLatLng(sdk, center),
    zoom,
    mapStyleId: TENCENT_MAP_STYLE_ID,
    viewMode: "2D",
    showControl: showDefaultControls,
    draggable: interactive,
    scrollable: interactive,
    touchZoomable: interactive,
    doubleClickZoom: interactive,
  };
  if (typeof minZoom === "number") {
    mapOptions.minZoom = minZoom;
  }
  if (typeof maxZoom === "number") {
    mapOptions.maxZoom = maxZoom;
  }
  const map = new sdk.Map(container, mapOptions);

  let markerLayer: TencentMultiMarker | null = new sdk.MultiMarker({
    id: "partner-up-marker-layer",
    map,
    zIndex: 20,
    styles: createMarkerStyles(sdk),
    geometries: [],
    disableInteractive: false,
  });
  let previousMarkerTargetsById = new Map<string, MapMarker>();

  const handleMarkerClick = (event: TencentMarkerClickEvent) => {
    const markerId = event.geometry?.id;
    if (markerId) {
      onMarkerClick?.(markerId);
    }
  };
  markerLayer.on("click", handleMarkerClick);

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
      markerLayer?.setStyles(createMarkerStyles(sdk, markers));
      const moveAlongParams = toMarkerMoveAlongParams(sdk, markers, previousMarkerTargetsById);
      const renderedMarkers = markers.map((marker) =>
        toRenderedMarkerForMove(marker, previousMarkerTargetsById),
      );
      markerLayer?.setGeometries(toMarkerGeometries(sdk, renderedMarkers));
      if (Object.keys(moveAlongParams).length > 0) {
        markerLayer?.moveAlong(moveAlongParams, {
          autoRotation: true,
        });
      }
      previousMarkerTargetsById = toMarkerMap(markers);
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
    zoomIn() {
      map.setZoom(Math.min(map.getZoom() + 1, maxZoom ?? 20));
    },
    zoomOut() {
      map.setZoom(Math.max(map.getZoom() - 1, minZoom ?? 3));
    },
    destroy() {
      markerLayer?.off("click", handleMarkerClick);
      markerLayer?.stopMove();
      markerLayer?.setMap(null);
      markerLayer = null;
      polylineLayer?.setMap(null);
      polylineLayer = null;
      map.destroy();
    },
  };
};
