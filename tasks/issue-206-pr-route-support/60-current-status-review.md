# Current Status Review

Reviewed on 2026-05-17 after the global route-task re-anchor.

## Source Re-Check

- GitHub issue 206 is still open and titled `PR 支持路线（包括 Anchor Event 支持）`.
- The issue body keeps the original core: commute carpool needs route support; PR has one place shape, `location` or `route`; route renders through Tencent map markers and polyline; route uses JSONB route point schema; route affects PR Page title and share-card generation.
- The issue comment adds one important owner decision: POI applications and route applications both exist, and route application belongs inside Anchor Event scope.
- Local task packet decisions extend the issue with later human constraints:
  - Route is generic product vocabulary. PR can be a Route PR, while `Route`, `RouteEditor`, `RouteMap`, and `LocationPicker` stay generic frontend boundaries.
  - First version covers structured create/edit/Admin/Event-assisted flows. Natural-language route parsing is deferred.
  - Route mode writes `location = null`, letting existing POI availability and automatic meeting-point fallback short-circuit through null-location behavior.
  - Tencent Direction WebService direct frontend calls are acceptable for this first version.
  - Planned polyline has no first-version cache.
  - Route selector options use full endpoint labels. Compact 16-character summaries are scoped to PR title/share-title style surfaces.

## Task Essence

Issue 206 is primarily a place-model expansion, with map rendering as one required surface.

The essential product claim is:

- A PR can be location-mode or route-mode.
- The active place mode contributes to creation, editing, validation, detail facts, preview cards, title fallback, share metadata, Anchor Event assisted creation, and Admin workflows.
- A route is an ordered list of named route points with coordinates, rendered as markers plus a planned or fallback polyline.
- Anchor Event can provide a route pool for event-assisted creation, and users can apply for new event-local routes when the event is route-pool based.

The architectural claim is:

- Backend owns persisted PR place-mode invariants and canonical display metadata.
- Backend owns Anchor Event active place selector read models.
- Frontend owns generic route/location/map interaction primitives and renders backend place-selector views.
- PR-specific frontend code maps generic route/location values into PR payloads.

## Invariants To Preserve

- PR place mode is exclusive at submit/persist boundaries:
  - location-mode has meaningful `location` and `route = null`.
  - route-mode has valid route points and `location = null`.
- Route-mode PRs participate in display/share identity through backend-derived route summary and `placeDisplayName`.
- Location-driven services keep their current authority:
  - POI availability needs non-null location.
  - automatic Anchor Event / POI meeting-point fallback needs non-null location.
  - location-scoped support resources need non-null location.
  - waitlist alternative matching remains exact-location based until a route matcher exists.
- Route applications are Anchor Event-local candidates. Accepted route applications become event route-pool entries.
- Anchor Event `locationPool` and `routePool` are mutually exclusive for assisted creation.
- Anchor Event place selectors render one active kind and one option list, decided by backend read models.
- Card/List inline place selector order is label, map preview, dropdown/control.
- Card/List inline map preview has a fixed visible height. Hidden Tencent attribution handling is internal canvas bleed only.
- The route editor follows the `uniapp2` routeEditor interaction shape while using the generic Web `LocationPicker`.

## Implemented Foundation

Committed route-task base:

- `9a91879e feat(pr): add route place mode foundation`
- `41133172 feat(pr): add anchor event route pool policies`
- `8e2a0209 feat(pr): add route editor map workflow`
- `e866cb82 feat(event): add route application workflow`
- `395e16d9 feat(admin): allow editing route applications`
- `7bc91eea feat(event): add backend-owned place selectors`
- `c9763052 fix(event): restore route card selection`
- `b5344ed1 fix(map): hide Tencent attribution band`
- `b7aef8b7 fix(map): omit undefined Tencent zoom bounds`
- `8d1189b3 fix(event): unify event-assisted PR creation`

Current branch is `develop`. The worktree is dirty and contains both issue-206 changes and other active task changes, especially issue 229 booking-support removal and PR page topology work. Any commit for issue 206 should stage paths deliberately.

## Implemented By Surface

Backend PR route foundation:

