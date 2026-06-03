# Frontend Map And Control Components

## Shared Segmented Control

Status: implemented in Slice 5 on 2026-05-16.

First consumer:

- PR create/edit place mode: `location` / `route`.

Component target:

- `apps/frontend/src/shared/ui/controls/SegmentedControl.vue`

Contract:

- Accepts typed options with `value`, `label`, optional `icon`, and optional `disabled`.
- Emits a single selected value.
- Uses native button focus behavior and `radiogroup` / `radio` semantics.
- Keeps stable dimensions so option text or active state does not resize the control.
- Owns only generic segmented-control behavior; PR place-mode copy and validation stay in PR form code.

Verification:

- Slice 5 build verification covers component type safety.
- PR create/edit use is planned for Slice 6.

## Shared Map Component

Status: implemented in Slice 5 on 2026-05-16.

Tencent source:

- JavaScript API GL overview: https://lbs.qq.com/webApi/javascriptGL/glGuide/glOverview
- Location picker component: https://lbs.qq.com/webApi/component/componentGuide/componentPicker
- Position marker component: https://lbs.qq.com/webApi/component/componentGuide/componentMarker

Component target:

- `apps/frontend/src/shared/map/Map.vue`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-loader.ts`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
- `apps/frontend/src/shared/map/tencent/types.ts`

Design intent:

- Expose one product-facing `Map.vue` interface to PR and Anchor Event components.
- Keep Tencent JavaScript API GL lifecycle and SDK objects in a provider boundary under `shared/map/tencent/`.
- Let domain components pass marker/polyline data and active geometry state without knowing `TMap` classes.

Implemented props:

```ts
type MapMarker = {
  id: string;
  position: { lat: number; lng: number };
  label?: string;
  title?: string;
  tone?: "primary" | "secondary" | "muted";
  active?: boolean;
};

type MapPolyline = {
  id: string;
  path: Array<{ lat: number; lng: number }>;
  title?: string;
  tone?: "primary" | "secondary" | "muted";
  active?: boolean;
};

type MapActiveGeometry =
  | { kind: "marker"; id: string }
  | { kind: "polyline"; id: string }
  | { kind: "all" }
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

Correction decision on 2026-05-16:

- Route is a generic concept. Rename and move route model/UI from PR-owned files into a route-owned or shared route boundary before expanding UI slices.
- PR code consumes the generic route modules only for Route PR place-mode payload mapping.
- The RouteEditor main surface should follow the UniApp `routeEditor.vue` normal/immersive interaction:
  - normal mode: compact route item rows with map/open action, add waypoint action, clickable location row, optional datetime action, and waypoint remove icon.
  - immersive mode: staged departure, waypoint, and arrival sections with bottom actions.
- The main RouteEditor surface should show selected location labels and route structure. Location search, map-based picking, and coordinate confirmation belong in a generic LocationPicker flow.
- LocationPicker is a generic capability. Route item editing opens LocationPicker and maps `PickedLocation` into a route point.
- Tencent `componentPicker` is the first-version provider for the generic LocationPicker flow. It returns `latlng`, `poiname`, `poiaddress`, and `cityname`; the app adapter maps that payload into `PickedLocation`.
- Tencent `componentMarker` is a display component and can support display-oriented previews.

Target generic contracts:

```ts
type PickedLocation = {
  name: string;
  address: string | null;
  cityName: string | null;
  gcj02: [number, number];
};

type RoutePoint = {
  name: string;
  full_address: string | null;
  gcj02: [number, number] | null;
  wgs84: [number, number] | null;
  bd09: [number, number] | null;
};
```

`RouteMap.vue`:

- Uses `Map.vue`.
- Accepts a generic `Route`.
- Accepts optional planned route polyline from future Direction WebService integration.
- Falls back to straight point-to-point polyline or point list.
- Keeps no first-version planned-polyline cache.
- Slice 6C correction target:
  - call Tencent Direction WebService for driving-route planning when route points have coordinates.
  - decode Tencent compressed polyline with the UniApp `decompressPolyline` algorithm.
  - render planned driving-route polyline as the primary geometry.
  - keep readable fallback for planning failure and incomplete coordinates.
