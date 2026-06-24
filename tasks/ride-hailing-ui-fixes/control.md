# Ride Hailing UI Fixes Control

## Objective & Hypothesis

Objective:

- repair concrete RideHailing Ordering UI and Order Detail Page UI issues one
  slice at a time
- keep this packet clean enough to steer implementation without inheriting the
  noisy history from `tasks/ride-hailing-mvp/`

Hypothesis:

- the commerce spine is now strong enough for focused UI fixes
- each observed UI issue should be handled as an independent, reviewable slice
- the safest workflow is explicit Impact Handshake before each production-code
  mutation, followed by an explicit human start signal

## Classification

- Primary route: `Reality`
- Active mode: `Execute` for Bill Detail page reset and backend-contract segment
- Current collaboration state: choice-set backend/domain foundation, Ordering
  UI primitive/control, SKU Card layout remediation, Offer Listing / quote
  identity, Ordering entry decoupling, durable docs promotion, and fake provider
  lifecycle control committed; current slice adds accepted/pickup Driver Card
  behavior, preserves driver marker icons, improves fake provider route
  geometry, aligns `ACCEPTED` user-facing copy with `接客中`, and corrected the
  Driver Card Call button icon slot; current Caocao route diagnosis found no
  intermediate-point loss in the fake -> backend -> frontend -> Tencent chain,
  fixed the stronger `navigation_polyline_type` provider contract gap, and added
  deterministic fake driver movement plus heading-aware vehicle marker rotation;
  task-packet wording is now corrected so the Driver Card call affordance is
  treated as an action, not as a required visible `Call` text label; current
  implementation slice covers order-detail back-navigation semantics and a
  resolved-vehicle section above route facts; Bill Card integration is now
  committed; current slice resets and rebuilds Bill Detail page around
  backend-owned bill totals, payer-enriched bill lines, single-select checkout,
  and verified RideHailing bill-detail -> checkout routing

## Inherited Effective Truth

- Durable route spine:
  `PR Page -> /order/new -> POST /api/commerce/orders -> /orders/:orderId`.
- `/order/new` already creates real orders and routes to `/orders/:orderId`.
- `/order/support` no longer owns the primary meaning of `下单`.
- RideHailing ordering already uses provider-backed evaluation and fake Caocao
  local/runtime support.
- RideHailing candidate options are currently catalog-seeded, then evaluated by
  provider estimate. Provider-authored option discovery is a separate contract
  decision and is not part of ordinary UI fixes.
- `OrderingFromPlacementPage.vue` is the current shared ordering route
  entrypoint, but its name is now a known coupling smell because `/order/new`
  is generic Ordering.
- `RideHailingOrderingContent.vue` owns the RideHailing ordering content.
- `RideHailingSkuCard.vue` owns RideHailing vehicle card display.
- `CommerceOrderDetailPage.vue` currently owns both Rental and RideHailing order
  detail rendering.
