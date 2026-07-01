# Caocao Driver Movement Mock Research

## Objective

Improve RideHailing Order Detail live map reviewability by making the fake
Caocao provider simulate driver movement along route geometry, while preserving
Caocao API semantics.

This is a separate slice from Driver Card UI corrections.

## Current Trigger

- Manual review still sees provider polyline rendered as a straight line.
- The current fake provider does not simulate continuous driver movement along
  a route.
- The likely first risk is not "fake server should return a Tencent-specific
  shape"; it is whether the adapter path correctly converts Caocao route data
  into Tencent Map input.

## Topology To Verify

```text
Fake Caocao / Real Caocao
  queryDriverPolylineV2.data.steps[].links[].coords
    "latitude,longitude;latitude,longitude"
        |
        v
CaocaoProviderAdapter.parseCaocaoCoordinates
  RideHailingProviderNavigationRoute.polyline[]
    { latitude, longitude }
        |
        v
Trade RideHailing detail projection
  rideHailing.live.navigationRoute.polyline[]
    { latitude, longitude }
        |
        v
RideHailing order map view model
  MapPolyline.path[]
    { lat: latitude, lng: longitude }
        |
        v
Tencent LBS provider
  new TMap.LatLng(lat, lng)
  MultiPolylineGeometry.paths
```

## External Contract Findings

- Caocao `queryDriverPolylineV2` response documents
  `steps[].links[].coords` as
  `"latitude,longitude;latitude,longitude"`.
- Caocao `queryDriverLocationByOrderId` documents driver position as separate
  `longitude`, `latitude`, and `direction`, where `direction` is the vehicle
  heading in degrees, 0 as north and clockwise.
- Tencent JavaScript API GL `MultiPolyline` examples pass route path as an
  array of `new TMap.LatLng(lat, lng)`.

Implication:

- Do not change fake Caocao to emit `longitude,latitude` unless a real Caocao
  payload proves the published docs are wrong.
- The fake server should remain provider-shaped; Tencent-specific conversion
  belongs in frontend map adapter code, not fake provider output.

Sources:

- https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.27queryDriverPolyline.html
- https://open.caocaokeji.cn/zh-cn/docs/caocao_open/travel/2.5queryDriverPosition.html
- https://lbs.qq.com/javascript_gl/guide-polyline.html

## Local Code Findings

- Backend parser currently reads Caocao `coords` as `latitude,longitude` and
  returns `{ latitude, longitude }`. This matches Caocao docs.
- Frontend map view-model converts `{ latitude, longitude }` into
  `{ lat, lng }`.
- Tencent provider converts `{ lat, lng }` into `new TMap.LatLng(lat, lng)`.
  This matches Tencent examples.
- Current fake route has only five points and very short pickup geometry. Even
  when coordinates are valid, the visual bend may be too weak for manual review.
- Driver heading reaches backend provider models as `headingDegrees`, but the
  shared map marker model currently does not expose heading to Tencent marker
  rendering.

## Chain Diagnosis Evidence

- Direct fake server payload for an `ACCEPTED` order:
  - `steps[0].links[0].coords` contains 5 semicolon-separated points.
  - Example shape:
    `30.266592,120.158904;30.266959968,120.159726336;...;30.2688,120.1608`.
- Passing the same fake order through `CaocaoProviderAdapter.queryDriverRoute`
  preserved all 5 points in order and produced `routeKind: PICKUP`.
- Passing the adapter-shaped polyline into
  `buildRideHailingOrderMapViewModel` preserved all 5 points and produced one
  `extraPolylines[0].path` with `{ lat, lng }` points in the same order.
- `RouteMap` appends `extraPolylines` after route/planned polylines; for
  accepted/in-trip states the RideHailing view-model suppresses planned route
  when provider geometry exists.
- `SharedMap` forwards `props.polylines` directly to the Tencent provider.
- Tencent provider uses `geometries[].paths` with `new TMap.LatLng(lat, lng)`,
  matching the Tencent `MultiPolyline` guide.
- Captured `CaocaoProviderAdapter.queryDriverRoute` request body:
  `order_id=...&client_id=...&timestamp=...&sign=...`.
  It does not include `navigation_polyline_type`.

Current evidence does not support "backend adapter drops intermediate points"
or "latitude/longitude are reversed" for the fake payload path.

## Additional Adapter Contract Risk

- Caocao `queryDriverPolyline` docs mark `navigation_polyline_type` as required:
  `1` for pickup route and `3` for dropoff route.
