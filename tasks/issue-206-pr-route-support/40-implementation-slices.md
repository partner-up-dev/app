# Implementation Slices

## Slice 0 Product And Contract Solidification

Status: implemented on 2026-05-16.

Purpose:

- Promote route place-mode truth into PRD and Product TDD before code mutation.

Edits:

- `docs/10-prd/behavior/capabilities.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/system-state-and-authority.md`

Exit:

- PR route mode has explicit product semantics.
- Cross-unit payload fields and owner boundaries are explicit.
- Open questions have human decisions or scoped deferrals.

Implementation result:

- Durable PRD behavior now describes location mode and route mode as PR place modes.
- Product TDD now records `PartnerRequest.route`, route-mode `location = null`, read-model payloads, and owner boundaries.

## Slice 1 Backend Data Model And Invariants

Status: implemented on 2026-05-16.

Purpose:

- Add persistent `route` support and enforce place-mode shape.

Edits:

- `apps/backend/src/entities/partner-request.ts`
- next Drizzle migration under `apps/backend/drizzle/`
- `apps/backend/src/repositories/PartnerRequestRepository.ts`
- backend local tests for schema/invariant helpers

Implementation notes:

- Add `route` JSONB nullable column.
- Add `prRoutePointSchema` and `prRouteSchema`.
- Add shared helper for `assertPRPlaceModeValid`.
- In route mode, persist `location` as `null` so existing location-driven services short-circuit through their current null-location paths.
- Update insert/select schemas.

Exit:

- Backend typecheck and schema tests prove route values are accepted and invalid place combinations are rejected.

Implementation result:

- Added nullable `partner_requests.route` JSONB column in `apps/backend/drizzle/0056_pr_route_place_mode.sql`.
- Added route point and route schemas in `apps/backend/src/entities/partner-request.ts`.
- Added `pr-place-mode.service.ts` for route summary, place display name, mutual-exclusion assertion, and persistence normalization.
- Repository create/update paths now carry `route`.

## Slice 2 Backend Read/Write And Share Metadata

Status: implemented on 2026-05-16.

Purpose:

- Carry route through create/update/read and make route affect identity/share.

Edits:

- `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts`
- `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts`
- `apps/backend/src/domains/pr-core/use-cases/update-pr-content.ts`
- `apps/backend/src/domains/pr/read-models/public-pr-view.service.ts`
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts`
- `apps/backend/src/domains/pr/sharing/pr-share-metadata.service.ts`
- `apps/backend/src/domains/pr/sharing/pr-share-metadata.service.test.ts`

Implementation notes:

- Keep natural-language create in existing place behavior for the first version.
- Clear poster caches when route changes.
- Use a route display helper from backend domain code.
- The compact route title helper truncates `route[0].name` and `route[-1].name` independently, joins them with `~`, and keeps the total summary within 16 characters.

Exit:

- Existing location-mode tests pass.
- New route-mode tests prove title/share fallback and revision changes.

Implementation result:

- Structured create, natural-language create, and content update normalize PR place mode before availability checks and persistence.
- Route-mode requests persist `location = null`, which drives the existing POI availability short-circuit through the null-location path.
- PR detail, search, Anchor Event PR summaries, Admin PR workspace summaries, public PR responses, and share context now expose `route` and route-derived `placeDisplayName`.
- Canonical share metadata uses route summary after explicit title and includes route in revision hashing.
- Natural-language route parsing remains deferred; the current NL path carries the normalized fields returned by the existing parser.

## Slice 3 Route-Mode Domain Policy Sweep

Status: implemented on 2026-05-16.

Purpose:

- Resolve non-display domain behavior that currently depends on single `location`.

Surfaces:

- POI availability.
- Meeting-point fallback.
- Booking support resource matching.
- Waitlist alternative matching.
- Notification copy that includes location.

Implementation notes:

- First route-capable version uses explicit policies:
  - route mode sets `location` to `null`.
  - POI availability remains location-driven and short-circuits on `null` location.
  - meeting-point resolution keeps PR-specific guidance, then stops automatic fallbacks on `null` location.
  - event-wide support resources still materialize; location-scoped support resources require a non-empty matching location.
  - route-mode waitlist alternative reminders are disabled until a route matching rule exists.
  - Anchor Event Form Mode recommendation and full-PR expansion only consume event-scoped location PRs.
  - route-mode activity start reminder copy uses route summary as the location field value.

Exit:

- Domain policy is explicit in code and Product TDD.
- Tests cover route-mode behavior for each touched service.

Implementation result:

- POI availability null-location behavior is covered by unit tests.
- Meeting-point resolution now returns PR-specific meeting point for route mode and skips automatic Anchor Event / POI fallback when location is null.
- Waitlist alternative dispatch now treats missing source or candidate location as a mismatch.
- Anchor Event Form Mode recommendation filters out route-mode PRs; full-PR expansion ignores route-mode source PRs.
- Activity-start notification location copy uses backend `resolvePRPlaceDisplayName`, so route mode can show route summary.

## Slice 4 Anchor Event Route Pool And Event-Assisted Create

Status: implemented on 2026-05-16.

Purpose:

- Add event-owned route pool and route-aware event-assisted create.

Edits:

- `apps/backend/src/entities/anchor-event.ts`
- next Drizzle migration under `apps/backend/drizzle/`
- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`
- `apps/backend/src/domains/anchor-event/use-cases/list-events.ts`
- event-assisted create query/use-case surfaces
- Admin Anchor Event management surfaces for pool editing