- Current RideHailing Order Detail map/live-route slice:
  - backend segment now exposes typed provider live route, vehicle coordinates,
    vehicle heading, and sanitized live projection fields
  - local RideHailing execution phase now distinguishes `ACCEPTED` from
    `ARRIVED_AT_PICKUP`
  - shared lower-level map already supports arbitrary markers, polylines, and
    active geometry; `RouteMap` now exposes generic extra live geometry
  - fake Caocao now has explicit `ARRIVED_AT_PICKUP`,
    driver-location, and driver-route test data
  - frontend segment now builds a pure RideHailing map view-model and renders
    dispatching origin focus, provider live route, driver marker, arrived
    marker-only state, in-trip remaining route, and terminal planned route
  - map mode is driven by local persisted `ride.executionPhase`, not provider
    live phase/status
  - RideHailing `PuFloatPanel` no longer shows raw JSON diagnostic data
  - shared Tencent map single-coordinate fitting now respects `fitPadding` by
    using a tiny `fitBounds` area instead of direct `easeTo(center)`
  - manual browser validation confirmed the map padding correction
  - panel content now contains Status Hero, dispatching-only readonly SKU list,
    route section, and rider section only
  - `RideHailingSkuCard.vue` has a readonly/no-checkbox shape for detail
    display while preserving the Ordering Page default selectable behavior
  - RideHailing Order Detail projection now exposes minimal candidate vehicle
    card facts from the persisted choice-set item
  - cancel/more controls in the Status Hero are disabled visual controls until
    RideHailing cancellation/more-operation use cases exist
  - Order Detail phase display remains driven by local persisted
    `ride.executionPhase`, not provider `live.phase`
  - fake Caocao Admin phase controls must expose callback delivery failure
    rather than silently allowing provider/local lifecycle drift
  - Driver Card should render from `ride.driver` / `ride.vehicle` when either
    exists; `driverName` is display data, and the right-side affordance is a
    call action backed by `driverPhone`, not a static phone-data field; visible
    button text is optional, and the current icon-led button shape is
    acceptable when it keeps accessible call semantics
  - the shared map provider must preserve the `routeDriver` icon style for
    driver markers even when the marker is active
  - fake Caocao pickup/in-trip route geometry must include enough route points
    to support meaningful map review; two endpoint-only points are insufficient
  - in the current simplified phase model, Caocao event `1` / order status `9`
    maps to local `ACCEPTED`, but user-facing copy should treat that phase as
    `接客中`
  - provider live route query must carry the Caocao route kind explicitly:
    pickup navigation uses `navigation_polyline_type=1`, and dropoff navigation
    uses `navigation_polyline_type=3`
  - fake Caocao driver movement is deterministic and route-query driven:
    successful route polling advances a phase-local movement tick, driver
    location and returned route start agree on the same simulated point, and
    phase changes reset movement progress
  - shared map marker heading is optional; RideHailing driver marker is the
    first consumer, and Tencent conversion must account for Caocao clockwise
    heading versus Tencent counter-clockwise marker rotation
  - standalone plan:
    `tasks/ride-hailing-ui-fixes/order-detail-ride-hailing-map-plan.md`
- `RouteMap.vue` / shared map code are relevant when a UI issue concerns route
  geometry, marker behavior, or zoom/pan behavior.
- `RideHailingSkuCard.vue` is reusable for order detail dispatching candidate
  SKU display only if it supports a readonly shape without checkbox.
- RideHailing order-detail back navigation currently uses generic
  `useFallbackBack` and therefore returns to the immediate previous page when a
  router back entry exists; for the standard PR -> Ordering -> Order Detail
  flow, this means it returns to `/order/new` instead of the initiating page.
- RideHailing order detail already receives full `detail.order.items`
  snapshots; a resolved RideHailing choice-set item can be identified from
  `item.resolution?.sku` without introducing a new backend projection first.
- Commerce already exposes both `GET /api/commerce/bills/:billId` and
  `GET /api/commerce/orders/:orderId/bill`; the frontend already has
  `useBillDetail(billId)` and `CommerceBillDetailPage` at `/bills/:billId`.
- Bill Detail backend contract now also exposes:
  - `bill.totalAmountFen` as the backend-owned signed total shown by frontend
  - `lines[].payer.userId`
  - `lines[].payer.nickname`
  - `lines[].payer.displayName`
  - `lines[].payer.avatarUrl`
  - `lines[].payer.isViewer`
- `CommerceOrderDetailPage` already receives `detail.bill` with bill id,
  status, currency, and lightweight line snapshots; that is enough to detect
  bill existence and hand canonical data ownership to an id-owned Bill Card.
- RideHailing final bill creation already happens in the Caocao callback path:
  when the provider callback carries a final amount, backend
  `ensureRideFinalBill` creates the order bill and per-participant charge
  lines.
- Current RideHailing order detail content renders status hero, optional driver
  card, dispatching-only candidate vehicles, resolved service vehicle, route,
  and riders; it does not yet render any bill-specific section.
- Bill Detail page reset slice already removed the old header subtitle and the
  old successful-state body content; the page is now rebuilt from the real
  Bill / BillLine projection with card-based payable-line selection.

## Collaboration Protocol

- Do not automatically mutate production code from this packet.
- Codex is expected to raise objections before implementation when a requested
  slice appears likely to damage functionality, ownership boundaries,
  maintainability, readability, or established UI contracts.
- Before every production-code fix, perform an Impact Handshake covering:
  - Address and Object: exact files, anchors, components, symbols, or test IDs
    expected to change
  - State Diff: observed current behavior -> intended behavior
  - Blast Radius Forecast: downstream UI, API, scenario, and contract surfaces
    that may be affected
  - Invariants Check: route spine, create/evaluate command shape, binding-lock
    authority, and existing scenario test IDs that must remain stable
  - Verification: concrete proof to run for that slice