- `partner_requests.route` exists as nullable JSONB.
- Route point validation follows the issue schema: `{ wgs84, bd09, gcj02, name, full_address }[]`.
- PR place-mode normalization and validation reject conflicting `location` plus `route`.
- Structured create, edit/update, Admin PR paths, PR detail read models, search summaries, Admin workspace summaries, and share context carry route.
- Canonical share metadata falls back to route summary and includes route in revision hashing.

Backend route-mode policy:

- POI availability short-circuits through null location for route-mode PRs.
- Meeting-point resolution keeps PR-specific meeting point and stops automatic location-based fallbacks when location is null.
- Location-scoped support-resource matching needs non-null location.
- Waitlist alternative matching treats missing location as a mismatch.
- Activity-start copy uses backend place-display resolution, so route-mode reminders can show route summary.
- Anchor Event Form Mode recommendation is now route-aware for route-pool events; full-PR expansion remains location-driven.

Frontend generic route/location/map infrastructure:

- Generic route model helpers and tests live under `apps/frontend/src/domains/route/model`.
- `RouteEditor.vue`, `RouteItemRow.vue`, and `RouteMap.vue` live under the generic route UI boundary.
- `LocationPickerPanel.vue` / `LocationPickerModal.vue` provide a generic Tencent `componentPicker` backed location-picking flow.
- `PRPlaceModeField.vue` consumes generic RouteEditor and shared `SegmentedControl`.
- User PR create/edit and Admin PR create/edit can submit route-mode payloads.
- RouteMap plans driving polylines through Tencent Direction WebService JSONP in browser runtime.
- Tencent route polyline decode, marker assets, marker label omission, and route polyline styling align with the `uniapp2` route map reference.
- RouteEditor map action is disabled until departure and arrival are valid.
- RouteEditor supports adjacent route point reordering.

Anchor Event route pool and place selectors:

- `anchor_events.route_pool` exists as event-local route-pool JSONB.
- Location pool / route pool mutual exclusion is enforced by Admin input assembly and backend constraints.
- Backend `placeSelector` read models expose active kind, copy keys, option list, availability, route-pool provenance, and location metadata.
- Form Mode uses `AnchorEventCarouselPlaceSelector`.
- Card/List modes use `AnchorEventInlinePlaceSelector`.
- Event-assisted create posts through unified structured PR create semantics and carries `routePoolEntryId` for route selections.
- Card/List route-pool events with empty materialized time windows can still create through `AnchorEventAssistedPRTimeWindowInlineEditor`, which emits a concrete time-window tuple.
- Form Mode route-pool events now call the recommendation endpoint with a route place selection, so the primary CTA can enter matched / unmatched states instead of directly creating a PR.

Route application:

- `anchor_event_route_applications` migration, entity, repository, public endpoints, and Admin accept/reject endpoints exist.
- `/routes/apply?fromEvent=:eventId` uses generic `RouteEditor` for route submission.
- Admin Anchor Event has a route-application review section.
- Admin review can edit the submitted route before accepting.
- Accepted route applications append event-local route-pool entries.

Recent UI/runtime corrections:

- Form Mode route carousel cards render route maps with non-zero height.
- Form Mode selected route caption renders a compact route-point list with role-colored dots.
- Route card clicks reach the carousel selection layer.
- Shared Map supports opt-in hidden Tencent attribution band by extending internal canvas height and compensating bottom padding.
- Card/List inline route map previews use fixed visible height and initialize Tencent GL only after the container is measurable.
- Card/List route selector options show full endpoint labels.
- Route Form Mode primary CTA uses recommendation copy (`加入一场 ...`) rather than direct-create copy (`创建一场 ...`).

## Current Verification Evidence

Command evidence from the task packet includes passing:

- backend typecheck and lint
- backend unit tests
- backend scenario tests for PR route and Anchor Event route pool
- frontend route/place-option unit tests
- frontend build
- frontend token lint
- `git diff --check`

Recent browser evidence:

