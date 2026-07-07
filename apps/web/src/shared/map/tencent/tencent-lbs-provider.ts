import type {
  MapActiveGeometry,
  MapCoordinate,
  MapFitPadding,
  MapGeometryTone,
  MapMarker,
  MapMarkerIcon,
  MapPolyline,
  MapPolylineTone,
} from "@/shared/map/types";
import { loadTencentLBSSdk } from "./tencent-lbs-loader";
import type {
  TencentLatLng,
  TencentLatLngBounds,
  TencentLBSMapProvider,
  TencentLBSMapProviderInput,
  TencentMap,
  TencentMapEventName,
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
const PROGRAMMATIC_VIEWPORT_CHANGE_SUPPRESSION_MS = 360;
const DIRECT_USER_VIEWPORT_INTERACTION_EVENTS: readonly TencentMapEventName[] = [
  "dragstart",
  "touchmove",
  "dblclick",
];

type TencentMapDesignColorRole = MapPolylineTone | "muted" | "active";

const DESIGN_COLOR_VARIABLES: Record<TencentMapDesignColorRole, string> = {
  primary: "--sys-color-primary",
  secondary: "--sys-color-secondary",
  tertiary: "--sys-color-tertiary",
  danger: "--sys-color-error",
  muted: "--sys-color-on-surface-variant",
  active: "--sys-color-primary",
};

const DESIGN_COLOR_FALLBACKS: Record<TencentMapDesignColorRole, string> = {
  primary: "#96d945",
  secondary: "#85976e",
  tertiary: "#4c9e99",
  danger: "#d32f2f",
  muted: "#44483d",
  active: "#96d945",
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

const readDocumentCssVariable = (variableName: string): string | null => {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof window.getComputedStyle !== "function"
  ) {
    return null;
  }

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(variableName);
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const resolveTencentMapDesignColor = (role: TencentMapDesignColorRole): string =>
  readDocumentCssVariable(DESIGN_COLOR_VARIABLES[role]) ?? DESIGN_COLOR_FALLBACKS[role];

const resolveMarkerColors = (): Record<MapGeometryTone | "active", string> => ({
  primary: resolveTencentMapDesignColor("primary"),
  secondary: resolveTencentMapDesignColor("secondary"),
  tertiary: resolveTencentMapDesignColor("tertiary"),
  danger: resolveTencentMapDesignColor("danger"),
  muted: resolveTencentMapDesignColor("muted"),
  active: resolveTencentMapDesignColor("active"),
});

const resolvePolylineColors = (): Record<MapPolylineTone, string> => ({
  primary: resolveTencentMapDesignColor("primary"),
  secondary: resolveTencentMapDesignColor("secondary"),
  tertiary: resolveTencentMapDesignColor("tertiary"),
  danger: resolveTencentMapDesignColor("danger"),
});

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

const resolvePolylineStyleId = (polyline: MapPolyline): MapPolylineTone =>
  polyline.tone ?? "primary";

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
  const markerColors = resolveMarkerColors();
  const styles: Record<string, TencentMarkerStyle> = {
    primary: new sdk.MarkerStyle({
      width: 28,
      height: 36,
      anchor: { x: 14, y: 36 },
      src: createMarkerSvg(markerColors.primary),
    }),
    secondary: new sdk.MarkerStyle({
      width: 28,
      height: 36,
      anchor: { x: 14, y: 36 },
      src: createMarkerSvg(markerColors.secondary),
    }),
    tertiary: new sdk.MarkerStyle({
      width: 28,
      height: 36,
      anchor: { x: 14, y: 36 },
      src: createMarkerSvg(markerColors.tertiary),
    }),
    danger: new sdk.MarkerStyle({
      width: 28,
      height: 36,
      anchor: { x: 14, y: 36 },
      src: createMarkerSvg(markerColors.danger),
    }),
    muted: new sdk.MarkerStyle({
      width: 28,
      height: 36,
      anchor: { x: 14, y: 36 },
      src: createMarkerSvg(markerColors.muted),
    }),
    active: new sdk.MarkerStyle({
      width: 32,
      height: 40,
      anchor: { x: 16, y: 40 },
      src: createMarkerSvg(markerColors.active),
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

const createPolylineStyles = (sdk: TencentMapSdk) => {
  const polylineColors = resolvePolylineColors();
  return {
    primary: new sdk.PolylineStyle({
      color: polylineColors.primary,
      width: 7,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.95)",
      lineCap: "round",
      showArrow: true,
    }),
    secondary: new sdk.PolylineStyle({
      color: polylineColors.secondary,
      width: 7,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.95)",
      lineCap: "round",
      showArrow: true,
    }),
    tertiary: new sdk.PolylineStyle({
      color: polylineColors.tertiary,
      width: 7,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.95)",
      lineCap: "round",
      showArrow: true,
    }),
    danger: new sdk.PolylineStyle({
      color: polylineColors.danger,
      width: 7,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.95)",
      lineCap: "round",
      showArrow: true,
    }),
  };
};

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

  if (activeGeometry.kind === "selection") {
    const markerIds = new Set(activeGeometry.markerIds ?? []);
    const polylineIds = new Set(activeGeometry.polylineIds ?? []);
    return [
      ...markers.filter((marker) => markerIds.has(marker.id)).map((marker) => marker.position),
      ...polylines
        .filter((polyline) => polylineIds.has(polyline.id))
        .flatMap((polyline) => polyline.path),
    ].filter(isFiniteCoordinate);
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
  singlePointMaxZoom,
}: {
  sdk: TencentMapSdk;
  map: TencentMap;
  coordinates: readonly MapCoordinate[];
  padding?: MapFitPadding;
  maxZoom?: number;
  singlePointMaxZoom?: number;
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
  const resolvedSinglePointMaxZoom = singlePointMaxZoom ?? SINGLE_POINT_ZOOM;
  map.fitBounds(bounds, {
    padding,
    maxZoom:
      validCoordinates.length === 1
        ? Math.min(maxZoom ?? resolvedSinglePointMaxZoom, resolvedSinglePointMaxZoom)
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
  onUserViewportInteraction,
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
  let suppressUserViewportInteractionUntil = 0;
  const runProgrammaticViewportChange = (callback: () => void) => {
    suppressUserViewportInteractionUntil = Date.now() + PROGRAMMATIC_VIEWPORT_CHANGE_SUPPRESSION_MS;
    callback();
  };
  const emitUserViewportInteraction = () => {
    onUserViewportInteraction?.();
  };
  const handleMaybeUserViewportInteraction = () => {
    if (Date.now() < suppressUserViewportInteractionUntil) {
      return;
    }
    emitUserViewportInteraction();
  };
  for (const eventName of DIRECT_USER_VIEWPORT_INTERACTION_EVENTS) {
    map.on(eventName, emitUserViewportInteraction);
  }
  map.on("zoom", handleMaybeUserViewportInteraction);

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
      runProgrammaticViewportChange(() => {
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
      });
    },
    fitMarker({ marker, zoom: markerZoom }) {
      runProgrammaticViewportChange(() => {
        if (!isFiniteCoordinate(marker.position)) {
          return;
        }
        map.easeTo(
          {
            center: toTencentLatLng(sdk, marker.position),
            zoom: markerZoom,
          },
          { duration: 240 },
        );
      });
    },
    setViewport({ center: nextCenter, zoom: nextZoom }) {
      runProgrammaticViewportChange(() => {
        if (nextCenter) {
          map.setCenter(toTencentLatLng(sdk, nextCenter));
        }
        if (typeof nextZoom === "number") {
          map.setZoom(nextZoom);
        }
      });
    },
    zoomIn() {
      runProgrammaticViewportChange(() => {
        map.setZoom(Math.min(map.getZoom() + 1, maxZoom ?? 20));
      });
    },
    zoomOut() {
      runProgrammaticViewportChange(() => {
        map.setZoom(Math.max(map.getZoom() - 1, minZoom ?? 3));
      });
    },
    destroy() {
      for (const eventName of DIRECT_USER_VIEWPORT_INTERACTION_EVENTS) {
        map.off(eventName, emitUserViewportInteraction);
      }
      map.off("zoom", handleMaybeUserViewportInteraction);
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