- Wait for an explicit human start signal before implementation. The expected
  signal is the visible word: `开始`.
- Do not auto-commit.
- Keep each issue independent unless the human explicitly combines them.
- Keep old `tasks/ride-hailing-mvp/` as historical evidence only; do not expand
  it for new UI-fix work.

## Log Hygiene

- Root `discussion-log.md` and `change-log.md` are current working surfaces,
  not complete history dumps.
- Keep root logs short enough to reload before a slice. Prefer:
  - current segment decisions
  - pinned cross-slice decisions
  - open implementation checks
  - latest completed slice and planned verification
- Move old completed history into scope-named files under `archive/`.
- Current archive files:
  - `archive/discussion-log-ordering-through-order-detail-map.md`
  - `archive/change-log-ordering-through-order-detail-map.md`

## Durable Owners Likely Touched

- `docs/20-product-tdd/ecommerce-contracts.md`
- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- `apps/frontend/src/domains/commerce/ui/ordering/`
- `apps/frontend/src/domains/route/ui/RouteMap.vue`
- `apps/frontend/src/shared/map/`
- `apps/backend/src/entities/product-sku.ts`
- `apps/backend/src/entities/offer.ts`
- `apps/backend/src/domains/merchandising/`
- `apps/backend/src/domains/ride-hailing/`
- `apps/backend/src/domains/trade/`
- `apps/backend/drizzle/`
- `packages/fake-caocao-server/`
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Verification

Choose the narrowest sufficient proof per approved slice:

- `pnpm check:type:frontend`
- `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
- focused browser/manual check through PR placement when the issue is visual or
  interaction-specific
- `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  when browser-visible workflow behavior or stable test IDs change
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  when Rental ordering is affected by unified listing / quote identity

## Current State

- Implemented slice: Bill Detail page reset and backend-contract segment
  (uncommitted).
- Committed slice: RideHailing Order Detail Bill Card
  (`0bcfdc29`).

- Committed slice: RideHailing ordering content naming and layout correction
  (`f7ac1aa3`).
- Committed slice: submit-time ordering pre-flight and RideHailing SKU
  ownership correction
  (`bbb47413`).
- Committed slice: RideHailing preflight price-change scenario
  (`f25baf62`).
- Committed slice: choice-set backend/domain foundation, Ordering UI
  primitive/control, FloatPanel migration, and SKU Card layout remediation
  (`42eb1a61`).
- Committed slice: Offer-owned Listing and product-type-independent quote
  identity
  (`499291ea`):
  - added `POST /api/commerce/offers/:offerId/listing`
  - added persisted `commerce_quotes`
  - added Quote-domain resolver for quote existence, expiry, active
    Offer/SKU/SPU, Offer membership, item kind, and choice-set grouping
  - made create-order product items quote-only:
    `FIXED.quoteId` / `CHOICE_SET.candidateQuoteIds`
  - removed frontend submit-time evaluate/preflight path and old
    RideHailing options hook
  - removed backend `/ordering/evaluate`,
    `/ordering/ride-hailing/options`, and unused `evaluateRideOptions`
    surfaces
  - migrated Rental and RideHailing Ordering Content to unified Offer Listing
  - RideHailing listing uses route + departureAt and stores provider quote
    facts in quote snapshots
  - quote expiry returns HTTP 409 `ORDERING_QUOTE_EXPIRED`; frontend refreshes
    listing, preserves matching selected SKU ids, and requires another click
  - create-order derives participants, riders, contact phone, route,
    departureAt, SKU, Offer, and price facts from validated quote snapshots
  - departureAt binding now prompts the user to keep "now" by default while
    keeping a one-tap apply action in the drawer
  - removed non-inherited `data-testid` attributes from `PuDialog` usage to
    avoid the known Vue extraneous-attribute warning
