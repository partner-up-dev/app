# Order Spine Correction

## Status

Completed.

This subtask is historical context for the current Ride Hailing MVP work. It is
not open for more implementation unless new evidence shows the restored spine is
wrong.

## Objective & Hypothesis

Objective:

- restore the durable ecommerce route spine for RideHailing ordering:
  `PR Page -> /order/new -> POST /api/commerce/orders -> /orders/:orderId`

Hypothesis:

- the backend order-creation foundation already existed
- the main defect was a frontend detour that treated the primary create action
  as a support handoff

## Guardrails Touched

- durable owner: `docs/20-product-tdd/ecommerce-contracts.md`
- frontend route/page owner:
  `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- frontend commerce query owner:
  `apps/frontend/src/domains/commerce/queries/useCommerce.ts`
- scenario owner:
  `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- collateral scenario owner:
  `tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Confirmed Outcome

- `/order/new` now creates a real trade order.
- Create success navigates to `/orders/:orderId`.
- `/order/support` no longer owns the primary meaning of `下单`.
- RideHailing create failure stays on `/order/new` and surfaces the error.
- Rental ordering followed the same shared page correction.

## Verification

Completed verification recorded in the parent packet:

- `pnpm check:type:frontend`
- `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Next Step

No active next step. Keep this packet as context for later UI and detail-page
work.
