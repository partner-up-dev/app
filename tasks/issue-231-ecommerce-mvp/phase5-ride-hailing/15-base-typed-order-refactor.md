# Base And Typed Order Refactor

Date: 2026-05-31

## Purpose

Make base Order clean before adding RideHailing. This is a required Phase 5
prerequisite.

The previous plan to add typed RideHailing state while leaving Rental-specific
fields on base `trade_orders` would preserve a bad precedent. It would also
invite future family fields into the base order and turn `TradeOrder` into a
god-object.

## Decision

Phase 5 must first migrate Rental-specific order facts out of base
`trade_orders`.

Target shape:

```text
trade_orders
  cross-family contract state only

rental_orders
  rental-specific order facts, 1:1 by order_id

ride_hailing_orders
  ride-hailing-specific order facts, 1:1 by order_id
```

## Base Order Scope

Base `trade_orders` should own only cross-family contract state:

- id;
- family;
- createdBy;
- status;
- participants;
- split rule;
- offer snapshot;
- item snapshots;
- pricing snapshot;
- timeout;
- termination attempts;
- timestamps.

Base `trade_orders` should not own:

- rental service start/end;
- rental selected zones;
- rental contact phone;
- rental registrants;
- ride route;
- ride departure time;
- ride execution state.

Base `trade_orders` should continue to own generic item snapshots and pricing
snapshots for all order families, including RideHailing. It should not own raw
provider estimate response semantics.

## Rental Typed Order Scope

`rental_orders` should own current Rental-specific facts:

- `order_id`;
- `selected_zone_codes`;
- `service_start_at`;
- `service_end_at`;
- `participant_count`;
- `contact_phone`;
- `registrants`.

The repository/read model can still expose a composed `RentalOrder` application
model, but persistence should be base + typed child.

## RideHailing Typed Order Scope

`ride_hailing_orders` should be added only after the Rental migration proves the
base + typed pattern.

Expected facts:

- `order_id`;
- route snapshot;
- departure time;
- rider/contact facts;
- provider creation status for the local provider-order creation boundary.

Do not pre-create execution, driver assignment, cancellation side-effect,
fee-confirm, final settlement, or final pricing fields in the foundation
schema. Add them only with the sequence that first writes them.

Selected SKU/item and pricing contract snapshots remain generic base order
facts. RideHailing provider estimate interpretation belongs upstream to
Product/PricingApplication, not to `ride_hailing_orders`.

## Migration Strategy

1. Create `rental_orders`.
2. Backfill from existing `trade_orders` rental columns.
3. Update repositories/use cases/read models to compose Rental order from base
   `trade_orders` + `rental_orders`.
4. Update Rental create-order flow to write both base and typed rows in the same
   transaction.
5. Update Rental order detail, cancellation, Bill, Fulfillment, admin, and
   scenario paths to read typed Rental fields from `rental_orders`.
6. Drop or stop using Rental-specific columns on base `trade_orders` after all
   reads/writes have moved.
7. Only then add `ride_hailing_orders`.

## Slice 1 Implementation Status

Status on 2026-05-31: implemented.

Implemented changes:

- added `apps/backend/src/entities/rental-order.ts`;
- added `apps/backend/src/repositories/RentalOrderRepository.ts`;
- added `apps/backend/drizzle/0073_rental_typed_order.sql`;
- removed Rental-specific columns and service-start index ownership from the
  `trade_orders` schema entity;
- split the domain model into base `TradeOrder` and typed `RentalOrder`;
- changed Rental order creation to write base `trade_orders` and typed
  `rental_orders` inside one transaction;
- changed Rental order detail and Rental termination finalization to read typed
  Rental facts from `rental_orders`;
- changed admin order/bill and fulfillment workspaces to include typed
  `rentalOrder` beside the base order;
- added a focused backend scenario proving successful base+typed writes and
  rollback when the transaction fails after typed row creation.

## Verification

- Existing Rental backend unit tests pass.
- Existing Rental frontend unit tests pass.
- Existing Rental scenario tests pass.
- A focused persistence test proves:
  - base `trade_orders` contains only base fields;
  - `rental_orders` contains Rental facts;
  - creating a Rental order writes both records atomically.

Verification evidence on 2026-05-31:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/trade/services/rental-termination-pricing.test.ts apps/backend/src/domains/trade/services/order-termination.test.ts`
  passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  passed.

Broad backend unit caveat:

- `pnpm test:unit:backend` still fails in unrelated notification and waitlist
  dynamic-import tests with 5s timeouts / missing imported function values. No
  failing case was in Trade/Rental/Bill/Fulfillment paths.

## Non-Goals

- Do not redesign Bill, Payment, or Rental Fulfillment semantics.
- Do not change user-visible Rental behavior.
- Do not start RideHailing-specific persistence before this refactor lands.