- Current target model now reflected in code:
  - parent-page evaluation runs only after submit/create-order click
  - blocking pre-flight results open an acknowledgement dialog
  - changed pre-flight price opens a confirmation dialog before create order
  - footer price summary comes from Ordering Content summary
  - RideHailing quote options are loaded by `RideHailingOrderingContent`
  - parent-page evaluation no longer returns or owns `rideHailing.options`
  - order command `items` now supports `FIXED` and RideHailing `CHOICE_SET`
  - RideHailing create-order persists an unresolved choice-set item, dispatches
    cheapest-first inside the create-order lifecycle, and writes provider
    binding only into the choice-set resolution
  - provider create failure cancels the newly created order and returns a
    `CANCELLED` create-order result for the Ordering Page failure dialog
  - `ride_hailing_orders` no longer owns provider instance/order binding
  - RideHailing callback, live detail, and fee confirmation recover provider
    binding from the resolved choice-set item
  - RideHailing vehicle cards use `PuCard selectable` with a visual
    `PuCheckbox`
  - RideHailing SKU list uses `PuSkeleton` placeholders for initial quote
    listing load
  - RideHailing vehicle cards use the reviewed left/right layout:
    SKU name + info icon and preview on the meta side, estimated price + amount
    + checkbox on the right-aligned price side
  - Ordering Page no longer renders the permanent floating error notice layer;
    create-order failures are explained by Dialog only
  - RideHailing vehicle cards no longer render card-internal status/reason
    text; unavailable quoted options remain hidden at the list layer
  - RideHailing vehicle selection uses `usePuSelect` multiple and submits an
    actual selected candidate set
  - RideHailing bottom sheet uses `PuFloatPanel` with minimized, normal, and
    expanded stops
  - route-map fit padding follows the active float-panel stop
- Human review correction implemented:
  - `RideHailingSkuCard` layout is left/right:
    `meta(name + info icon, preview)` plus right-aligned
    `price(estimated text, amount, checkbox)`
  - checkbox belongs below price amount and is right-aligned
  - card does not expose separate `vehicle summary` or `status/reason`
- Current implementation slice:
  - fake Caocao phase-control responses include callback delivery details
  - callback non-2xx/network failures return
    `FAKE_CAOCAO_CALLBACK_DELIVERY_FAILED`
  - Admin Provider Instance dev tools expose both advance and retreat latest
    order phase controls
  - Driver Card renders from projected driver/vehicle data when present
  - active driver markers preserve the explicit `routeDriver` icon style
  - fake Caocao pickup/in-trip route output has multi-point curved geometry
  - accepted/provider status `9` copy is user-facing `接客中`
  - Driver Card Call action renders its icon via `PuButton` `#leading`
  - next separate slice: Caocao Fake Server driver-movement mock should start
    by verifying Caocao `coords` parsing and Tencent Map SDK path input rather
    than changing fake server away from Caocao API semantics
  - slice research file:
    `tasks/ride-hailing-ui-fixes/caocao-driver-movement-mock-research.md`
  - current diagnosis result: fake server raw `coords`, backend adapter
    projection, frontend view-model path, and Tencent `paths` assembly preserve
    the same multi-point latitude/longitude route shape; a stronger adapter
    issue is missing `navigation_polyline_type` in `queryDriverRoute`
