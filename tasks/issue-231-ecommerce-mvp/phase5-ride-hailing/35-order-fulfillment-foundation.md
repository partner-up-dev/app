# Order And Fulfillment Foundation

Date: 2026-05-31

## Purpose

Record Slice 3 implementation details for the local RideHailing order and
fulfillment persistence foundation.

## Scope

Implemented in this slice:

- generic `OrderStatus.INITIATING`;
- `ride_hailing_orders` typed child table keyed by base order id;
- `ride_hailing_fulfillments` provider-binding table;
- repositories for both tables;
- local foundation use case that creates:
  - base `TradeOrder(status = INITIATING)`;
  - typed `RideHailingOrder`;
  - provider-binding `RideHailingFulfillment`;
  - PR attachment while the order is initiating.

Explicitly not implemented in this slice:

- RideHailing Ordering read/evaluate;
- SKU facts refactor;
- provider order creation call;
- callback mutation of order state;
- final settlement or Bill creation.

## Persistence

Migration:

- `apps/backend/drizzle/0076_ride_hailing_order_foundation.sql`

Entities:

- `apps/backend/src/entities/ride-hailing-order.ts`
- `apps/backend/src/entities/ride-hailing-fulfillment.ts`

Repositories:

- `apps/backend/src/repositories/RideHailingOrderRepository.ts`
- `apps/backend/src/repositories/RideHailingFulfillmentRepository.ts`

## State Ownership

Base `trade_orders` owns only cross-family contract state and now accepts
`status = INITIATING`.

`ride_hailing_orders` owns ride-specific order facts and order-facing provider
creation state needed for the local foundation:

- route snapshot;
- departure time;
- riders and contact phone;
- provider creation status.

It intentionally does not pre-create future execution/cancellation/settlement
fields. Those fields should be introduced only in the slice that first writes
and verifies the corresponding sequence.

`ride_hailing_fulfillments` owns only provider binding/reference:

- provider instance id;
- provider type;
- external order id;
- provider order id;
- provider execution reference.

The implementation intentionally keeps dispatch state, driver assignment,
cancellation side-effect result, fee-confirm side-effect result, final
settlement input, and final pricing reference out of both Slice 3 persistence
tables.

## Initiation Detail

The initiating state is represented by:

- base `TradeOrder.status = INITIATING`;
- typed `RideHailingOrder.providerCreationStatus = PENDING`.

The `ride_hailing_fulfillments.lifecycle_status` field uses the existing coarse
fulfillment lifecycle and starts as `PENDING`. It should not become the
order-facing initiation or dispatch state owner.

## Use Case

`createRideHailingOrderFoundation` creates only the durable local foundation.
It does not call Caocao.

`createRideHailingFulfillment` validates:

- the base order exists;
- the base order family is `RIDE_HAILING`;
- the provider instance exists and is active;
- an existing fulfillment for the order does not point to a different provider
  instance.

## Verification

Recorded on 2026-05-31:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/trade/services/order-status.test.ts apps/backend/src/domains/fulfillment/services/fulfillment-lifecycle.test.ts`
  passed with 10 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
  passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  passed with 3 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  passed.

Shrink correction on 2026-05-31:

- `Trade` base model was kept generic and typed order types were split into
  family-specific model files.
- `ride_hailing_orders` migration/entity were narrowed to foundation fields
  only.
- Scenario assertions now prove future execution/cancellation/settlement fields
  are not present on base order, typed order, or fulfillment foundation.
