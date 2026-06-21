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