Implementation notes:

- Add `routePool` with entries shaped as stable event route id plus PR route payload.
- Enforce Anchor Event `locationPool` / `routePool` mutual exclusion.
- Route-pool event-assisted create submits `route` and `location: null`.
- Location-pool event-assisted create keeps existing location behavior.
- Same event type can still have manually created PRs in either place mode outside one Anchor Event's assisted pool.

Exit:

- Backend tests prove mutual exclusion and route-pool create payload assembly.
- Admin can maintain route pool without corrupting existing location-pool events.

Implementation result:

- Added `anchor_events.route_pool` with event-local `{ id, route }` entries and a database place-pool mutual-exclusion check.
- Added Anchor Event route-pool schema, normalization, route-entry lookup, and route equality helpers.
- Admin Anchor Event create/update accepts `routePool`, returns it in workspace reads, and rejects events that contain both location and route pool entries.
- Public Anchor Event list, detail, and Form Mode bootstrap responses expose route-pool data; event detail create windows include route options.
- Event-assisted create accepts `routePoolEntryId` and resolves route-pool selections into `route` plus `location: null`; location-pool assisted create keeps existing location-mode behavior.

## Slice 5 Frontend Model And Editor Components

Status: implemented on 2026-05-16.

Purpose:

- Add reusable route editing primitives without changing page workflows yet.

Edits:

