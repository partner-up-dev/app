# Issue 206 PR Route Support

## Objective & Hypothesis

Implement route support for `PR` so commute carpool requests can carry an ordered route in addition to the existing single-location mode.

Hypothesis: `PartnerRequest` can own a nullable JSONB `route` field with an ordered point list, while the existing `location` string remains the single-location mode. A PR should have exactly one place shape at a time: location mode or route mode. Route mode should feed the same display identity, share metadata, and detail-page facts that location mode currently feeds.

## Input Route And Mode

- Input route: Intent.
- Current mode: Execute.
- Implementation state: Slice 0 through Slice 6 implemented on 2026-05-16.

## Issue Source

- GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/206
- Core issue claims:
  - Route support is a prerequisite for commute carpool PRs.
  - Add Tencent map integration and `RouteEditor`.
  - Provide immersive and inline editor variants, with `F:\CODING\Project\Anana\Application\uniapp2` as UI reference.
  - `PR.location` and `PR.route` are mutually exclusive place modes.
  - Route display uses map marker plus polyline.
  - Route JSONB schema is an ordered list of points shaped as `{ wgs84, bd09, gcj02, name, full_address }`.
  - Route affects PR page title and share-card generation like location.

## Guardrails Touched

- PRD behavior: PR creation, PR detail identity, route-vs-location place vocabulary, share and distribution.
- Product TDD cross-unit contract: typed HTTP payloads, `GET /api/pr/:id`, create/update commands, share descriptor contract.
- Backend entity/repository/use-case/read-model boundaries for `PartnerRequest`.
- Backend route validation and domain invariants around mutually exclusive place modes.
- Frontend PR form, route editor, PR detail facts card, preview cards, route share descriptor, document head metadata.
- Anchor Event route pool, Form Mode place selector, Card/List creation controls, and event-assisted create payload assembly.
- Shared frontend primitives for place-mode segmented control and Tencent LBS map rendering.
- Admin PR workspace create/edit surfaces.
- Scenario testability for `/pr/new`, `/pr/:id`, and admin PR route editing where browser flows are added.
- Current POI upgrade work in `tasks/issue-201-poi-upgrade/` because it is actively changing location semantics.

## Current Key Findings

- Existing `PR.location` is a nullable string stored on `partner_requests.location`.
- Existing display fallback order is explicit title, then location, then type, then generic PR label.
- Existing share metadata uses the same location-first fallback and includes location in the revision hash.
- Existing meeting-point, POI availability, booking resource matching, and waitlist alternative matching currently read single-location semantics.
- `uniapp2` contains mature route editor and map display references, but its location picker and route planner depend on Weixin mini-program plugins.
- Tencent JavaScript API GL provides web-side marker/polyline rendering via `MultiMarker` / `MultiPolyline`; route planning uses Tencent Direction WebService and may be called directly from frontend when key exposure is acceptable.
- Tencent LBS map rendering should be wrapped behind a Vue-friendly component interface before PR and Anchor Event surfaces consume it.
- Route is a product/domain concept shared beyond PR; PR owns a route-mode place payload, commonly described as a Route PR. Frontend route helpers and UI should live under a route-owned or shared route boundary, with PR code acting as a consumer.
- UniApp `routeEditor.vue` uses compact route item rows in normal mode and a staged departure/waypoint/arrival layout in immersive mode. The Web editor should follow that interaction shape instead of exposing coordinate fields in the main editor.
- Tencent `componentPicker` is the first-version fit for location selection because it supports search, draggable map selection, initial coordinates, iframe embedding, page-return mode, and a location payload callback. Tencent `componentMarker` remains useful for position display.
- Location picking is a generic capability. Route item editing should call a generic `LocationPicker` flow and then map the picked location into a route point.

## Open Decisions

- Route planning source: Tencent Direction WebService.
- First-version route-mode domain policy: store `location` as `null`, so existing location-driven POI availability and meeting-point fallback short-circuit through their null-location paths.
- First-version creation scope: structured create, creator edit, Admin PR, and event-assisted create through Anchor Event route pool; natural-language route parsing moves to a later slice.
- Route title summary rule: independently truncate `route[0].name` and `route[-1].name`, join as `route[0].name~route[-1].name`, and keep the total title summary within 16 characters.
- Sharing-specific route detail can use share description fields owned by each PR Sharing surface; PR core owns only the canonical compact title summary.
- Direction WebService direct frontend calls are acceptable for the first version; backend proxy remains an optional future governance path.
- Planned polyline is computed on demand; the first version keeps no planned-polyline cache.
- PR Facts Card renders Route as its own `InfoRowAction`; clicking the row action opens a map modal.
- Frontend route naming boundary: use generic `Route`, `RouteEditor`, `RouteMap`, and route model helpers; reserve PR naming for route-mode PR forms and PR-specific payload mapping.
- Location picker boundary: build `LocationPickerPage` / picker session / Tencent component adapter as generic location infrastructure. RouteEditor opens it for a selected route item and maps `PickedLocation` to `{ name, full_address, gcj02 }`.
- First-version location picker provider: Tencent map location picker component (`componentPicker`) through iframe or page-return mode. Keep JS API GL plus WebService Search/Geocoder as a later custom-provider option when manual coordinate editing and deeper control are needed.

## Verification

- `pnpm db:lint`: passed on 2026-05-16.
- `pnpm test:unit:backend`: passed on 2026-05-16.
- `pnpm lint:backend`: passed on 2026-05-16.
- `pnpm build:backend`: passed on 2026-05-16.
- `pnpm test:scenario:backend -- apps/backend/tests/pr-core/pr-route.scenario.test.ts`: passed on 2026-05-16.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-mode-policy.scenario.test.ts`: passed on 2026-05-16.
- `pnpm test:unit:backend -- apps/backend/src/entities/anchor-event.test.ts`: passed on 2026-05-16.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed on 2026-05-16.
- `pnpm test:unit:backend`: passed on 2026-05-16.
- `pnpm lint:backend`: passed on 2026-05-16.
- `pnpm test:scenario:backend`: passed on 2026-05-16.
- `pnpm build:backend`: passed on 2026-05-16.
- `pnpm build:frontend`: passed on 2026-05-16.
- `pnpm test:unit:frontend`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-16.
- `pnpm test:unit:backend`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/backend build`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/route/model/route.test.ts apps/frontend/src/domains/location/model/location-picker.test.ts apps/frontend/src/domains/pr/model/pr-route.test.ts`: passed on 2026-05-16.
- `pnpm test:unit:frontend`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-16.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-16.
- `git diff --check`: passed on 2026-05-16.
- Browser smoke on `http://127.0.0.1:5173/pr/new?mode=form`: route-mode editor and missing-key LocationPicker fallback passed on 2026-05-16.
- Browser verification on `/pr/new`, `/pr/:id`, `/admin/pr`, and `/e/:eventId` remains tied to UI slices.
- Map rendering verification with a valid Tencent key remains tied to UI slices.

## Packet Files

- `10-current-pr-location-map.md`: existing location ownership and blast radius.
- `20-uniapp-route-ui-reference.md`: UI reference extracted from `uniapp2`.
- `25-anchor-event-route-pool.md`: Anchor Event route pool and place selector scope.
- `26-frontend-map-and-control-components.md`: shared segmented control and generic map component contract backed by Tencent LBS.
- `30-target-contract-and-decisions.md`: proposed product/API contract and decision points.
- `40-implementation-slices.md`: suggested implementation slices and verification gates.
- `50-verification-notes.md`: evolving evidence checklist and command log.