- Current `CaocaoProviderAdapter.queryDriverRoute` only sends `order_id`.
- Current fake server ignores `navigation_polyline_type`, so the tests do not
  guard the real provider request contract.
- The provider port also does not pass local phase or desired route kind into
  `queryDriverRoute`, so the adapter cannot currently choose the required
  route type explicitly.

This is a stronger adapter issue than coordinate order, and should be handled
before or together with richer fake movement.

## Implemented Contract Guardrail

- Provider live route query now carries an explicit route kind:
  - `PICKUP`
  - `DROPOFF`
- Trade projection maps local execution phase to provider route kind:
  - `ACCEPTED` / `ARRIVED_AT_PICKUP` -> `PICKUP`
  - `IN_TRIP` -> `DROPOFF`
  - other phases do not query provider navigation route
- Caocao adapter converts the route kind to provider request contract:
  - `PICKUP` -> `navigation_polyline_type=1`
  - `DROPOFF` -> `navigation_polyline_type=3`
- Fake Caocao route endpoint now validates `navigation_polyline_type`:
  - missing parameter returns a fake Caocao failure response
  - phase/type mismatch returns a fake Caocao failure response
- Tests now guard:
  - multi-link / multi-point Caocao `coords` preservation in the backend
    adapter
  - request body includes the required provider route type
  - fake server rejects missing route type
  - frontend map view-model preserves intermediate provider route points

This does not yet simulate driver movement. It closes the provider-route
contract gap so the next movement slice can build on a faithful fake provider
shape.

## Current Geometry Diagnosis

- The current fake route is not mathematically a two-point straight segment, but
  it is visually weak:
  - accepted route length is about 338m with about 71m max deviation from the
    endpoint chord
  - in-trip route length is about 1.5km with about 244m max deviation
- For pickup review, a short route plus viewport fitting can easily read as a
  straight line even when 5 points are present.
- The fake server also returns a static driver coordinate for a phase. It does
  not return the remaining route from the current driver location as polling
  progresses.

## Test Coverage Gaps

- Backend adapter test uses a two-point `coords` fixture, so it proves basic
  parsing but not multi-link / multi-point preservation.
- Frontend view-model test uses a two-point provider route fixture, so it does
  not guard against intermediate point loss.
- Fake server tests assert route `coords` contains more than two points, but do
  not assert:
  - the exact point order
  - route type request validation
  - driver location progressing across repeated queries
  - returned route being the remaining route from the simulated driver point

## Open Questions For Implementation Slice

1. Is the actual browser receiving the provider polyline path with all expected
   points, or is it collapsed before reaching `RouteMap`?
2. Does Tencent `MultiPolyline` require any additional geometry option, update
   call, or coordinate wrapping beyond `paths: TMap.LatLng[]`?
3. Is the observed straight line from:
   - fake fixture geometry too close to a straight segment
   - adapter path losing intermediate points
   - RouteMap/Tencent layer update behavior
   - map viewport/padding making bend visually hard to see
4. Should driver movement be query-count based, time-based, or explicitly
   admin-controlled?

## Candidate Implementation Models

### A. Realistic Fixture First

- Store pickup and dropoff route fixtures as Caocao-shaped `steps/links/coords`
  payload fragments.
- Simulate movement by keeping an index/progress over fixture points.
- Return only remaining route from current driver point.
- Pros:
  - preserves provider semantics
  - deterministic tests
  - good manual-review visuals
- Cons:
  - needs good fixture data or handcrafted road-like coordinates

### B. Geospatial Library

- Add a dev dependency to fake Caocao server only.
- Candidate libraries:
  - Turf modular packages such as `@turf/along`, `@turf/length`,
    `@turf/bearing`, `@turf/line-slice`
  - `geolib` for distance/bearing/interpolation helpers
- Pros:
  - less hand-rolled geometry math
  - easier heading and distance/progress calculations
- Cons:
  - Turf uses GeoJSON coordinate order `[longitude, latitude]`, which must be
    carefully isolated from Caocao `latitude,longitude`
  - adds package surface to a fake-server-only tool

### C. Small Local Geometry Helper

- Keep a deterministic polyline fixture and implement minimal segment length,
  point-at-distance, remaining-route, and bearing helpers locally.
- Pros:
  - no new dependency
  - enough for fake server
- Cons:
  - less mature than library logic
  - must keep helper narrow and well-tested

## Segment Plan: Driver Movement And Heading Marker

Chosen implementation model:

- Use realistic-enough deterministic fake route fixtures plus a small local
  geometry helper inside `packages/fake-caocao-server`.
