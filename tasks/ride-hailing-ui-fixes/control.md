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
- Active mode: `Execute` only after a concrete issue is named and approved
- Current collaboration state: waiting for the human to name the next concrete
  UI issue

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
- `OrderingFromPlacementPage.vue` is the shared ordering shell.
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
- `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Verification

Choose the narrowest sufficient proof per approved slice:

- `pnpm check:type:frontend`
- focused browser/manual check through PR placement when the issue is visual or
  interaction-specific
- `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  when browser-visible workflow behavior or stable test IDs change

## Current State

- Committed slice: RideHailing ordering content naming and layout correction
  (`f7ac1aa3`).
- Implemented but not committed slice: submit-time ordering pre-flight and
  RideHailing SKU ownership correction.
- Current target model now reflected in code:
  - parent-page evaluation runs only after submit/create-order click
  - blocking pre-flight results open an acknowledgement dialog
  - changed pre-flight price opens a confirmation dialog before create order
  - footer price summary comes from Ordering Content summary
  - RideHailing quote options are loaded by `RideHailingOrderingContent`
  - parent-page evaluation no longer returns or owns `rideHailing.options`
- Implemented scenario coverage:
  - fake Caocao can mutate vehicle estimates through an admin-only test route
  - RideHailing system scenario now covers submit-time price-change preflight
    and verifies provider order creation is blocked until the user confirms
- Map diagnostic:
  - the gray RideHailing Ordering map observation was confirmed as a browser
    client issue; shared map code is not part of the active fix.
- Verified:
  - `pnpm exec biome check --write packages/fake-caocao-server/src/state.ts packages/fake-caocao-server/src/routes.ts packages/fake-caocao-server/src/state.test.ts packages/fake-caocao-server/src/server.test.ts tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  - `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
  - `pnpm --filter @partner-up-dev/fake-caocao-server test`
  - `pnpm check:type:frontend`
  - `pnpm check:type:backend`
  - explicit `pnpm exec biome lint` on changed source files
  - `pnpm check:lint:frontend`
  - `pnpm check:lint:backend`
  - `pnpm exec vitest run tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts --project system-scenario --reporter=verbose`
- Non-blocking note:
  - `pnpm exec biome check ...` reports whole-file formatting differences in
    already-touched large files; this slice did not auto-format those whole
    files to avoid unrelated churn.