- Current implementation slice: Order Detail back navigation and resolved
  vehicle section
  - task-packet wording correction: previous notes overstated a visible `Call`
    label requirement on the Driver Card action; the real UI contract is an
    action-oriented call affordance, and the current icon-led implementation is
    acceptable
  - current back-navigation behavior: `CommerceOrderDetailPage` uses
    `useFallbackBack`, which calls `router.back()` whenever a history back entry
    exists; in the normal PR -> `/order/new` -> `/orders/:orderId` flow, this
    returns to the ordering page rather than the initiating page
  - current data availability: RideHailing order detail already carries the
    raw order item snapshots, and existing page code already prefers
    `item.resolution?.sku` over unresolved candidates when deriving an item SKU
  - current UI gap: `RideHailingOrderContent` renders dispatching-only
    candidate vehicles and then route/rider sections; it does not render a
    dedicated resolved service-vehicle section above route facts
  - implementation result:
    - Order Detail back now skips `/order/new` when the current router back
      entry is the ordering page; when two-step back is unavailable, it falls
      back to the initiating PR path from the ordering handoff store
    - RideHailing Order Detail now renders a readonly `服务车型` section above
      `路线` when the order item has a resolved RideHailing SKU
    - the new section reuses readonly `RideHailingSkuCard` and does not alter
      the existing dispatching candidate section contract
    - focused system scenario now asserts the resolved service-vehicle section
      and verifies that the header back action returns to the PR page instead
      of `/order/new`
  - verified:
    - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
    - `pnpm exec biome check apps/frontend/src/pages/CommerceOrderDetailPage.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
    - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
  - planning artifact:
    `tasks/ride-hailing-ui-fixes/order-detail-back-and-resolved-vehicle-plan.md`
- Current implementation slice: RideHailing Order Detail Bill Card
  - `BillCard.vue` is now a domain-owned component whose only input is
    `billId`
  - the card fetches canonical bill detail via `useBillDetail(billId)`
  - the card does not repeat a local `账单` title or `Bill` eyebrow; it shows
    status tag, amount, and `查看` action only
  - RideHailing order detail now renders a `账单` section above
    `服务车型` whenever `detail.bill?.id` exists
  - bill amount currently uses the lightweight effective-total summary
    `chargeTotalFen - refundTotalFen`, matching the older Order Detail bill
    summary pattern
  - bill settlement display logic is now shared through
    `domains/commerce/model/bill-display.ts`
  - focused system scenario now asserts:
    - bill section appears after finished-state bill creation
    - bill section is ordered before resolved vehicle section
    - bill card shows `待支付` plus the expected amount
    - `查看` routes to `/bills/:billId`
    - bill detail can return to the order detail page
  - verified:
    - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
    - `pnpm exec biome check apps/frontend/src/domains/commerce/model/bill-display.ts apps/frontend/src/domains/commerce/ui/order-detail/BillCard.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue apps/frontend/src/pages/CommerceBillDetailPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
    - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
    - `git diff --check`
  - planning artifact:
    `tasks/ride-hailing-ui-fixes/order-detail-bill-card-plan.md`
- Implemented scenario coverage:
  - fake Caocao can mutate vehicle estimates through an admin-only test route
  - fake Caocao can mark per-car-type estimates unavailable for dynamic
    listing scenarios
  - RideHailing system scenario now covers submit-time price-change preflight
    and verifies provider order creation is blocked until the user confirms
  - RideHailing provider-create-failure scenario now verifies the failure dialog
    and no navigation to Order Detail
  - backend RideHailing foundation/callback scenarios now cover choice-set item
    foundation and provider binding in resolution
  - RideHailing system scenario now covers multi-candidate selection range and
    cheapest-first dispatch result
  - RideHailing system scenario now covers provider-unavailable vehicle types
    being omitted, quote refresh pruning vanished selected SKUs, and the
    all-unavailable no-create state
  - backend Quote-domain scenario now covers inactive Offer/SKU quote validity
    and invalid `CHOICE_SET` listing-session mixing
- Current slice exploration: Ordering entry decoupling
  - observed coupling point: `PRPage.vue` owns Button Placement click
    orchestration, existing PR order lookup, Placement ordering-entry
    resolution, raw handoff storage write, and `/order/new` navigation
  - observed non-coupling point: `OrderingFromPlacementPage.vue` itself only
    reads a handoff payload; it does not call Placement APIs
  - observed duplication: `OrderingSupportPage.vue` repeats raw
    `sessionStorage` parsing for `OrderingEntryPayload`
  - target direction: Button Placement or a composable called only by Button
    Placement owns the Placement-to-Ordering entry flow, and Ordering consumes a
    Commerce/Ordering Pinia handoff store
  - human decision: existing-order lookup, Placement ordering-entry resolution,
    handoff write, and `/order/new` navigation should all move into
    ButtonPlacement / `usePlacement...`; PR Page may pass `matchingContext` and
    `prId`
  - implementation status: production code changed locally; verification in
    complete
  - implementation shape: `PRPage` now passes only `matchingContext` and `prId`;
    `ButtonPlacement` calls `usePlacementOrderingEntryFlow`; `OrderingPage`
    reads `useOrderingHandoffStore`
  - verified:
    - `pnpm check:type:frontend`
    - `pnpm exec biome check` on the changed frontend/doc/task files
    - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
    - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
    - `git diff --check`
  - planning artifact:
    `tasks/ride-hailing-ui-fixes/ordering-entry-decoupling-plan.md`