- `apps/frontend/src/shared/ui/controls/SegmentedControl.vue`
- `apps/frontend/src/shared/map/Map.vue`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-loader.ts`
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
- `apps/frontend/src/shared/map/tencent/types.ts`
- `apps/frontend/src/domains/pr/model/types.ts`
- `apps/frontend/src/domains/pr/model/pr-route.ts`
- `apps/frontend/src/domains/pr/ui/forms/PRRouteEditor.vue`
- `apps/frontend/src/domains/pr/ui/forms/PRRoutePointRow.vue`
- `apps/frontend/src/domains/pr/ui/display/PRRouteMap.vue`
- locale schema and Chinese copy

Implementation notes:

- Keep helpers pure and unit-testable.
- Build `SegmentedControl.vue` as a generic shared component; PR place mode is one consumer.
- Build `Map.vue` as the product-facing shared map component with typed props/events for markers, polylines, active geometry, and fit padding.
- Keep Tencent JavaScript API GL isolated in the Tencent provider layer.
- The map provider owns SDK loading, map lifecycle, overlay reconciliation, and viewport fitting.
- Inline variant fits existing `PRForm`.
- Immersive variant can later be used by a richer create flow.

Exit:

- Frontend unit tests cover route helper behavior.
- Route editor renders stable point roles and emits typed route values.
- Shared segmented control and `Map.vue` can be used without importing PR-specific code.

Implementation result:

- Added shared `SegmentedControl.vue` under `shared/ui/controls`.
- Added shared map types, `Map.vue`, Tencent SDK loader, and Tencent provider under `shared/map`.
- Added PR route model helpers and unit tests for summary, clone/normalize, point role mutation, coordinate preference, and map projection.
- Added `PRRouteEditor.vue`, `PRRoutePointRow.vue`, and `PRRouteMap.vue` as reusable PR-domain components.
- Added route editor/map Chinese copy, locale schema fields, and `VITE_TENCENT_LBS_JS_KEY` typing.
- Updated frontend shared primitive documentation for the segmented control and map wrapper.

Correction note:

- Route model and editor abstractions need a generic route boundary. The current PR-prefixed frontend helpers/components should be moved before Anchor Event and detail UI slices expand.
- RouteEditor UI should be revised to match UniApp normal/immersive route item rows.
- Route point location selection should call a generic LocationPicker flow instead of exposing coordinate fields in the main RouteEditor surface.

## Slice 6 Frontend Create/Edit/Admin Integration

Status: implemented on 2026-05-16.

Purpose:

- Wire place-mode selection into user and admin PR forms.

Edits:

- `apps/frontend/src/lib/validation.ts`
- `apps/frontend/src/domains/pr/ui/forms/PRForm.vue`
- `apps/frontend/src/domains/pr/use-cases/usePRCreateFlow.ts`
- `apps/frontend/src/domains/pr/ui/modals/EditPRContentModal.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRCreatorHeaderActions.vue`
- Admin PR management queries/use-cases/UI sections

Implementation notes:

- Use the shared segmented control for place mode.
- Submit inactive mode as cleared.
- Add stable `data-testid` nodes for route add/remove/edit and place-mode toggle.

Exit:

- `/pr/new` creates route-mode PR through typed RPC.
- Creator edit preserves route-mode values and allows switching modes.
- Admin create/edit can manage route-mode values.

Implementation result:

- Admin PR create/update schemas and use-cases now accept `route`, use PR place-mode normalization, and carry route through typed RPC.
- `PRForm.vue` uses shared `PRPlaceModeField.vue` with `SegmentedControl.vue`, location input, and `PRRouteEditor.vue`.
- User create/edit submit helpers clear inactive place mode before RPC submission.
- Admin PR Basic view uses the same place-mode field, validates location-mode and route-mode drafts, and shows backend `placeDisplayName` in PR selection and delete labels.
- Frontend validation now reports route min-points, point-name, and coordinate issues before submission.
- Stable `data-testid` nodes exist for place-mode toggles, route editor, route point inputs, add waypoint, and remove waypoint actions.

Correction note:

- `PRPlaceModeField.vue` should consume generic `RouteEditor.vue` after the route abstraction correction.
- Route point editing should open generic LocationPicker and then map the picked location into the route payload before submission.

## Slice 6A Frontend Route Boundary And LocationPicker Correction

Status: implemented on 2026-05-16.

Purpose:

- Correct frontend route abstraction and RouteEditor UI before expanding Anchor Event and PR detail route surfaces.

Edits:

- `apps/frontend/src/domains/route/model/route.ts`
- `apps/frontend/src/domains/route/ui/RouteEditor.vue`
- `apps/frontend/src/domains/route/ui/RouteItemRow.vue`
- `apps/frontend/src/domains/route/ui/RouteMap.vue`
- `apps/frontend/src/pages/LocationPickerPage.vue`
- `apps/frontend/src/domains/location/model/location-picker.ts`
- `apps/frontend/src/domains/location/model/location-picker-session.ts`
- `apps/frontend/src/domains/location/ui/LocationPickerPanel.vue`
- `apps/frontend/src/domains/location/ui/LocationPickerModal.vue`
- PR wrappers that map generic route/location data to `PartnerRequest.route`

Implementation notes:

- Route is generic; Route PR is one consumer.
- Preserve backend payload shape `{ wgs84, bd09, gcj02, name, full_address }`.
- Main RouteEditor UI follows UniApp `routeEditor.vue`:
  - normal mode uses compact rows and icon actions.
  - immersive mode uses staged departure/waypoint/arrival blocks and bottom actions.
  - waypoint insertion stays before arrival.
  - waypoint removal stays waypoint-only.
- RouteEditor row click opens LocationPicker for the selected route point.
- LocationPicker is generic and returns `PickedLocation`.
- First LocationPicker provider uses Tencent `componentPicker`.
- Tencent `componentPicker` iframe/page-return payload maps to:
  - `name = poiname`
  - `address = poiaddress`
  - `cityName = cityname`
  - `gcj02 = [latlng.lat, latlng.lng]`
- Tencent `componentMarker` remains display-oriented and can support preview/marker links.
- Keep current typed RPC and route-mode submit normalization from Slice 6.

Exit:

- PR create/edit and Admin PR create/edit consume generic RouteEditor.
- RouteEditor main UI matches UniApp normal-mode interaction for the current form surfaces.
- Route item click opens LocationPicker and returns a valid route point.
- Existing route helper tests move to the generic route module and still pass.
- No PR-prefixed route component remains as a generic abstraction owner.

Verification:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 3 files / 9 tests.
- `pnpm test:unit:frontend`: passed, 7 files / 16 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser smoke on `http://127.0.0.1:5173/pr/new?mode=form`: route mode shows compact generic `RouteEditor` rows; clicking the first route item opens `LocationPicker`; missing Tencent key fallback keeps confirm disabled.

