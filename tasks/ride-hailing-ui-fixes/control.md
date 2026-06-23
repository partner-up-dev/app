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

- Primary route: `Constraint`
- Active mode: `Solidify` for durable docs promotion
- Current collaboration state: choice-set backend/domain foundation, Ordering
  UI primitive/control, SKU Card layout remediation, and Offer Listing / quote
  identity segments committed; Ordering entry decoupling committed; current
  slice promotes stable task-packet facts into durable PRD / Product TDD docs

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
- `RouteMap.vue` / shared map code are relevant when a UI issue concerns route
  geometry, marker behavior, or zoom/pan behavior.

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
- focused browser/manual check through PR placement when the issue is visual or
  interaction-specific
- `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  when browser-visible workflow behavior or stable test IDs change
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  when Rental ordering is affected by unified listing / quote identity

## Current State

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
    concepts
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
- Map diagnostic:
  - the gray RideHailing Ordering map observation was confirmed as a browser
    client issue; shared map code is not part of the active fix.
- Verified:
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm check:format`
  - `pnpm check:lint`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
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
