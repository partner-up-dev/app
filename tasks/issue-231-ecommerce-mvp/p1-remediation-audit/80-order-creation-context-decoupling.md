# Order Creation Context Decoupling

## Objective & Hypothesis

Fix the remaining coupling where Trade order creation directly reads PR context.

Hypothesis: order creation should materialize an Order from an already resolved
order context. PR-specific participant lookup, permission checks, and
PR-to-order attachment should stay in PR-aware ordering orchestration.

## Guardrails Touched

- Trade owns base Order, typed Order rows, pricing snapshot persistence, split
  snapshot persistence, and Bill seed creation.
- PR Core owns PR status, creator, active-participant, and current
  non-terminal `(prId, offerId)` attachment authority.
- Placement/Ordering orchestration may combine PR + Offer lookup and call both
  Trade order creation and PR attachment inside one transaction.
- Order creation must not import `PartnerRepository`, `PRId`, or
  `attachOrderToPr`.

## Current Diagnosis

- `createRentalOrder` accepts `prId`, loads active PR participants, builds
  Order participants from PR state, attaches the created order to PR, and writes
  a PR-specific BillLine description.
- `createRideHailingOrderFoundation` has the same direct PR participant lookup
  and PR attachment.
- This makes the Trade creation use cases usable only from PR context and
  blocks the intended direction where Placement resolves a target Offer and
  ordering passes generic bindings/order context downstream.

## Target State

- `createRentalOrder` and `createRideHailingOrderFoundation` accept
  `participants: OrderParticipantSnapshot[]`.
- The creation functions validate that participants are non-empty and include
  the creator, then derive the default split rule from those participants.
- The creation functions accept an optional repository executor so PR-aware
  orchestration can wrap order creation and PR attachment in one transaction.
- `createRentalOrderFromPlacement` remains PR-aware and performs:
  PR lookup -> Placement binding -> Offer/Product/SKU selection -> participant
  projection -> Trade order creation -> `attachOrderToPr`.
- Scenario tests distinguish core order creation from PR attachment.

## Fulfillment Boundary Note

The user corrected the prior Fulfillment/Order boundary framing: because the
system is explicitly `order base + typed order`, family-specific Fulfillment
attributes may belong on typed Order in some cases. That is not resolved in this
slice. The next review should evaluate concrete attributes and lifecycle
authority rather than reject the merge due to field growth alone.

## Verification

- Backend typecheck.
- Backend lint.
- Rental order persistence backend scenario.
- RideHailing order foundation backend scenario.
- Rental ordering system scenario to prove PR placement ordering still creates
  and attaches orders atomically.

## Implementation Notes

- Added a generic Order participant projection helper that can project
  participant snapshots from any upstream context.
- `createRentalOrder` now receives participant snapshots and an optional
  repository executor; it no longer reads PR participants or attaches the Order
  to PR.
- `createRideHailingOrderFoundation` now receives participant snapshots and an
  optional repository executor; it no longer reads PR participants or attaches
  the Order to PR.
- `createRentalOrderFromPlacement` remains the PR-aware orchestration boundary
  and wraps Trade order creation plus `attachOrderToPr` in one transaction.

## Result

- Implemented.
- `createRentalOrder` and `createRideHailingOrderFoundation` no longer accept
  `prId`.
- The Trade creation layer no longer imports PR IDs, `PartnerRepository`, or
  PR attachment use cases.
- PR attachment remains available for PR-aware flows and is now explicitly
  orchestrated outside Trade order creation.
- The Fulfillment/Order attribute merge question remains open for the next
  boundary review under the typed-order premise.

## Verification Result

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts` passed.
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts` passed.
- `pnpm lint:backend` passed.
