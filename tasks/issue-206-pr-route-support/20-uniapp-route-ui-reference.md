# Uniapp Route UI Reference

Reference repository: `F:\CODING\Project\Anana\Application\uniapp2`

## Files Read

Route editor:

- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeEditor\routeEditor.vue`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeEditor\routeEditor.ts`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeEditor\routeEditor.scss`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeEditor\routeEditor.md`

Immersive flow:

- `F:\CODING\Project\Anana\Application\uniapp2\src\pages\partner_request\create_trip\create_trip.vue`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\partner_request\PRImmersiveForm\PRImmersiveForm.vue`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\partner_request\PRImmersiveForm\PRImmersiveForm.ts`

Map display:

- `F:\CODING\Project\Anana\Application\uniapp2\src\components\common\routeMap\routeMap.vue`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\common\routeMap\types.ts`
- `F:\CODING\Project\Anana\Application\uniapp2\src\utils\lbs\index.js`
- `F:\CODING\Project\Anana\Application\uniapp2\src\utils\lbs\types.ts`

Route model:

- `F:\CODING\Project\Anana\Application\uniapp2\src\business\base\route.ts`
- `F:\CODING\Project\Anana\Application\uniapp2\src\store\base\location.ts`

Location picker:

- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\locationPicker\usePickLocation.ts`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\locationPicker\locationPicker.vue`
- `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeItemLocationEditor\routeItemLocationEditor.vue`

## UI Ideas Worth Porting

- `RouteEditor` has two variants:
  - inline/normal: compact vertical list with icon actions for route plan and waypoint add.
  - immersive: larger step-like route points with start, waypoint, and arrival roles.
- Route points have semantic roles:
  - departure at index `0`
  - arrival at last index
  - waypoints in between
- Waypoints can be inserted before arrival and removed independently.
- The immersive editor emits `complete` after all route points have locations, then the parent form can advance the next step.
- Route editing separates point location from optional point datetime; issue 206 route schema currently only needs location-like point data.
- The map layer renders markers and polylines together, and keeps map viewport aligned with route points.
- Marker identity is deterministic by route index, which is useful for edit targeting.

## Platform-Specific Pieces

These are reference-only for mvp-HA web frontend:

- `plugin://chooseLocation` and `plugin://routePlan` are Weixin mini-program plugin routes.
- `uni.requirePlugin`, `uni.createMapContext`, `addMarkers`, `removeMarkers`, and `includePoints` are UniApp/mini-program APIs.
- The `routePlan` plugin path supports start/end navigation and has a waypoint limitation branch in the uniapp UI.

## Route Data In Uniapp

Uniapp route model:

- `Location`: `{ id, address, friendly_address, lat, lng }`
- `RouteItem`: `{ datetime, location }`
- `Route`: ordered `RouteItem[]` with `startItem`, `waypoints`, and `endItem`
- `RouteForm`: defaults to departure + arrival and supports `addWaypoint`

Issue 206 route model differs:

- Each point stores coordinates directly per coordinate system: `wgs84`, `bd09`, `gcj02`.
- Each point stores display labels directly: `name`, `full_address`.
- There is no separate location store in the issue schema.

## Tencent Web References

Official Tencent docs consulted:

- JavaScript API GL overview: https://lbs.qq.com/webApi/javascriptGL/glGuide/glOverview
- JavaScript API GL `MultiPolyline`: https://lbs.qq.com/webApi/javascriptGL/glGuide/glPolyline
- Direction WebService route planning: https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute
- WebServiceAPI key browser-domain whitelist FAQ: https://lbs.qq.com/faq/serverFaq/webServiceKey

Relevant facts:

- Tencent JavaScript API GL is the web map rendering base for point, line, and route display.
- Tencent JavaScript API GL draws point markers with `MultiMarker`.
- Tencent JavaScript API GL draws route lines with `MultiPolyline`.
- `MultiPolyline` uses `TMap.LatLng` paths.
- Direction WebService supports driving route planning with `from`, `to`, and `waypoints` parameters in `lat,lng` order.
- Direction WebService returns compressed `polyline` points that must be decompressed before drawing.
- Tencent documents browser-side JSONP WebService calls through domain whitelist key controls, so first-version frontend direct Direction calls are acceptable with configured domain restrictions.

## Porting Notes

- MVP web map renders route markers and requests planned-route polyline from Tencent Direction WebService; direct frontend calls are acceptable for the first version.
- Straight point-to-point polyline remains a graceful fallback when planned-route calculation fails.
- Wrap Tencent JavaScript API GL behind a generic `Map.vue` component/interface that accepts typed markers, polylines, active geometry, and fit padding instead of exposing raw SDK objects to PR/Event components.
- Map components must support a viewport-fit command for a marker or polyline bounds, with padding, so dropdown/carousel active item changes can keep selected geometry centered and fully visible.
- The route editor should own ordered point editing and completion status; PR form should own place-mode selection and submission.
- The route map display should accept a pure route value and avoid PR form state coupling.