- Current docs-promotion slice:
  - promoted stable product behavior into `docs/10-prd/behavior/workflows.md`
    and `docs/10-prd/behavior/rules-and-invariants.md`
  - added stable commerce vocabulary to `docs/10-prd/glossary.md`
  - corrected `docs/20-product-tdd/system-state-and-authority.md` so
    RideHailing provider binding lives in Trade order choice-set resolution,
    not on `ride_hailing_orders`
  - refined `docs/20-product-tdd/ecommerce-contracts.md` for `/order/new`
    topology, departure-time binding UX, quote-expired selection preservation,
    and RideHailing cancelled-create behavior
- Current mock-control slice implemented locally:
  - observed cause of rapid state collapse: `CommerceOrderDetailPage` polls
    order detail every 1500 ms, backend detail projection queries provider
    detail, and fake Caocao used to advance phase on each detail query
  - fake Caocao provider detail reads are now read-only by default
  - lifecycle movement is explicit through fake control routes that also post
    provider callbacks:
    - `POST /__fake_caocao/orders/latest/advance`
    - `POST /__fake_caocao/orders/:providerOrderId/advance`
    - `POST /__fake_caocao/orders/:providerOrderId/phase`
  - RideHailing Provider Instance Admin has a separate dev-only debug card that
    directly calls the selected provider instance `config.endpointBaseUrl`
    fake-control route; no backend proxy is introduced
  - planning artifact:
    `tasks/ride-hailing-ui-fixes/order-detail-mock-control-plan.md`
- Current Order Detail content slice implemented locally:
  - `CommerceOrderDetailPage.vue` still renders RideHailing UI inline
    historical note only; local implementation extracts it
  - current local code uses `PuPageScaffold padding="none"` for Order Detail
    Page
  - Rental detail keeps a document/card-stack wrapper with explicit padding and
    max width
  - RideHailing detail is extracted to `RideHailingOrderContent.vue`
  - RideHailing detail now uses shared immersive `RouteMap` plus a bottom
    `PuFloatPanel`
  - planning artifact:
    `tasks/ride-hailing-ui-fixes/order-detail-ride-hailing-content-plan.md`
- Map diagnostic:
  - the gray RideHailing Ordering map observation was confirmed as a browser
    client issue; shared map code is not part of the active fix.
