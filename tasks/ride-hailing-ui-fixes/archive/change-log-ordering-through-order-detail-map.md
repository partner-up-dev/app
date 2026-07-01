# Change Log

## Slice: Packet Setup

- Added task packet `tasks/ride-hailing-ui-fixes/` to replace the noisy
  historical `tasks/ride-hailing-mvp/` packet for new focused UI fixes.
- Added protocol requirement that Codex should raise objections when a proposed
  slice may harm functionality, boundaries, maintainability, readability, or UI
  contracts.
- Added `discussion-log.md` and `change-log.md` for ongoing packet history.

## Slice: RideHailing Ordering Content Layout

- Committed `f7ac1aa3 fix(ride-hailing): align ordering content layout`:
  - renamed `RideHailingOrderingPanel.vue` to
    `RideHailingOrderingContent.vue`
  - wired ride ordering content through the Ordering page shell as content
  - added ride-only no-padding shell support
  - removed `ordering-page__body` bottom padding
  - split RideHailing bottom sheet and drawer control row into sibling layers
  - changed price-detail toggle to a ghost circle `PuButton`
- Verification:
  - `pnpm check:type:frontend`
  - explicit Biome check on changed frontend files
  - `pnpm check:lint:frontend`

## Slice: Evaluation And RideHailing SKU Model Clarification

- Reorganized packet logs by event / slice instead of by calendar date.
- Recorded current implementation findings:
  - parent page evaluation currently owns price summary, create-order
    availability, blocking notice, and RideHailing evaluated options
  - RideHailing SKU options currently come from both catalog offer detail and
    evaluated provider quote options
- Recorded target model decision:
  - parent-page evaluation becomes submit-time create-order pre-flight only
  - footer price summary comes from Ordering Content
  - RideHailing SKU list ownership moves fully into RideHailing Ordering Content
  - parent-page evaluation no longer returns or owns `rideHailing.options`

## Slice: Submit-Time Preflight And RideHailing SKU Ownership

- Frontend:
  - added `OrderingContentSummary` price summary model
  - made Rental and RideHailing Ordering Content emit local price summary
  - moved footer price label and price detail source from evaluation output to
    Ordering Content summary
  - removed parent-page auto-evaluate watch
  - changed submit flow to `evaluate -> dialog if blocked/changed -> create`
  - moved RideHailing quote option fetching into
    `RideHailingOrderingContent`
- Backend:
  - added `POST /api/commerce/ordering/ride-hailing/options`
  - removed `rideHailing.options` from ordering evaluation response
  - added price explanations to RideHailing quote options
  - avoided double-applying dynamic-quote pricing policy during RideHailing
    pre-flight/create price resolution
- Docs:
  - updated `docs/20-product-tdd/ecommerce-contracts.md` for the submit-time
    pre-flight model and RideHailing options endpoint.
- Verification:
  - `pnpm check:type:frontend`
  - `pnpm check:type:backend`
  - explicit `pnpm exec biome lint` on changed source files
  - `pnpm check:lint:frontend`
  - `pnpm check:lint:backend`
  - `pnpm exec vitest run tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts --project system-scenario --reporter=verbose`

## Slice: RideHailing Preflight Price-Change Scenario

- Fake Caocao:
  - added an admin-only `POST /__fake_caocao/estimates` test control route
    for updating a vehicle estimate during scenario setup
  - added `FakeCaocaoState.updateEstimate`
  - covered estimate mutation in fake server state and HTTP server tests
- Scenario:
  - added
    `commerce_ride_hailing_preflight_price_change_requires_confirmation`
  - the scenario opens RideHailing Ordering with the original provider quote,
    mutates the selected vehicle quote, clicks create order, verifies the
    price-change confirmation dialog, verifies no provider order exists before
    confirmation, then confirms and reaches order detail