- Do not add Turf/geolib yet. Their GeoJSON `[longitude, latitude]` convention
  would add a second coordinate convention to a provider fake whose public
  contract is Caocao `latitude,longitude`.

Backend/fake-provider behavior:

- Keep fake Caocao API provider-shaped.
- For pickup phases:
  - simulate driver progress from an off-origin start point to order origin
  - return driver location at the current simulated point
  - return route polyline as the remaining pickup route from current driver
    point to origin
- For in-trip phase:
  - simulate progress from origin to destination
  - return driver location at the current simulated point
  - return route polyline as the remaining dropoff route from current driver
    point to destination
- For arrived-at-pickup:
  - driver location stays at origin
  - route polyline stays empty for frontend marker-only display
- Query progress should be deterministic and review-friendly:
  - repeated polling advances the simulated point gradually
  - phase transitions reset the movement progress for that phase
  - route query and driver-location query should agree on the same simulated
    point during one polling cycle as much as the current fake architecture
    allows

Frontend marker behavior:

- Extend shared map marker model with optional `headingDegrees`.
- RideHailing map view-model passes provider `headingDegrees` into the driver
  marker.
- Tencent LBS provider renders `routeDriver` marker with heading-aware
  `MarkerStyle.rotate`.
- Tencent `rotate` is counter-clockwise-positive; Caocao heading is
  north-clockwise-positive. Because the car asset points north/up, convert with:
  `(360 - headingDegrees) % 360`.
- Keep heading support generic in shared map types; only the Tencent provider
  and RideHailing driver marker consume it in this segment.

Test expectations:

- Fake server:
  - repeated driver-location/route queries progress along the fake route
  - remaining route starts at or near the current driver point
  - heading changes according to the route segment
- Frontend view-model:
  - driver marker contains the backend heading
- Tencent provider:
  - heading-aware route-driver styles are generated with converted rotation
    rather than losing the existing icon style

## Segment Implementation Result

- Added a narrow fake Caocao movement helper:
  - haversine distance
  - Caocao heading convention: north as `0`, clockwise positive
  - remaining route from distance-along-polyline
  - movement snapshot with current coordinate, heading, and remaining route
- Fake Caocao state now uses `queryCount` as a movement tick:
  - phase changes reset movement tick
  - successful driver-route queries advance movement for `ACCEPTED` and
    `IN_TRIP`
- Fake Caocao live payloads now agree on simulated movement:
  - driver location uses the current simulated point
  - driver route starts from that same point
  - route response returns remaining pickup/dropoff geometry
  - `ARRIVED_AT_PICKUP` remains marker-only from the frontend perspective
- Shared frontend map marker model now carries optional `headingDegrees`.
- RideHailing order map view-model passes provider heading into the driver
  marker.
- Tencent LBS provider now creates heading-aware `routeDriver` marker styles:
  - preserves the car icon style
  - converts Caocao clockwise heading to Tencent counter-clockwise `rotate`
  - keeps heading support generic and optional for other marker types