- Verified:
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm check:format`
  - `pnpm check:lint`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - `pnpm exec biome check --write packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/state.test.ts packages/fake-caocao-server/src/server.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm check:type:frontend`
  - `pnpm check:type:backend`
  - explicit `pnpm exec biome lint` on changed source files
  - `pnpm check:lint:frontend`
  - `pnpm check:lint:backend`
  - `pnpm exec vitest run tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts --project system-scenario --reporter=verbose`
  - `pnpm check:config:backend`
  - `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec biome lint apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec biome format --write apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec biome lint apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/offer-quote-resolution.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm exec biome check packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts apps/backend/tests/commerce/offer-quote-resolution.scenario.test.ts`
  - `pnpm exec biome check apps/frontend/src/pages/OrderingFromPlacementPage.vue`
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - `git diff --check`
- Non-blocking note:
  - `pnpm check:lint` includes a report-only UI naming audit finding that
    `RideHailingOrderingContent` uses the weak word `Content`; this is kept
    because the human explicitly chose the name to align with the Ordering
    shell header/content/footer concepts.
- Historical exploration, superseded by the implemented Offer Listing / quote
  identity slice where it mentions old evaluate/options endpoints:
  - current slice: Offer-owned Product Listing and RideHailing quote identity
  - target problem: which RideHailing SKUs are listed should depend on route and
    departure time
  - current frontend chain: `RideHailingOrderingContent` uses catalog
    `offerDetail.spu.skuOptions` as fallback, then replaces it with
    `useRideHailingQuoteOptions({ source.offerId, route })` results
  - current backend chain: `/ordering/ride-hailing/options` accepts
    `offerId + route`, then `evaluateRideOptions` enumerates all active
    RideHailing catalog SKUs under the offer and calls provider estimate once
    per local SKU/provider vehicle type
  - current gap: `departureAt` already exists in bindings/create-order extras
    but is not included in quote-options input, query key, endpoint schema, or
    provider estimate params
  - current model limitation: provider availability is represented by local
    catalog SKUs whose estimates succeed/fail; there is no provider-owned
    "available vehicle types for route/time" capability yet
  - accepted plan direction: public listing query should use `offerId`, include
    price, and be Offer-owned
  - accepted plan direction: RideHailing listing returns only available local
    ACTIVE SKUs, omitting unavailable SKUs instead of returning
    `selectable=false`
  - accepted plan direction: Provider Port should return typed app-level quote
    shapes rather than raw `unknown`
  - accepted plan direction: listing returns product-type-independent commerce
    quote identity; order and pricing should natively support quote ids
  - accepted plan direction: quote validity belongs to the Quote domain; Order
    consumes validated quote facts instead of checking quote existence, expiry,
    active Offer/SKU, membership, or listing context one by one
  - accepted plan direction: create-order submits selected quote ids and derives
    Offer/SKU/route/departureAt/price from validated Quote-domain results
    instead of repeating those fields
  - accepted plan direction: order item command kinds remain semantic
    `FIXED` / `CHOICE_SET`; quote ids are carried as evidence fields such as
    `quoteId` or `candidateQuoteIds`, not as a `QUOTE_SET` item kind
  - accepted plan direction: quote snapshots are persisted to the database
  - accepted plan direction: quote expiry returns HTTP 409 problem details with
    a stable code, not an HTTP 200 result branch
  - accepted plan direction: new listing route is
    `POST /api/commerce/offers/:offerId/listing`
  - accepted plan direction: Rental migrates to the same unified Offer Listing
    endpoint in this slice
  - accepted plan direction: Ordering Content owns product listing/selection
    state and emits quote-bound draft output; Ordering Page / shell owns
    submit orchestration and create-order mutation
  - accepted plan direction: create-order product item payload is quote-only and
    does not include participants, riders, or contact phone
  - accepted plan direction: quote-expired refresh preserves selected SKU ids
    when the refreshed listing still contains matching SKUs, then requires
    another explicit create click
  - active plan artifact:
    `tasks/ride-hailing-ui-fixes/offer-listing-quote-identity-plan.md`
  - SKU should own full `ProductPresentation`; SKU preview images are not
    currently SKU-owned in the catalog contract
  - RideHailing vehicle selection should be multi-select
  - order modeling is under discussion: RideHailing may need native Order
    support for a choice-set item where the user authorizes several candidate
    SKUs but fulfillment resolves exactly one final SKU
  - accepted model direction: create-order stores an unresolved choice-set item,
    RideHailing Order lifecycle dispatch resolves one SKU inside the
    create-order transaction, UI displays candidate price range, and Bill is
    created from the resolved SKU / final settlement amount
  - resolution may be outside the candidate SKU set when provider reality
    requires it, such as free upgrade; resolution must record candidate
    relation and source instead of enforcing membership
  - long-term clean model takes priority over short-term low-risk command-shape
    shortcuts
  - command `items` should become a generic discriminated union supporting
    `FIXED` and `CHOICE_SET`
  - RideHailing SPU sales policy also needs a native choice-set selection
    policy; leaving it as `EXACTLY_ONE` would contradict the multi-select model
  - RideHailing provider instance should not be create-time required on
    `ride_hailing_orders`; it is SKU-bound product fact and read from the chosen
    candidate during dispatch
  - post-dispatch provider binding, including provider order id, should live
    only in the choice-set resolution snapshot, not on `ride_hailing_orders`
  - RideHailing dispatch policy starts cheapest-first
  - provider dispatch failure cancels the order
  - provider create failure is not retried against the next cheapest candidate
    or another provider
  - provider create failure returns a cancelled order id, and Ordering Page
    shows a failure dialog without navigating to Order Detail
  - RideHailing price-change preflight must compare selected candidate ranges,
    not only `totalFen`
  - provider substitution outside candidates keeps final settlement billing
    as-is
  - Order Detail is out of scope for the choice-set / SKU / FloatPanel slice;
    preserve the existing detail implementation and compatibility projection
  - target sequence is captured in
    `tasks/ride-hailing-ui-fixes/sequence-diagram.md`
  - large-slice implementation planning and information collection are captured
    in `tasks/ride-hailing-ui-fixes/choice-set-sku-float-panel-plan.md`
  - choice-set SKU / float-panel implementation has been committed in
    `42eb1a61`