- Verification:
  - `pnpm exec biome check --write packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/state.test.ts packages/fake-caocao-server/src/server.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm exec vitest run tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts --project system-scenario --reporter=verbose`
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`

## Slice: Choice-Set SKU And Float Panel Planning

- Added
  `tasks/ride-hailing-ui-fixes/choice-set-sku-float-panel-plan.md`.
- Recorded pre-implementation information collection across:
  - durable ecommerce contract
  - backend catalog/order/ride-hailing/bill/job-runner implementation
  - frontend ordering/order-detail implementation
  - design-web primitive contracts
  - current RideHailing system scenario expectations
- Updated control and discussion logs to mark this slice as blocked on plan
  review, Impact Handshake, and explicit `开始` before production-code work.

## Slice: Choice-Set Plan Review Corrections

- Revised the large-slice plan according to review:
  - prioritize long-term clean domain model over low-risk shortcuts
  - remove `productTypedExtraProperties.acceptableSkuIds` from the target
  - promote command `items` to a generic discriminated union
  - remove required create-time provider pre-binding from
    `ride_hailing_orders`
  - record cheapest-first dispatch policy
  - record provider dispatch failure as order cancellation
  - record final settlement billing as-is for provider substitution outside
    candidates
- Updated the sequence diagram to match the corrected command and provider
  ownership model.

## Slice: Choice-Set Dispatch Lifecycle Review

- Revised the planning artifacts according to review:
  - keep provider dispatch inside the create-order transaction for this slice
    because dispatch is also RideHailing Order lifecycle
  - store post-dispatch provider binding only in the choice-set resolution
    snapshot
  - cancel on provider create failure without retrying the next cheapest
    candidate, another vehicle type, or another provider
  - return the cancelled order id for provider create failure while keeping the
    user on Ordering Page with a failure-reason dialog
  - exclude Order Detail redesign from this slice and preserve the current
    legacy detail implementation
- Removed the previous async JobRunner dispatch direction from the active plan
  and sequence diagram.

## Slice: Choice-Set Final Plan Review

- Reviewed the large-slice plan against current durable docs and key backend /
  frontend code paths.
- Added implementation-readiness findings to the plan:
  - RideHailing SPUs need a native choice-set `SkuSelectionPolicy`
  - provider order id moves with provider instance id into choice-set
    resolution
  - callback/detail/payment-confirmation paths need a shared provider-binding
    reader
  - Trade order-item helpers must become union-aware
  - create-order result becomes a `CREATED` / `CANCELLED` discriminated union
  - RideHailing preflight compares selected candidate range instead of total
  - implementation should start with durable contract/schema/model changes

## Slice: Choice-Set Backend Foundation Segment 1

- Durable contract:
  - updated `docs/20-product-tdd/ecommerce-contracts.md` for SKU-level
    presentation, `CHOICE_SET` SKU selection policy, fixed vs choice-set command
    items, create-order `CREATED` / `CANCELLED` result, RideHailing provider
    binding ownership, and final bill timing.
- Catalog/backend schema:
  - added `product_skus.presentation` with an empty-presentation default
  - extended SKU model/create/update/admin schemas/projections to carry SKU
    presentation
  - extended `SkuSelectionPolicy` with `CHOICE_SET`
  - removed `ride_hailing_orders.provider_instance_id` and
    `provider_order_id`
- Trade/RideHailing model:
  - promoted order item snapshots to a union of `FIXED` and `CHOICE_SET`
  - added RideHailing choice-set candidate, quote, resolution, and provider
    binding snapshots
  - made order-item helpers fixed-aware and added RideHailing choice-set /
    provider-binding readers
  - added `TradeOrderRepository.replaceItems`
- Create/evaluate lifecycle:
  - promoted commerce command `items` to a generic discriminated union
  - RideHailing submit/evaluate now use one `CHOICE_SET` item with candidate
    SKU ids
  - submit-time RideHailing evaluation quotes only selected candidates and
    returns candidate range
  - create-order creates an unresolved choice-set item, creates the
    RideHailing order lifecycle row, dispatches cheapest-first, writes
    provider binding into resolution, and opens the base order
  - provider create failure marks the order cancelled and returns
    `outcome: "CANCELLED"` with a user-displayable reason
  - no retry is attempted against the next candidate/provider
- Callback/detail/payment compatibility:
  - Caocao callback, live detail projection, and provider fee confirmation now
    recover provider binding from the choice-set resolution
  - current Order Detail is preserved with compatibility SKU readers and legacy
    selected-vehicle projection
- Frontend bridge:
  - RideHailing Ordering Content now emits a `CHOICE_SET` item; in segment 1 it
    remains single-select, so the candidate set contains the selected SKU only
  - Ordering Page compares preflight price ranges and branches on
    create-order `CANCELLED` without navigating to Order Detail
- Scenario/test updates:
  - backend RideHailing foundation and Caocao callback scenarios were updated to
    the choice-set / resolution provider-binding model
  - RideHailing system scenario now expects selected-candidate pricing and a
    provider-create-failure dialog
- Verification:
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm check:config:backend`
  - `git diff --check`
  - explicit `pnpm exec biome lint` on changed source/test files