- `https://partner-up.localhost/e/4` Form Mode route cards render non-zero map/canvas heights and readable route-point captions.
- `https://partner-up.localhost/e/4?mode=list` renders the route selector, full route labels, inline time-window editor, fixed-height map preview, and no route-map fallback.
- `https://partner-up.localhost/e/4?mode=card` renders the same Card Mode route creation controls and fixed-height route map preview.
- `https://partner-up.localhost/pr/19` rendered a route-mode PR with visible title `广州塔~大学城`, a dedicated Route facts row, route point list, and no empty Location row.
- The PR detail Route map modal opened and measured a `696x403` map shell with detailed route-point fallback.
- Temporary smoke PR `#19` was deleted after verification.
- Inline preview measurements after the latest correction:
  - visible preview: `446x148`
  - clipped map shell: `446x148`
  - internal Tencent canvas with attribution bleed: `444x166`
- Browser console filters showed no new `ReferenceError`, `poiByName`, `MapOptions`, `minZoom`, Tencent geometry, or route planning errors during the latest checks.
- Slice 8 browser note: the running local frontend process had no Tencent LBS JS SDK script loaded during `/pr/19` modal verification, so the modal used fallback. Earlier route-map event checks in this task verified the shared map path with non-zero Tencent canvas.
- `https://partner-up.localhost/e/4?mode=form` now renders route cards, advanced time selection, and route recommendation CTA copy `加入一场 5/18 16:45 经过 广东外语外贸大学(大学城校区)~广州南站 的拼车搭子活动`; the checked browser tab had no errors or warnings.
- Runtime API check on `/api/events/4/form-mode/recommendation` returned `200` for `{ place: { kind: "route", routePoolEntryId: "route-1" } }`, with route selection metadata and a null-ended time window.

## Remaining Product Gaps

Release-critical for issue 206 closure:

1. PR detail facts route row is implemented in the worktree.
   - `PRFactsCard.vue` now renders Route as a separate `InfoRowAction`.
   - Route-mode hides the empty Location row when `location = null`.
   - The right action opens a route map modal with detailed route-point fallback.

2. PR preview cards are route-aware in the worktree.
   - `PRPreviewCard.vue` now resolves place display from backend `core.placeDisplayName`, then frontend `buildRouteSummary(route)`, then `core.location`.
   - Focused unit coverage proves route summary fallback.

3. Route-mode PR Page visible title has browser proof; share descriptor proof remains.
   - `PRPage.vue` now resolves title from explicit title, backend `core.placeDisplayName`, frontend `buildRouteSummary(route)`, location, then type.
   - Browser verified `/pr/19` visible title as `广州塔~大学城`.
   - Frontend head/share registration still consumes backend canonical metadata; a browser/system check should prove route-share descriptors stay coherent.

4. End-to-end scenario coverage still needs browser/system route journeys.
   - Create route PR through `/pr/new`, land on `/pr/:id`, observe route facts/title/share.
   - Exercise Anchor Event Form Mode route-pool recommendation through the UI, including matched and unmatched result states.
   - Create route PR from Anchor Event Card/List creation controls if included in release scope.

5. Authenticated Admin browser verification is still pending.
   - Route-pool editing exists.
   - Route-application editing exists.
   - Local admin login was blocked during earlier smoke attempts, so UI proof is incomplete.

6. Active selector viewport fitting needs explicit browser proof.
   - Map code supports geometry fitting.
   - A browser check should change dropdown/carousel active item and verify selected marker/polyline fits the viewport with padding.

Follow-up scope after first release:

- Natural-language route parsing.
- Planned-polyline cache.
- Backend proxy for Tencent Direction WebService.
- Route-aware waitlist/alternative matcher.
- Reusable route catalog beyond event-local route pools.
- A custom Web LocationPicker provider with deeper manual coordinate editing if Tencent component limits become product friction.

## Practical Next Order

Next slice should be Slice 9, focused on cross-unit proof:

1. Add system scenario for structured route PR create to PR detail.
2. Add system/browser scenario coverage for Anchor Event Form Mode route-pool recommendation result states.
3. Add Card/List event-assisted route create coverage when that surface is part of the release acceptance path.
4. Add browser/system proof for route-mode share descriptors.

## Commit Hygiene

- The branch currently contains many unrelated dirty paths.
- Issue 206 commits should stage only route-task files.
- The current task-packet review update belongs with route-task docs and any immediately related Slice 8 implementation.