Correction note from discussion on 2026-05-16:

- Slice 6A corrected ownership but its RouteEditor visual implementation remains too far from `F:\CODING\Project\Anana\Application\uniapp2\src\components\base\routeEditor\routeEditor.vue`.
- The next frontend correction should target one-to-one Web reproduction of the UniApp `routeEditor.vue` + `routeEditor.scss` interaction shape:
  - normal mode root is a horizontal `route-editor--normal` layout.
  - normal mode left `operations` column contains map and plus icon-only actions.
  - normal mode right `content` column contains route item wrappers.
  - each normal route item uses a surface-container single-line row with ellipsized location text and optional clock icon.
  - waypoint remove is an icon-only minus-circle action beside the route item row.
  - immersive mode uses the UniApp staged departure / waypoint / arrival blocks, headline/title typography, secondary-colored location text, tertiary action icon, and bottom operation row.
  - Route planning action opens route map/planning when possible; location picking still opens generic LocationPicker.

## Slice 6B RouteEditor UniApp-Parity UI Correction

Status: implemented on 2026-05-16.

Purpose:

- Rework Web `RouteEditor` markup and styles to match the UniApp RouteEditor UI as closely as the Web platform allows.

Edits:

- `apps/frontend/src/domains/route/ui/RouteEditor.vue`
- `apps/frontend/src/domains/route/ui/RouteItemRow.vue`, or replace it with normal/immersive internal row markup if one-to-one structure is clearer.
- `apps/frontend/src/domains/route/ui/RouteMap.vue` only if the map/planning action needs a modal/drawer target.
- route/location copy in locale files if required for UniApp-equivalent labels.
- task packet verification notes.

Implementation notes:

- Keep generic Route and LocationPicker ownership from Slice 6A.
- Preserve waypoint insertion before arrival and waypoint-only removal.
- Preserve route item click -> LocationPicker.
- Add `disableDatetime`, `max`, `useDepDatetimeEditor`, and `complete`/`editDepTime` hooks where the Web API needs them to mirror the UniApp surface.
- Use Web equivalents for UniApp `view`, `text`, `PuButton`, and `PuDrawer` while matching layout, spacing, icon-only affordances, typography, and row rhythm.
- Use the configured Tencent LBS key to verify LocationPicker iframe behavior after the UI rewrite.

Exit:

- Browser screenshot/DOM inspection of `/pr/new?mode=form` route mode shows normal mode matching the UniApp normal layout: left operations column, right content column, single-line route item rows, clock action slot, plus/map actions, and waypoint minus-circle beside rows.
- Immersive variant renders the staged departure/waypoint/arrival layout matching the UniApp structure.
- Existing route and PR payload tests pass.
- Frontend build and token lint pass.

Implementation result:

- `RouteEditor.vue` now uses the UniApp-equivalent `route-editor--normal` shell: left `operations` icon column and right `content` column of single-line route item rows.
- `RouteItemRow.vue` now owns inline and immersive row variants, including departure/waypoint/arrival titles, placeholders, optional datetime actions, and waypoint-only remove actions.
- `RouteEditor.vue` exposes `max`, `disableDatetime`, `useDepDatetimeEditor`, `change`, `complete`, `editDatetime`, and `editDepTime` hooks for UniApp-surface parity while staying generic Route-owned UI.
- Route map/planning action opens a route map modal in the Web implementation.
- Route point click still opens generic `LocationPickerModal.vue`; the configured Tencent `componentPicker` iframe is used when `VITE_TENCENT_LBS_JS_KEY` is present.