## Slice: Choice-Set Ordering UI Segment 2

- RideHailing Ordering UI:
  - migrated `RideHailingSkuCard` from a custom button implementation to
    `PuCard selectable` composition
  - composed `PuCheckbox` as the visual selection affordance while keeping the
    card as the single interactive option target
  - added SKU hero/detail image preview resolution with the existing direct URL
    fallback rule; non-displayable asset ids fall back to the car icon preview
  - migrated RideHailing selection state to `usePuSelect<number>` with
    `multiple: true`
  - default selection keeps the cheapest/default selectable candidate, and
    additional card taps add/remove candidates
  - Ordering Content now submits actual multi-candidate `CHOICE_SET`
    candidate ids and derives footer range from the selected candidate set
  - price explanations are taken from the cheapest selected candidate as the
    dispatch basis
- Float panel:
  - replaced the custom absolute bottom sheet with `PuFloatPanel`
  - added three stops: minimized, normal, expanded
  - panel stops are calculated from the Ordering Content container height via
    `ResizeObserver`
  - route-map fit padding now follows the active panel stop while preserving the
    bottom control row as a sibling layer
- Scenario:
  - updated RideHailing system scenario to select both 快车 and 专车, assert the
    selected candidate price range, and expect cheapest-first dispatch to 快车
  - updated price-change dialog expectation from single-price comparison to
    selected-candidate range comparison
- Verification:
  - `pnpm check:type:frontend`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec biome lint apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: Choice-Set SKU Card Layout Remediation Segment 3

- RideHailing SKU Card:
  - corrected the Segment 2 card from a list-item-like layout to the reviewed
    left/right layout
  - left side now owns SKU name + info icon and the SKU preview area
  - right side now owns estimated text, amount, and checkbox, all right-aligned
  - checkbox now sits below the amount
  - removed the card-internal status/reason display concept; unavailable quoted
    options continue to be hidden by the list layer
  - removed the 420px media rule that hid the preview
  - kept `PuCard selectable`, visual-only `PuCheckbox`, `usePuSelect`
    multi-select ownership, preview fallback, and semantic test ids stable
- Verification:
  - `pnpm exec biome format --write apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec biome lint apps/frontend/src/domains/commerce/ui/ordering/RideHailingSkuCard.vue apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm check:type:frontend`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: Offer Listing And Quote Identity

- Backend:
  - added persisted product-type-independent `commerce_quotes`
  - added `CommerceQuoteRepository`
  - added Offer-owned `POST /api/commerce/offers/:offerId/listing`
  - added typed RideHailing provider quote output for estimate adapters
  - added Quote-domain quote-bound order item resolver
  - made create-order product items quote-only:
    `FIXED.quoteId` and `CHOICE_SET.candidateQuoteIds`
  - moved participants, Rental registrants/contact, RideHailing riders/contact,
    route, departureAt, price, SKU, and Offer facts into validated quote/listing
    snapshots
  - removed old backend `/ordering/evaluate`,
    `/ordering/ride-hailing/options`, and unused `evaluateRideOptions`
    surfaces
  - quote expiry now returns HTTP 409 with code `ORDERING_QUOTE_EXPIRED`