- Slice 6C implementation:
  - `RouteMap.vue` plans driving routes from complete route coordinates.
  - `route-planning.ts` owns Direction WebService URL construction, response parsing, and compressed polyline decoding.
  - `VITE_TENCENT_LBS_WEB_SERVICE_KEY` can override the map JavaScript key for WebService calls.
  - no planned-polyline cache is introduced.

`RouteEditor.vue`:

- Uses the UniApp reference interaction shape: departure, waypoint, arrival.
- Inserts waypoints before the arrival point.
- Allows removal only for waypoint rows.
- Allows each route point to move up or down by swapping with its adjacent route point. The first point hides the up action and the last point hides the down action.
- Emits typed generic `Route` values and leaves submit policy to the consuming form.
- Opens generic `LocationPickerModal.vue` when a route item row is clicked.
- Disables the map/navigation action until the route has at least two points, all point names are present, and all point coordinates are present.
- `PRPlaceModeField.vue` keeps the PR-specific place-mode integration and maps generic `Route` values to `PartnerRequest.route`.
- Slice 6B updated the Web RouteEditor to the UniApp `routeEditor.vue` + `routeEditor.scss` structure:
  - normal layout uses left icon-only operations and right single-line route item rows.
  - immersive layout uses staged departure/waypoint/arrival blocks plus bottom actions.
  - the Web route planning action opens the route map modal.
  - `max`, `disableDatetime`, `useDepDatetimeEditor`, `change`, `complete`, `editDatetime`, and `editDepTime` keep the Web component API aligned with the UniApp surface.

`RouteItemRow.vue`:

- Renders inline and immersive route item variants.
- Shows selected location name or role-specific placeholder.
- Emits pick/remove/datetime intent only; LocationPicker owns search/pick/confirm behavior.
- Inline rows render fixed-height trailing order actions so the row height aligns with RouteEditor icon actions.

`pr-route.ts`:

- Keeps PR payload conversion, route-mode resolution, and PR-named compatibility wrappers.
- Generic route helpers live in `apps/frontend/src/domains/route/model/route.ts`.

`LocationPickerPanel.vue` / `LocationPickerModal.vue`:

- Uses Tencent `componentPicker` iframe mode when a Tencent LBS JS key is configured.
- Listens for `postMessage` payloads with `module: "locationPicker"`.
- Maps `poiname`, `poiaddress`, `cityname`, and `latlng` into `PickedLocation`.
- Allows editing selected name/address before confirmation.
- When reopening with an initial location, the app keeps the selected location in the local editable draft.
- Runtime verification on `https://partner-up.localhost` showed Tencent `componentPicker` renders an illegal-coordinate page whenever `coord=<lat>,<lng>` is present, including the official `lat,lng&coordtype=5` shape. The iframe URL therefore omits `coord` for the first version.

`AnchorEventPlaceMapPreview.vue`:

- Uses `Map.vue`.
- Accepts normalized place options from one active Anchor Event pool.
- Renders location-pool options as standalone markers.
- Renders route-pool options as markers plus planned/fallback polyline.
- Drives `activeGeometry` from the Inline Place Selector dropdown active item.

Route map visual parity target:

- Route start marker uses the UniApp `map-marker-from.png` visual.
- Route waypoint marker uses the UniApp `map-marker-waypoint.png` visual.
- Route end marker uses the UniApp `map-marker-to.png` visual.
- Route marker size is `24x24` with centered anchor.
- Primary route polyline uses `#85976eFF`, white border, width `7`, and arrow affordance where supported by Tencent JavaScript API GL.
- Secondary planned alternatives use `#dbe7c8FF` with white border.
- Invalid/history/fallback line style uses `#abaca5` with `#5e5f59` border when that state becomes visible in Web flows.

Status:

- Implemented in Slice 6C for route start / waypoint / end icons and route primary / secondary / invalid polyline styles.

`PRRouteMapModal.vue`:

- Opens from PR Facts Card Route `InfoRowAction`.
- Shows route map when Tencent SDK and geometry are available.
- Shows route point list fallback when map rendering is unavailable.

## Verification

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed.
- `pnpm test:unit:frontend`: passed.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- Browser checks use a configured Tencent key for actual marker/polyline rendering.
- Browser checks also cover missing key or SDK-load failure fallback.
- Active dropdown item changes visibly fit location markers and route polylines with padding.
