# Issue 206 PR Route Support

## Objective & Hypothesis

Implement route support for `PR` so commute carpool requests can carry an ordered route in addition to the existing single-location mode.

Hypothesis: `PartnerRequest` can own a nullable JSONB `route` field with an ordered point list, while the existing `location` string remains the single-location mode. A PR should have exactly one place shape at a time: location mode or route mode. Route mode should feed the same display identity, share metadata, and detail-page facts that location mode currently feeds.

## Input Route And Mode

- Input route: Intent.
- Current mode: Execute and verify Form Mode recommendation contract expansion after Slice 8.
- Implementation state: Slice 0 through Slice 8 are implemented in the worktree. Later Card/List creation, time-window, selector-label, map-runtime corrections, and the Route Form Mode recommendation contract expansion are also in the worktree. Next route-task focus is Slice 9 system scenario coverage and any remaining share/browser proof.

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
- Anchor Event assisted-create place options should be backend-owned. Frontend selectors should consume an active-pool view with one kind, one option list, and active-kind copy.
- User-facing selector copy should name the active pool. Location-pool events use location copy such as `地点`; route-pool events use route copy such as `路线`.
- Route-pool events need a user-facing `申请新路线` path parallel to location-pool `申请新地点`.
- Backend Anchor Event read models now expose `placeSelector` for Form Mode and create time windows, with active kind, option list, option availability, and locale copy keys. Frontend Form/Card/List selectors consume this view as the primary path while legacy arrays remain in the payload for rollout safety.
- Anchor Event Route Application Admin review should allow the reviewer to adjust the submitted route before accepting. The review surface should use generic `RouteEditor` plus `LocationPicker`, and the accepted route becomes the event-local route-pool entry.
- PR detail UX is now route-aware in the worktree: `PRFactsCard.vue` renders a dedicated route row and route map modal, `PRPreviewCard.vue` consumes backend `core.placeDisplayName` with a frontend route-summary fallback, and `PRPage.vue` uses the same route-aware fallback for title display.
- The local `https://partner-up.localhost` dev process used for Slice 8 browser proof exposed a route-mode PR detail page correctly, while the modal map entered route-list fallback because that running frontend process had no Tencent LBS JS SDK script loaded. The committed code still uses the same `RouteMap` / `Map.vue` path as previously browser-verified route maps.
- Diagnosis on 2026-05-18: current local `/e/1?mode=form` is location-pool (`placeSelector.kind = "location"`), while `/e/4?mode=form` is the route-pool page. The earlier Route Form Mode primary CTA was hard-coded to bypass recommendation and call event-assisted PR create directly, so it could not produce matched / unmatched result states.
- Implementation update on 2026-05-18: `/api/events/:eventId/form-mode/recommendation` now accepts a place-discriminated request, either `{ kind: "location", locationId }` or `{ kind: "route", routePoolEntryId }`. Route selections validate against the event route pool, match candidate PRs by route equality plus time/preference compatibility, and return route-aware candidate payloads. The frontend Route Form Mode CTA now calls the recommendation mutation and uses route-aware telemetry payloads.
- Time-window update on 2026-05-18: route-pool Form Mode events may have no configured duration. Recommendation now accepts that by returning `timeWindow: [startAt, null]` instead of rejecting with `Anchor event duration is not configured`.

## Open Decisions