- Frontend:
  - added `useOfferListing`
  - migrated Rental Ordering Content to unified listing quotes
  - migrated RideHailing Ordering Content to unified listing quotes keyed by
    route + departureAt
  - removed create-order preflight/evaluate orchestration from the Ordering
    Page
  - quote-expired create failure refreshes listing, preserves matching selected
    SKU ids, and requires a second explicit create click
  - added imported departure-time prompt with default "now" behavior and drawer
    apply action
  - updated the imported departure-time prompt to display the concrete imported
    date/time value, not only a generic "has departure time" message
  - added a Drawer one-tap "现在出发" action so users can switch back from an
    imported/manual departure time to depart-now
  - removed `data-testid` attributes from `PuDialog` calls that could not
    inherit them and caused Vue warnings
- Durable docs:
  - updated `docs/20-product-tdd/ecommerce-contracts.md` for Offer Listing,
    quote identity, quote-only create-order payloads, Quote-owned validity, and
    quote-expired HTTP 409 behavior
- Scenario:
  - replaced the old RideHailing price-change preflight scenario with
    quote-expired refresh/preserve-selection coverage
  - updated Rental PR blocker scenarios to assert create-click dialog behavior
    after unified listing quote issuance
- Verification:
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm check:type:frontend` after the imported departure-time display
    follow-up
  - `pnpm check:type:frontend` after the Drawer depart-now follow-up
  - `pnpm check:format`
  - `pnpm check:lint`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
    after the imported departure-time display follow-up
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
    after the Drawer depart-now follow-up
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
- Non-blocking:
  - `pnpm check:lint` reports the existing report-only naming audit finding for
    `RideHailingOrderingContent`; this is intentionally retained because the
    name matches the reviewed Ordering shell content role.

## Slice: Offer Listing And Quote Identity Test Hardening

- Fake Caocao:
  - added a test-control estimate availability switch per car type
  - unavailable estimate requests now return provider failure, letting the
    Offer Listing resolver exercise its "omit unavailable SKU" behavior
- RideHailing system scenario:
  - added coverage that a provider-unavailable vehicle type is hidden from the
    Ordering Page SKU list
  - added coverage that quote-expired refresh preserves still-listed selected
    SKUs but prunes selected SKUs that disappeared from the refreshed listing
  - added coverage that all provider-unavailable vehicle types produce no
    vehicle cards, a pending price, a disabled create action, and no provider
    order
- Backend Quote-domain scenario:
  - added coverage that quote validity rejects inactive Offer and inactive SKU
  - added coverage that `CHOICE_SET` candidate quotes must come from one
    `listingSessionId`
- Verification:
  - `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/offer-quote-resolution.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm check:type:backend`
  - `pnpm check:type:frontend`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm exec biome check packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts apps/backend/tests/commerce/offer-quote-resolution.scenario.test.ts`
  - `git diff --check`

## Slice: Ordering Error Feedback Simplification

- Frontend:
  - removed `OrderingFloatingNoticeLayer` from `OrderingFromPlacementPage`
  - deleted the unused floating notice component
  - removed the duplicate floating error-message state now that create-order
    failures and quote-expired cases are explained by Dialog
- Verification:
  - `pnpm check:type:frontend`
  - `pnpm exec biome check apps/frontend/src/pages/OrderingFromPlacementPage.vue`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: RideHailing SKU List Loading Skeleton

- Frontend:
  - added `PuSkeleton` placeholders inside the RideHailing SKU list area
  - skeletons follow the reviewed vehicle-card left/right layout shape
  - skeletons show only for the initial listing load when no visible quote
    options exist; background refetch keeps the existing cards visible
- Verification:
  - `pnpm check:type:frontend`
  - `pnpm exec biome check apps/frontend/src/domains/commerce/ui/ordering/RideHailingOrderingContent.vue`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: Offer Listing And Quote Identity Planning

- Added standalone plan:
  `tasks/ride-hailing-ui-fixes/offer-listing-quote-identity-plan.md`.
- Captured accepted direction:
  - public listing query uses `offerId`
  - listing is Offer-owned because it includes commercial membership and price
  - RideHailing dynamic availability depends on route and departure time
  - RideHailing unavailable SKUs are omitted, not returned as
    `selectable=false`
  - Provider Port should return typed app-level quote shapes instead of
    `unknown`
  - listing returns quote identity and create-order submits quote identity
  - expired quote replaces RideHailing price-diff preflight