Verification:

- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 3 files / 9 tests.
- `pnpm test:unit:frontend`: passed, 7 files / 16 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Browser DOM inspection on `http://127.0.0.1:5173/pr/new?mode=form`: route mode shows map and plus icon actions, departure/arrival placeholder rows, route map modal fallback, and first route point opens Tencent `componentPicker` iframe with the configured key.

Correction note from discussion on 2026-05-16:

- Current Web `RouteMap.vue` still falls back to route-point straight-line polylines when no planned polyline is passed.
- UniApp `routeMap.vue` plans routes through `QQMapSDK.direction({ mode: driving })`, stores `res.result.routes`, and renders `decompressPolyline(route.polyline)` as the map polyline.
- UniApp route marker visuals use `/static/icon/map-marker-from.png`, `/static/icon/map-marker-waypoint.png`, and `/static/icon/map-marker-to.png` with centered `24x24` markers.
- UniApp route polyline visuals use arrow line, width `7`, primary color `#85976eFF`, secondary color `#dbe7c8FF`, invalid color `#abaca5`, and white primary/secondary border.

## Slice 6C RouteMap Driving Planning And UniApp Map Style

Status: implemented on 2026-05-16.

Purpose:

- Align Web route map rendering with UniApp routeMap planning and visual style before Anchor Event route cards and PR route facts reuse the same component.

Edits:

- `apps/frontend/src/domains/route/model/route-planning.ts` or equivalent route-owned planning helper.
- `apps/frontend/src/domains/route/model/route-planning.test.ts`.
- `apps/frontend/src/domains/route/ui/RouteMap.vue`.
- `apps/frontend/src/shared/map/types.ts`.
- `apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`.
- `apps/frontend/src/shared/map/tencent/types.ts`.
- marker assets under `apps/frontend/public/` or generated equivalent data URLs if asset copying is the chosen Web path.
- route map locale copy for planning loading/failure if needed.
- task packet verification notes.

Implementation notes:

- Use Tencent Direction WebService from the frontend with the configured WebService-capable key decision already accepted for issue 206.
- First-version mode is driving.
- Build request from route point GCJ-02 coordinates:
  - `from = departure.lat,departure.lng`
  - `to = arrival.lat,arrival.lng`
  - `waypoints = waypoint.lat,waypoint.lng;...`
- Decode Tencent compressed polyline with the UniApp-compatible algorithm:
  - from index `2`, accumulate `raw[i] = raw[i - 2] + raw[i] / 1_000_000`
  - convert pairs into `{ lat, lng }`
- Render planned route polylines from Direction result when planning succeeds.
- Keep point-list fallback and straight-line fallback only for missing coordinates or planning failure.
- Extend shared map marker styling so route markers can use start / waypoint / end icon styles instead of generic pin colors.
- Extend shared map polyline styling so route planned polylines can use UniApp primary/secondary/invalid colors, width, border, and arrow affordance where Tencent JavaScript API GL supports it.
- Preserve the no planned-polyline cache decision for the first version.

Exit:

- `RouteMap.vue` can plan and render driving-route polyline from Tencent Direction WebService for a complete route.
- Planned route display uses UniApp-equivalent marker icons and polyline colors/width/border.
- Planning failure still renders a readable fallback without blocking RouteEditor or PR forms.
- Direct WebService smoke verifies planned polyline data; browser visual verification of a full coordinate route is deferred until a seedable route fixture or Anchor Event route pool UI exists.

Implementation result:

- Added route-owned planning helper `apps/frontend/src/domains/route/model/route-planning.ts`.
- Added Tencent Direction WebService URL building, driving-route response parsing, and UniApp-compatible compressed polyline decoding.
- `RouteMap.vue` now plans driving routes directly from route point GCJ-02 coordinates when a complete route and Tencent WebService key are available.
- `RouteMap.vue` renders planned route polylines before the straight-line fallback.
- `RouteMap.vue` uses planned-route start/end/waypoint coordinates for route markers when a planning result is available.
- Shared map types and Tencent provider now support route marker icon styles and UniApp-equivalent route polyline tones.
- Copied UniApp route marker assets into `apps/frontend/public/route-map/`.
- Added `VITE_TENCENT_LBS_WEB_SERVICE_KEY` as an optional frontend env override, falling back to `VITE_TENCENT_LBS_JS_KEY`.

