# Flow Correction

## Problem Statement

The current Ride Hailing web flow violates the existing commerce contract.

Current browser path:

- `PR Page`
- `/order/new`
- `ordering.ride-hailing.create-order`
- `/order/support`

Contract path:

- `PR Page`
- `/order/new`
- `POST /api/commerce/orders`
- `/orders/:orderId`

## Evidence

- Frontend route families are wired in
  `apps/frontend/src/app/router.ts`.
- Current submit behavior is implemented in
  `apps/frontend/src/pages/OrderingFromPlacementPage.vue`.
- Real create-order frontend query already exists in
  `apps/frontend/src/domains/commerce/queries/useCommerce.ts`.
- Real backend create-order route already exists in
  `apps/backend/src/controllers/commerce.controller.ts`.
- Current scenario expectation still asserts `/order/support` in
  `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`.

## Current Diagnosis

- `OrderingFromPlacementPage.vue` already does real quote evaluation and create
  preflight gating.
- The main CTA label implies order creation, but the action actually serializes
  a support handoff payload and routes to `/order/support`.
- This creates structural confusion:
  - the ordering page looks like a checkout surface
  - the contract says it is a checkout surface
  - the implementation uses it as a support lead-capture surface

## Required Direction

- Remove support handoff from the primary Ride Hailing create path.
- Make the CTA semantics honest again:
  - if the button says create order, it must create an order
  - if support remains needed, it should be a secondary fallback or an explicit
    support entry, not the primary meaning of `下单`

## Implemented Slices

1. Restore real order creation in `OrderingFromPlacementPage.vue`.
2. Route create success to `/orders/:orderId`.
3. Rewrite scenario expectations from support handoff to order detail.
4. Keep `/order/support` in place as dead code / secondary tooling, not the
   primary happy path.

## Result

- The shared `/order/new` submit path now creates real orders for the current
  ordering families instead of serializing a support payload.
- Ride-hailing system scenarios now prove:
  - successful create reaches `/orders/:orderId`
  - provider-create failure stays on `/order/new` and surfaces an error
- Rental scenarios were updated too because the wrong submit topology lived in
  the shared ordering page rather than in a ride-only branch.

## Remaining Question

- Should `/order/support` survive as a manual recovery path at all?
- If yes, should it be reachable only from explicit support / recovery actions
  instead of normal create-order success?
