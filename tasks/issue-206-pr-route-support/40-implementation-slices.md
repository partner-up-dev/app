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
  - meeting-point fallback remains location-driven and short-circuits on `null` location.
  - route-mode waitlist alternative reminders are disabled until a route matching rule exists.

Exit:

- Domain policy is explicit in code and Product TDD.
- Tests cover route-mode behavior for each touched service.

## Slice 4 Anchor Event Route Pool And Event-Assisted Create

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

## Slice 5 Frontend Model And Editor Components

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

## Slice 6 Frontend Create/Edit/Admin Integration

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