Verification:

- Official Tencent Direction WebService route docs read on 2026-05-16: https://lbs.qq.com/service/webService/webServiceGuide/webServiceRoute.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/route/model/route-planning.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed, 4 files / 13 tests.
- `pnpm test:unit:frontend`: passed, 8 files / 20 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed.
- `git diff --check`: passed.
- Tencent Direction WebService smoke using local frontend env key: `status=0`, `routes=1`, first route compressed polyline length `414`.
- Browser smoke on `http://127.0.0.1:5173/pr/new?mode=form`: route mode opens the RouteMap modal and preserves the incomplete-coordinate fallback.

## Slice 7 Anchor Event Place Selectors

Purpose:

- Upgrade Anchor Event event-assisted creation UI from location-only controls to place controls.

Edits:

- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeLocationControl.vue`
- new `AnchorEventCarouselPlaceSelector.vue`
- new `AnchorEventInlinePlaceSelector.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
- `apps/frontend/src/domains/event/ui/primitives/EventPRCreateCard.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue`
- `apps/frontend/src/domains/event/use-cases/useEventAssistedPRCreateFlow.ts`

Implementation notes:

- POI cards keep gallery -> name fallback.
- Route cards render map preview with markers and planned/fallback polyline.
- Route card title uses `route[0].name~route[-1].name`.
- Card/List creation card uses map preview plus dropdown over normalized place options.
- The inline dropdown can include both location and route options.
- Location options render as standalone markers on the map preview.
- Route options render route markers plus planned/fallback polyline.
- Dropdown active item changes fit the map viewport to the active marker or route bounds, centered and fully visible with padding.

Exit:

- `/e/:eventId` Form Mode can select a route place and create a route PR.
- Card/List creation controls can select a route place and create a route PR.
- Card/List map preview follows dropdown active item changes for both location and route options.

## Slice 8 PR Detail, Preview, And Share UX

Purpose:

- Route-mode PRs read coherently across user-facing surfaces.

Edits:

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
- `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.vue`
- `apps/frontend/src/domains/pr/use-cases/usePRDetailHead.ts`
- `apps/frontend/src/domains/pr/use-cases/usePRRouteShareDescriptor.ts`
- share poster templates if they render location text locally

Implementation notes:

- Prefer backend `share.canonical` and `core.placeDisplayName`.
- Facts card shows Route as a separate row from Location.
- Interactive Facts Card Route row uses the existing right-action row pattern and opens a route map modal.
- Route map modal shows markers and planned/fallback polyline, with point-list fallback.
- Map display requests planned-route polyline from Tencent Direction WebService and preserves readable route facts when Tencent SDK or planning is unavailable.
- First-version Direction WebService calls may be direct frontend calls with WebServiceAPI browser domain whitelist key controls; backend proxy is optional future governance work.
- Planned-route polyline is computed on demand; the first version keeps no planned-polyline cache.

Exit:

- Browser verification proves route title, facts, preview, and share descriptor are coherent.

## Slice 9 Scenario Coverage

Purpose:

- Prove the cross-unit route journey.

Tests:

- Backend scenario: create route-mode PR, read detail, update route, ensure location stays clear.
- System scenario: create route PR through `/pr/new`, land on `/pr/:id`, observe route facts and share title.
- System scenario: create route PR from Anchor Event Form Mode route pool.
- System scenario: create route PR from Anchor Event Card/List creation control when included in release scope.
- Admin scenario if admin route editing is included in release scope.

Exit:

- Targeted scenario tests pass through root Vitest projects.

## Suggested First Start Scope

The first implementation slice should be Slice 0 + Slice 1 + Slice 2 with the route schema, route summary, `location = null` short-circuit policy, and share metadata. Then add Slice 4 before Anchor Event UI wiring, so event-assisted create has a typed route-pool contract.

If UI feedback is the main risk, start with Slice 5 as a storybook-like local component spike in the app route surface, then return to Slice 0 before durable mutation.