Verification:

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
- `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- `pnpm exec biome check ...` for touched fake-server/frontend files

## Initial Recommendation

Start implementation with a diagnostic guardrail before enhancing movement:

1. Add/adjust adapter tests with a multi-link, visibly bent Caocao `coords`
   fixture and assert every point survives parsing in order.
2. Add/adjust frontend map view-model tests to assert provider polyline points
   survive into `MapPolyline.path`.
3. Fix the provider route-query contract so the route kind required by Caocao
   can be supplied explicitly, and make fake server validate it.
4. If conversion is correct, improve fake movement using either:
   - fixture-first route data plus a small local helper, or
   - Turf modular packages if the helper starts growing beyond simple
     point-at-distance and bearing calculations.
5. Extend shared marker heading only after route path correctness is proven.

Status:

- Steps 1-3 are complete and verified.
- Steps 4-5 are complete and verified in focused automated tests.
- Remaining check is manual browser review of the visual movement cadence and
  vehicle rotation.

## Manual Review Finding: Movement Still Not Visible

Observed after implementation:

- browser still renders the route like a straight line
- vehicle marker does not visibly move

Current diagnosis:

- `useCommerceOrderDetail` has no `refetchInterval`, so the Order Detail Page
  does not automatically reload live provider geometry. The fake movement tick
  can advance on route query, but the browser will not see movement without
  repeated order-detail requests.
- Current fake route source is still a handcrafted 7-point curve. It is
  provider-shaped, but not road-shaped. Tuning `bendRatio` is not a maintainable
  path to realistic map review.
- The more complete model should reuse Tencent LBS in two different places:
  - Tencent WebService Direction API in fake Caocao to generate realistic
    provider-shaped route fixtures/polylines
  - Tencent JavaScript GL marker movement (`moveAlong`) in the frontend map
    provider if smooth marker animation between polling samples is needed

Recommended next segment:

1. Add lifecycle-aware polling for active RideHailing Order Detail phases.
2. Replace handcrafted fake route geometry with cached Tencent driving-route
   plans, converted back into Caocao `latitude,longitude` `coords` payloads.
3. Keep a deterministic fallback fixture when the Tencent key/network is absent
   so local tests and offline development remain stable.
4. Consider Tencent `MultiMarker.moveAlong` after route generation and polling
   are correct; it improves visual smoothness but does not fix route realism by
   itself.

## Follow-up Implementation Result: Visible Movement Foundations

- Added lifecycle-aware Order Detail polling:
  - active RideHailing phases poll every 2 seconds
  - terminal/non-RideHailing details do not poll
  - this fixes the first visibility gap where fake movement advanced only when
    the browser reloaded order detail
- Added fake Caocao Tencent route-planning support:
  - fake server bin reads Tencent LBS keys from `apps/frontend/.env` at runtime
    without committing or logging the secret
  - route planner calls Tencent Direction WebService and parses compressed
    route polyline
  - planner output is converted back into Caocao-shaped
    `{ latitude, longitude }` and `coords` payloads
  - planned routes are cached by provider order and route kind
  - tests still default to no-network deterministic fallback
- Kept deterministic fallback route behavior:
  - local tests do not require Tencent network/key
  - runtime falls back to the existing generated route when planning fails
- Added guardrail tests:
  - Tencent route URL / polyline parser / planner
  - fake server planner cache and route movement behavior
  - active phase polling predicate

Verification:

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
- `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/domains/commerce/queries/useCommerce.test.ts apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
- `pnpm exec biome check ...` for touched fake-server/frontend files

Remaining visual review:

- Restart fake Caocao dev server so the bin loads the new env/planner code.
- Confirm Tencent route planning succeeds in runtime network diagnostics.
- Confirm marker movement cadence feels acceptable; if motion still appears
  jumpy, add frontend Tencent `MultiMarker.moveAlong` as a separate smoothing
  segment.

## Follow-up Implementation Result: Tencent Marker Smoothing

- Added Tencent `MultiMarker.moveAlong` support in the shared Tencent map
  provider.
- Only `routeDriver` marker coordinate changes animate; route start/end/waypoint
  markers still update directly.
- The provider keeps the previous driver marker target position and, when a new
  polling sample arrives, renders the marker at the previous point before
  moving it to the new point.
- Route driver marker style now uses `faceTo: "map"` so Tencent
  `autoRotation` can keep the vehicle facing along the movement path.
- Existing heading-specific static rotation is retained for initial/non-moving
  marker display.

Verification:

- `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts apps/frontend/src/domains/commerce/queries/useCommerce.test.ts apps/frontend/src/domains/commerce/ui/order-detail/ride-hailing-order-map-view-model.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts apps/frontend/src/shared/map/tencent/types.ts`

Remaining visual review:

- Confirm Tencent marker animation is active in a browser with a real Tencent
  map instance.
- If Tencent `moveAlong` conflicts with frequent geometry refreshes, keep route
  generation/polling and adjust animation duration or switch to a lower-level
  custom marker animation.

## Follow-up Implementation Result: Movement Speed Calibration

- Manual review found the marker moved correctly but too quickly.
- Root cause:
  fake movement advanced by a fixed route ratio per provider route query, so
  movement speed depended on route length and felt unrealistic.
- Changed fake movement to advance by distance:
  - distance = speed kph * polling interval * mock time scale * query tick
  - pickup speed starts at `28 kph`
  - in-trip speed starts at `36 kph`
  - mock time scale starts at `4x`
  - progress is capped near the destination so the vehicle does not overshoot
- Adjusted Tencent `moveAlong` duration to `1900ms`, close to the 2s active
  Order Detail polling interval, to reduce visible stop/start gaps.

Verification:

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
- `pnpm exec vitest run --config vitest.config.ts --project frontend-unit apps/frontend/src/shared/map/tencent/tencent-lbs-provider.test.ts`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm exec biome check packages/fake-caocao-server/src/movement.ts packages/fake-caocao-server/src/movement.test.ts packages/fake-caocao-server/src/routes.ts apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