- Added plan review sections covering owner fit, main objections/risks, and
  review questions before implementation.
- Revised the plan after review:
  - quote identity is now product-type-independent and commerce/order native,
    not RideHailing-specific
  - order and pricing should support quote ids natively
  - create-order should derive Offer/SKU/route/departureAt/price from quote
    snapshots instead of repeating them in the payload
  - quote snapshots are persisted in the database
  - expired quote is HTTP 409 problem details with a stable code
  - the route shape is fixed as `POST /api/commerce/offers/:offerId/listing`
- Re-reviewed the plan for maintainability, readability, and complexity:
  - moved quote existence, expiry, active Offer/SKU, membership, and
    listing-context coherence behind a Quote-domain validity resolver
  - rejected `QUOTE_SET` as a command item kind and kept order item semantics as
    `FIXED` / `CHOICE_SET` with quote ids as evidence fields
  - renamed the working domain concept from `CommerceQuoteSnapshot` to
    `OfferQuote`
  - renamed `listingId` to `listingSessionId`
  - clarified that generic quote JSON snapshots are persistence envelopes and
    must be decoded before Order, Pricing, or RideHailing lifecycle consumes
    them
  - added topology and sequence reviews to the standalone plan
- Revised the plan after additional review:
  - corrected the frontend topology so Ordering Content emits quote-bound draft
    state and Ordering Page / shell calls Create Order
  - resolved quote-expired refresh behavior as preserving matching selected SKU
    ids while still requiring a second click
  - resolved create-order product item payload as quote-only, excluding
    participants/riders/contact phone
  - resolved Rental migration into the unified Offer Listing endpoint for this
    slice
  - added `quoteId` to fixed listed items and renamed RideHailing listed item
    kind from `QUOTE` to `CHOICE_CANDIDATE`

## Slice: Ordering Entry Decoupling Planning

- Added standalone plan:
  `tasks/ride-hailing-ui-fixes/ordering-entry-decoupling-plan.md`.
- Captured current coupling:
  - PR Page owns existing-order lookup, Placement ordering-entry resolution,
    raw `sessionStorage` write, and `/order/new` navigation
  - Ordering Page and Ordering Support duplicate raw handoff parsing
  - backend Placement ordering-entry already owns binding/context resolution
- Captured target direction:
  - Button Placement or its dedicated composable owns the
    Placement-to-Ordering entry flow
  - existing-order lookup, Placement ordering-entry resolution, handoff write,
    and `/order/new` navigation all move out of PR Page
  - PR Page may pass `matchingContext` and `prId` to Button Placement
  - Ordering handoff moves behind a Commerce/Ordering Pinia store
  - `/order/new` keeps its route path/name but the page becomes generic
    `OrderingPage`
  - PR Page only mounts Button Placement and passes matching context

## Slice: Ordering Entry Decoupling Implementation

- Frontend:
  - added `useOrderingHandoffStore` for `OrderingEntryPayload`
  - added payload normalization/parsing helpers beside the ordering-entry model
  - moved existing-order lookup, Placement ordering-entry resolution, handoff
    write, and navigation into `usePlacementOrderingEntryFlow`
  - updated `ButtonPlacement` to call the entry-flow composable directly and
    accept `prId`
  - removed Commerce/Ordering entry-flow logic from `PRPage`
  - renamed `OrderingFromPlacementPage.vue` to `OrderingPage.vue`
  - updated `/order/new` lazy import without changing route path/name
  - updated `OrderingSupportPage` to read ordering entry handoff from the same
    store
- Durable docs:
  - updated ecommerce contract to assign entry-flow ownership to Button
    Placement and the Commerce Ordering handoff store