- Route planning source: Tencent Direction WebService.
- First-version route-mode domain policy: store `location` as `null`, so existing location-driven POI availability and meeting-point fallback short-circuit through their null-location paths.
- First-version creation scope: structured create, creator edit, Admin PR, and event-assisted create through Anchor Event route pool; natural-language route parsing moves to a later slice.
- Route title summary rule: independently truncate `route[0].name` and `route[-1].name`, join as `route[0].name~route[-1].name`, and keep the total title summary within 16 characters.
- Sharing-specific route detail can use share description fields owned by each PR Sharing surface; PR core owns only the canonical compact title summary.
- Anchor Event place selector option labels use the full endpoint label `route[0].name~route[-1].name`, preserving long names for route choice clarity.
- Direction WebService direct frontend calls are acceptable for the first version; backend proxy remains an optional future governance path.
- Planned polyline is computed on demand; the first version keeps no planned-polyline cache.
- PR Facts Card renders Route as its own `InfoRowAction`; clicking the row action opens a map modal.
- Frontend route naming boundary: use generic `Route`, `RouteEditor`, `RouteMap`, and route model helpers; reserve PR naming for route-mode PR forms and PR-specific payload mapping.
- Location picker boundary: build `LocationPickerPage` / picker session / Tencent component adapter as generic location infrastructure. RouteEditor opens it for a selected route item and maps `PickedLocation` to `{ name, full_address, gcj02 }`.
- First-version location picker provider: Tencent map location picker component (`componentPicker`) through iframe or page-return mode. Keep JS API GL plus WebService Search/Geocoder as a later custom-provider option when manual coordinate editing and deeper control are needed.
- Backend-owned Anchor Event place-option contract should replace frontend-derived active-pool selection before expanding more route-pool UI behavior.
- Route application owner resolved for first version: use a dedicated Anchor Event route application domain because POI/location applications are global POI artifacts and route applications are event-local route-pool candidates.

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
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts`: passed on 2026-05-17.
- `pnpm test:unit:frontend`: passed on 2026-05-17.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17.
- `git diff --check`: passed on 2026-05-17.
- Browser smoke on `https://partner-up.localhost`: home page, unauthenticated Admin Anchor Event route, and `/events/1?mode=LIST` loaded without console errors on 2026-05-17.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/admin/use-cases/anchor-event/anchorEventMutationInput.test.ts`: passed on 2026-05-17 after the event-assisted exclusive place-pool correction.
- `pnpm test:unit:frontend`: passed on 2026-05-17 after the event-assisted exclusive place-pool correction.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 after the event-assisted exclusive place-pool correction.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 after the event-assisted exclusive place-pool correction.
- `git diff --check`: passed on 2026-05-17 after the event-assisted exclusive place-pool correction.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed on 2026-05-17 for Slice 7C.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Slice 7C.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 for Slice 7C.
- `pnpm lint:backend`: passed on 2026-05-17 for Slice 7C.
- `pnpm db:lint`: passed on 2026-05-17 for Slice 7C migration.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed on 2026-05-17 with route application coverage.
- `git diff --check`: passed on 2026-05-17 for Slice 7C.
- Browser smoke on `https://partner-up.localhost/routes/apply?fromEvent=1`: route application page title and submit action rendered on 2026-05-17. Browser logs still contained the earlier unrelated Admin login failure.
- `git diff --check`: passed on 2026-05-17 for Slice 7B.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed on 2026-05-17 for Slice 7B.
- `pnpm --filter @partner-up-dev/frontend test:unit -- apps/frontend/src/domains/event/model/place-options.test.ts`: passed on 2026-05-17 for Slice 7B.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Slice 7B.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed on 2026-05-17 for Slice 7B.
- `pnpm lint:backend`: passed on 2026-05-17 for Slice 7B.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 for Slice 7B.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed on 2026-05-17 for Route Application Admin edited-route accept.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Route Application Admin edited-route accept.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed on 2026-05-17 with edited accepted route coverage.
- `pnpm lint:backend`: passed on 2026-05-17 for Route Application Admin edited-route accept.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 for Route Application Admin edited-route accept.
- `git diff --check`: passed on 2026-05-17 for Route Application Admin edited-route accept.
- Browser verification on `https://partner-up.localhost/e/4`: passed on 2026-05-17 for Form Mode route place control map height and compact route-point caption.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Form Mode route place control correction.
- `pnpm --filter @partner-up-dev/frontend lint:tokens`: passed on 2026-05-17 for Form Mode route place control correction.
- `git diff --check`: passed on 2026-05-17 for Form Mode route place control correction.
- `pnpm --filter @partner-up-dev/frontend test:unit -- PRPage.creator-actions.test.ts PRPreviewCard.route.test.ts`: passed on 2026-05-17 for Slice 8, 2 files / 8 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-17 for Slice 8.
- `git diff --check`: passed on 2026-05-17 for Slice 8.
- Browser verification on `https://partner-up.localhost/pr/19`: passed on 2026-05-17 for route-mode PR title fallback, dedicated Route facts row, route point list, and hidden Location row. Route map modal opened and rendered fixed-size shell plus route-point fallback; no Tencent SDK script was loaded in that running dev process. Temporary smoke PR `#19` was deleted after verification.
- `pnpm --filter @partner-up-dev/backend test:unit -- apps/backend/src/domains/anchor-event/services/form-mode.test.ts`: passed on 2026-05-18 for route-aware recommendation match and missing-duration time windows, 1 file / 10 tests.
- `pnpm --filter @partner-up-dev/backend typecheck`: passed on 2026-05-18 for Form Mode recommendation contract expansion.
- `pnpm test:scenario:backend -- apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts`: passed on 2026-05-18 with route recommendation coverage, 1 file / 6 tests.
- `pnpm --filter @partner-up-dev/frontend build`: passed on 2026-05-18 for Form Mode route recommendation wiring.
- Runtime API check on `https://api.partner-up.localhost/api/events/4/form-mode/recommendation`: route payload returned `200`, `selection.kind = "route"`, `routePoolEntryId = "route-1"`, and `timeWindow[1] = null`.
- Browser verification on `https://partner-up.localhost/e/4?mode=form`: passed on 2026-05-18 for route Form Mode CTA copy changing to `加入一场 ... 经过 ... 的拼车搭子活动`; browser console had no errors/warnings in the checked tab.
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
- `60-current-status-review.md`: actual implemented, partial, and pending issue 206 scope after the 2026-05-17 global review and Slice 8 update.
