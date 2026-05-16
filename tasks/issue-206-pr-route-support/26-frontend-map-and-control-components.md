# Frontend Map And Control Components

## Shared Segmented Control

First consumer:

- PR create/edit place mode: `location` / `route`.

Component target:

- `apps/frontend/src/shared/ui/controls/SegmentedControl.vue`

Contract:

- Accepts typed options with `value`, `label`, optional `icon`, and optional `disabled`.
- Emits a single selected value.
- Supports keyboard navigation and focus-visible states.
- Keeps stable dimensions so option text or active state does not resize the control.
- Owns only generic segmented-control behavior; PR place-mode copy and validation stay in PR form code.

Verification:

- Unit tests cover value emit, disabled options, and keyboard behavior.
- PR create/edit uses this shared component through typed place-mode values.

## Shared Map Component

Tencent source:

- JavaScript API GL overview: https://lbs.qq.com/webApi/javascriptGL/glGuide/glOverview

Component target:

- `apps/frontend/src/shared/map/Map.vue`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-loader.ts`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
- `apps/frontend/src/shared/map/tencent/types.ts`

Design intent:

- Expose one product-facing `Map.vue` interface to PR and Anchor Event components.
- Keep Tencent JavaScript API GL lifecycle and SDK objects in a provider boundary under `shared/map/tencent/`.
- Let domain components pass marker/polyline data and active geometry state without knowing `TMap` classes.

Draft props:

```ts
type MapMarker = {
  id: string;
  position: CoordinatePair;
  label?: string;
  tone?: "default" | "active" | "start" | "waypoint" | "end";
};

type MapPolyline = {
  id: string;
  path: CoordinatePair[];
  tone?: "default" | "active" | "route";
};

type MapActiveGeometry =
  | { kind: "marker"; id: string }
  | { kind: "polyline"; id: string }
  | { kind: "bounds"; markerIds: string[]; polylineIds: string[] }
  | null;
```

Component behavior:

- Uses Tencent JavaScript API GL through the first provider implementation.
- Renders markers and polylines from typed props.
- Reconciles overlays when props change.
- Exposes loading, ready, and error states.
- Provides a readable fallback slot when SDK loading fails.
- Accepts `activeGeometry` and `fitPadding`.
- Fits viewport after initial render and after active geometry changes.

Viewport contract:

- Active location option fits the corresponding marker.
- Active route option fits route markers and route polyline bounds together.
- Geometry remains centered and fully visible with padding.
- Fit behavior runs for dropdown changes, carousel changes, and map modal open.
- Empty or invalid geometry uses a stable default viewport and visible fallback copy.

## Domain Compositions

`PRRouteMap.vue`:

- Uses `Map.vue`.
- Accepts a pure `PRRoute`.
- Requests planned route polyline through Tencent Direction WebService.
- Falls back to straight point-to-point polyline or point list.
- Keeps no first-version planned-polyline cache.

`AnchorEventPlaceMapPreview.vue`:

- Uses `Map.vue`.
- Accepts normalized location and route place options.
- Renders location options as standalone markers.
- Renders route options as markers plus planned/fallback polyline.
- Drives `activeGeometry` from the Inline Place Selector dropdown active item.

`PRRouteMapModal.vue`:

- Opens from PR Facts Card Route `InfoRowAction`.
- Shows route map when Tencent SDK and geometry are available.
- Shows route point list fallback when map rendering is unavailable.

## Verification

- Component-level tests cover adapter view-model projection without loading the SDK.
- Browser checks use a configured Tencent key for actual marker/polyline rendering.
- Browser checks also cover missing key or SDK-load failure fallback.
- Active dropdown item changes visibly fit location markers and route polylines with padding.