- Verification:
  - `pnpm check:type:frontend`
  - `pnpm exec biome check apps/frontend/src/app/router.ts apps/frontend/src/pages/PRPage.vue apps/frontend/src/pages/OrderingPage.vue apps/frontend/src/pages/OrderingSupportPage.vue apps/frontend/src/domains/commerce/model/ordering-entry-storage.ts apps/frontend/src/domains/commerce/queries/useCommerce.ts apps/frontend/src/domains/commerce/ui/ButtonPlacement.vue apps/frontend/src/domains/commerce/use-cases/useOrderingHandoffStore.ts apps/frontend/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts docs/20-product-tdd/ecommerce-contracts.md tasks/ride-hailing-ui-fixes/control.md tasks/ride-hailing-ui-fixes/discussion-log.md tasks/ride-hailing-ui-fixes/change-log.md tasks/ride-hailing-ui-fixes/ordering-entry-decoupling-plan.md`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: Durable Docs Promotion

- PRD:
  - added PR-attached commerce ordering workflow to
    `docs/10-prd/behavior/workflows.md`
  - added commerce ordering invariants to
    `docs/10-prd/behavior/rules-and-invariants.md`
  - added stable commerce terms to `docs/10-prd/glossary.md`
- Product TDD:
  - corrected `docs/20-product-tdd/system-state-and-authority.md` so
    RideHailing provider binding is owned by Trade order choice-set resolution,
    not `ride_hailing_orders`
  - refined `docs/20-product-tdd/ecommerce-contracts.md` for `/order/new`
    ordering topology, `offerDetail` projection semantics, departure-time
    binding UX, quote-expired selection preservation, and RideHailing
    cancelled-create behavior
- Verification:
  - `pnpm check:format` (markdown files are ignored by Biome changed-file
    formatting; command completed successfully with no processed files)
  - `git diff --check`
  - `rg` stale-contract search for old Offer Detail ordering, old
    `OrderingFromPlacementPage`, old provider-binding wording, old
    evaluate/options endpoints, and `selectable=false`

## Slice: RideHailing Order Detail Mock Control Planning

- Added standalone plan:
  `tasks/ride-hailing-ui-fixes/order-detail-mock-control-plan.md`.
- Recorded diagnosis:
  - fake Caocao currently advances order phase on provider detail reads
  - Order Detail polling every 1500 ms indirectly drives fake lifecycle
  - backend callbacks from those fake reads move persisted execution phase and
    create final bill after `FINISHED`
- Proposed direction:
  - make fake provider detail reads read-only by default
  - add explicit fake admin/test-control routes for phase set/advance
  - post callbacks from explicit fake lifecycle controls

## Slice: RideHailing Order Detail Mock Control Implementation

- Fake Caocao:
  - made `/common/queryOrderDetailV2` read-only for order phase
  - replaced read-driven phase advancement with explicit state helpers for
    setting and advancing order phase
  - added fake control routes:
    `POST /__fake_caocao/orders/latest/advance`,
    `POST /__fake_caocao/orders/:providerOrderId/advance`, and
    `POST /__fake_caocao/orders/:providerOrderId/phase`
  - control routes post the corresponding provider callback after moving fake
    state, so backend order execution state still changes through provider
    callback handling
  - preserved create-time accepted callback behavior
- Frontend Admin:
  - added a separate dev-only RideHailing Provider Instance debug card
  - the card directly calls the selected provider instance
    `config.endpointBaseUrl` fake Caocao control route
  - no backend admin proxy was introduced
- Scenario:
  - strengthened RideHailing order-detail scenario coverage so repeated detail
    polling does not auto-advance fake provider phase past `ACCEPTED`
- Verification:
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm check:type:frontend`
  - `pnpm exec biome check packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/state.test.ts packages/fake-caocao-server/src/server.test.ts apps/frontend/src/pages/AdminRideHailingPage.vue tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `git diff --check`

## Slice: RideHailing Order Detail Content Redesign Planning

- Added standalone plan:
  `tasks/ride-hailing-ui-fixes/order-detail-ride-hailing-content-plan.md`.
- Recorded current implementation facts:
  - RideHailing detail content is still inline in `CommerceOrderDetailPage.vue`
  - current detail map is a CSS placeholder
  - no extracted `RideHailingOrderContent` component exists yet
  - current scenario IDs to preserve are
    `order-detail.ride-hailing.page`,
    `order-detail.ride-hailing.selected-vehicle`, and
    `order-detail.ride-hailing.route-summary`
