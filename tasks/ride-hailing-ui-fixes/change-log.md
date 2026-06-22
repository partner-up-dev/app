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