- Recorded target direction:
  - use `PuPageScaffold padding="none"` for Order Detail Page
  - extract RideHailing full-screen map / float-panel content into
    `RideHailingOrderContent.vue`
  - reuse shared `RouteMap` and `PuFloatPanel`
  - keep Rental detail on the existing card-stack path

## Slice: RideHailing Order Detail Content Redesign Implementation

- Frontend:
  - changed `CommerceOrderDetailPage.vue` to
    `PuPageScaffold viewport="screen" width="full" padding="none"`
  - kept Rental order detail on the existing document/card stack with explicit
    page-local padding and max width
  - extracted RideHailing order detail UI into
    `apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue`
  - replaced the CSS fake route illustration with shared immersive `RouteMap`
  - added a RideHailing bottom `PuFloatPanel` with overview, detail, and
    expanded stops
  - preserved existing RideHailing Order Detail scenario test ids on
    equivalent semantic nodes
- Verification so far:
  - `pnpm check:type:frontend`
  - `pnpm exec biome check apps/frontend/src/pages/CommerceOrderDetailPage.vue apps/frontend/src/domains/commerce/ui/order-detail/RideHailingOrderContent.vue tasks/ride-hailing-ui-fixes/control.md tasks/ride-hailing-ui-fixes/discussion-log.md tasks/ride-hailing-ui-fixes/change-log.md tasks/ride-hailing-ui-fixes/order-detail-ride-hailing-content-plan.md`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Slice: RideHailing Order Detail Map And Live Route Planning

- Added standalone plan:
  `tasks/ride-hailing-ui-fixes/order-detail-ride-hailing-map-plan.md`.
- Recorded current implementation gaps:
  - Order Detail map currently renders only persisted planned route geometry
  - backend projection lacks provider live route, vehicle coordinate, and
    vehicle heading
  - local RideHailing lifecycle lacks an arrived-at-pickup phase
  - `RouteMap` is generic and should not absorb RideHailing lifecycle semantics
- Recorded target model:
  - introduce typed provider order detail, driver location, and driver route
    snapshots
  - promote Caocao driver-location and pickup/dropoff route APIs into the
    provider port
  - add `ARRIVED_AT_PICKUP` to RideHailing execution phase
  - build a pure frontend map view-model for phase-specific map rendering
- Recorded verification direction:
  - fake Caocao unit coverage for phase/live geometry
  - backend provider/callback projection coverage
  - frontend pure map view-model tests
  - RideHailing system scenario coverage for accepted, arrived, in-trip, and
    finished map states

## Slice: RideHailing Order Detail Map And Live Route Backend Segment

- Provider port:
  - changed `RideHailingProviderPort.queryOrderDetail` from raw `unknown` to
    typed `RideHailingProviderOrderDetail`
  - added typed `queryDriverLocation` and `queryDriverRoute` provider methods
  - added provider-level coordinate, vehicle-location, and navigation-route
    models
- Caocao adapter:
  - normalizes `queryOrderDetailV2` into typed driver, vehicle, status label,
    final amount, and optional vehicle location snapshots
  - implements `queryDriverLocationByOrderId`
  - implements `queryDriverPolylineV2` and parses route kind, polyline,
    remaining distance/time, traffic-light count, and ETA vehicle location
- RideHailing lifecycle:
  - added local execution phase `ARRIVED_AT_PICKUP`
  - corrected Caocao callback mapping for accepted, arrived, in-trip,
    finished, and cancellation events
  - preserves current execution phase for non-lifecycle Caocao events such as
    route/price/invoice style callbacks
- Order Detail projection:
  - strips provider raw snapshots before returning `ride.live`
  - includes typed `vehicleLocation` and `navigationRoute`
  - keeps provider location/route query failures from failing the whole Order
    Detail projection
- Fake Caocao:
  - added fake `ARRIVED_AT_PICKUP`
  - changed explicit advance chain to
    `CREATED -> ACCEPTED -> ARRIVED_AT_PICKUP -> IN_TRIP -> FINISHED`
  - stores fake order origin/destination from order-create route params
  - added fake driver location and route V2 endpoints
  - switched fake callbacks to official-like lifecycle events while preserving
    create-time accepted callback behavior
- Verification:
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit -t "Caocao"`
  - `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario -t "Caocao callback"`
  - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
  - `pnpm exec biome format --write` on the changed backend/fake files
  - `git diff --check`

## Slice: RideHailing Order Detail Map And Live Route Frontend Segment

- Route map:
  - added generic `extraMarkers` and `extraPolylines` props to `RouteMap`
  - added `showFallbackPolyline` so callers can hide RouteMap's straight-line
    fallback when a domain-specific mode needs marker-only geometry
  - kept RideHailing lifecycle semantics out of `RouteMap`
- RideHailing Order Detail:
  - added a pure `buildRideHailingOrderMapViewModel` helper
  - maps `DISPATCHING` / `INITIATING` to an origin-focused searching mode
  - maps `ACCEPTED` to provider pickup route plus driver marker when live data
    is available
  - maps `ARRIVED_AT_PICKUP` to driver-marker-only display
  - maps `IN_TRIP` to provider remaining route plus driver marker, with muted
    planned-route fallback when provider route is unavailable
  - keeps `FINISHED`, `CANCELLED`, and `FAILED` on planned route behavior
  - uses only local `ride.executionPhase` to decide map mode; provider live
    phase/status no longer advances map state ahead of the persisted lifecycle
  - added fallback copy for the arrived-at-pickup phase
  - exposes `data-map-mode` on the route map for stable scenario assertions
  - temporarily replaced the `PuFloatPanel` content with raw order /
    RideHailing / bill / payment / map-view-model JSON for manual diagnosis
  - removed the temporary absolute-positioned ripple overlay because it was not
    actually bound to the route origin marker
- Tests:
  - added frontend unit tests for the RideHailing map view-model phase matrix
  - extended the RideHailing system scenario to manually advance fake Caocao
    through accepted, arrived-at-pickup, in-trip, and finished map modes
  - system scenario now verifies initial post-create local `DISPATCHING`
    remains `SEARCHING_ORIGIN`, then explicitly posts accepted callback before
    expecting pickup geometry
- Verification:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec vitest run --config vitest.config.ts --project frontend-unit -t "buildRideHailingOrderMapViewModel"`
  - `pnpm exec vitest run --config vitest.config.ts --project system-scenario -t "commerce_ride_hailing_ordering_reaches_order_detail"`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm --dir apps/backend exec tsc --noEmit -p tsconfig.json`
  - `pnpm exec biome format --write` on the changed frontend/scenario files
  - `git diff --check`

## Slice: RideHailing Order Detail Map Manual Review Corrections

- Shared Tencent map provider:
  - changed single-coordinate fitting from `easeTo(center)` to a tiny
    `fitBounds` area so `fitPadding` is respected for one active marker
  - preserved the existing single-point max zoom cap
  - kept the fix generic in shared map infrastructure rather than adding a
    RideHailing-specific offset
- RideHailing impact:
  - `DISPATCHING` origin focus can now account for the bottom `PuFloatPanel`
    overlay when the active geometry is only `route-point-0`
- Verification:
  - `pnpm --dir apps/frontend exec vue-tsc --noEmit`
  - `pnpm exec vitest run --config vitest.config.ts --project frontend-unit -t "buildRideHailingOrderMapViewModel"`
  - `pnpm exec biome check apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`
  - `git diff --check -- apps/frontend/src/shared/map/tencent/tencent-lbs-provider.ts`

## Planned Slice: RideHailing Order Detail PuFloatPanel Content

- Planned panel content:
  - replace raw JSON diagnostic content
  - add Status Hero with status title/description, cancel action, and more
    operation button
  - show readonly RideHailing SKU candidate cards only while dispatching
  - add larger spacing before lifecycle-independent ride facts
  - render exactly two ride fact sections: route and riders
- Planned component support:
  - extend `RideHailingSkuCard` with a readonly/no-checkbox shape while keeping
    the Ordering Page default selectable behavior unchanged
- Explicit non-goals:
  - no provider facts
  - no bill/payment facts
  - no driver facts
  - no extra card stack or summary content
