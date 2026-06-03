# Discussion Log

## 2026-05-31 Initial User Corrections

User raised these corrections after reviewing the current Order / Bill /
Fulfillment sequence:

- `createRentalOrderFromPlacement` is wrong if it keeps Order creation coupled
  to Placement.
- `RentalFulfillment` and `RideHailingFulfillment` attributes should be merged
  into typed family orders.
- RideHailing provider `createRide` should be called by RideHailing execution,
  not by a backend "RideHailing Ordering API".
- "RideHailing Ordering" should be a frontend concept only.
- Need a clearer core data model inventory before deciding changes.
- `RideHailing executionRef` is unclear and must be clarified.
- `providerCreationStatus` is likely redundant.
- RideHailing Order Page should split stable `OrderDetail` from high-frequency
  `LiveTracking`.
- Provider callback flow must be included in target sequence diagrams.

## 2026-05-31 Current-Code Recheck

Confirmed current code still has:

- backend `/ordering/*` routes in `commerce.controller.ts`;
- `createRentalOrderFromPlacement`;
- `createRideHailingOrderFromPlacement`;
- provider `createRide` directly inside
  `createRideHailingOrderFromPlacement`;
- separate `rental_fulfillments` and `ride_hailing_fulfillments` tables;
- `ride_hailing_orders.providerCreationStatus`;
- provider callback route that parses callback payload but does not yet mutate
  local RideHailing Order / Bill / Order status.

This is current evidence, not target design.

## 2026-05-31 Target Contract Correction

User clarified the target data model:

- `rental_orders.selectedZoneCodes` is over-coupled to one product shape.
  Zone facts belong to SKU facts and are snapshotted in `orders.items`.
- Remove `rental_orders.participantCount`.
- Merge `RentalFulfillment` data into `RentalOrder`.
- Delete merged `lifecycleStatus`.
- `RentalFulfillment.irreversibleBoundaryAt` should not move into
  `RentalOrder`; cancellation policy owns irreversible boundary semantics.
- Remove `ride_hailing_orders.providerCreationStatus`.
- `RideHailingFulfillment.providerExecutionRef` duplicates
  `providerInstanceId + providerOrderId` for current needs.
- Remove `RideHailingFulfillment.providerType`, `providerOrderId`, and
  `externalOrderId`; `externalOrderId` should be dynamically computed.

Recorded target contract in `50-target-contract.md`.

## 2026-06-01 Provider ID And Indeterminate Create

User clarified:

- `computedExternalOrderId` is not computed by `RideHailingOrder`.
- Provider adapters own external order id formatting. Caocao and future
  providers may use different schemes for the outbound provider reference.
- `CREATE_UNKNOWN` is dangerous. If provider create is indeterminate, the
  system should try to prove provider-side state is gone and fail local
  creation when safe.
- This raises whether `INITIATING` is still needed.

Target update:

- removed `CREATE_UNKNOWN` from target phase candidates;
- changed target sequences so RideHailing passes local order id to the
  provider adapter, and the provider adapter computes the external order id;
- documented `INITIATING` as an internal protection state, not a successful
  user-visible order state.

## 2026-06-01 Modification Plan

Added `60-modification-plan.md`.

Plan order:

1. durable contract and test anchors
2. schema expand
3. domain model refactor
4. Rental write path
5. RideHailing create path
6. provider callback path
7. backend API naming / Placement decoupling
8. frontend read boundary
9. contract cleanup

## 2026-06-01 Participant Command Boundary

User clarified:

- Order command must include participants as a user-editable Order input.
- Order participants are not equal to PR participants.
- PR entry may use bindings to prefill participants in Ordering Content, but
  Order creation must not reconstruct participants from PR.
- PR remains the passive attach boundary: if `attachOrderToPr` fails, the
  order transaction rolls back.

Target update:

- added `participants` to the shared create-order command shape;
- changed command responsibilities to materialize participants from command
  input;
- recorded that command `items` are SKUs, while persisted `orders.items` are
  SKU-derived snapshots.

## 2026-06-01 Order Items Target Shape

User clarified:

- SPU no longer has PricingPolicy authority; SPU is listing / metadata.
- Remove top-level `order.pricingSnapshot`.
- `order.items` should store SKU snapshot plus quantity.
- SKU snapshot naturally includes facts, pricing model, and cancellation policy
  snapshots.
- Order item snapshots should not include SPU information.

Target update:

- added target `OrderItemSnapshot` shape with nested SKU snapshot;
- marked `order.pricingSnapshot` for removal;
- documented that payable amounts are materialized into Bill rather than kept
  as top-level Order pricing truth.

## 2026-06-01 Implementation Slice Completed

- Renamed backend create paths to Order-owned command use cases:
  `createRentalOrderCommand` and `createRideHailingOrderCommand`.
- Create command payload now includes `participants: { userId }[]`; creation no
  longer reconstructs order participants from PR active participants.
- PR validation remains passive through the same transaction that creates the
  order and attaches it to PR.
- Persisted `trade_orders.items` moved to nested SKU snapshot shape:
  `item.sku.{id, version, name, factsSnapshot, pricingModelSnapshot,
  cancellationPolicySnapshot}` plus `quantity`.
- Removed persisted `trade_orders.pricing_snapshot`; pricing snapshots remain
  transient inputs for bill materialization.
- Merged Rental fulfillment fields into `rental_orders`; removed target use of
  `selectedZoneCodes`, `participantCount`, and `lifecycleStatus`.
- Merged RideHailing provider binding into `ride_hailing_orders` with
  `providerInstanceId` and `providerOrderId`; removed target use of
  `providerCreationStatus`, persisted `externalOrderId`,
  `providerExecutionRef`, and `providerType` on fulfillment.
- Caocao callback now validates the local order and writes `providerOrderId`;
  if the local order is still `INITIATING`, callback opens it.
- Pricing application no longer applies SPU pricing policy rules.
- Added migration `0079_order_item_snapshot_and_fulfillment_merge.sql`.
- Verification passed:
  - `pnpm --filter @partner-up-dev/backend typecheck`
  - `pnpm --filter @partner-up-dev/frontend build`
  - `pnpm test:unit:backend`
  - targeted backend scenarios for Rental order persistence, RideHailing order
    foundation, and Caocao callback route.

## 2026-06-01 Final Cleanup Slice

- Removed SPU `pricingPolicy` from schema, admin input, editor model, and
  catalog contract tests. Offer pricing rules remain.
- Added migration `0080_spu_pricing_and_ride_execution_cleanup.sql` to drop
  SPU pricing policy and add RideHailing execution snapshot fields.
- Switched create command payload naming from `productTypedExtraProperties` to
  `extraProperties`.
- Removed `spuId` from command `items`; backend resolves SKU -> SPU and checks
  Offer membership.
- Removed legacy fulfillment table entities, repositories, and create use
  cases for Rental and RideHailing.
- Rental admin execution workspace is still exposed through existing
  compatibility route/page names, but its data source is `rental_orders`.
- Caocao callback now commits final settlement input and creates final Bill
  from callback data.
- Verification after final cleanup:
  - `pnpm --filter @partner-up-dev/backend typecheck`: passed
  - `pnpm --filter @partner-up-dev/frontend build`: passed
  - `pnpm lint:backend`: passed
  - `pnpm test:unit:backend`: passed
  - targeted backend commerce/RideHailing scenarios: passed
  - `pnpm test:scenario:system`: passed
  - `pnpm test:scenario:backend`: still fails in unrelated PR / Anchor Event
    scenario expectations (`OPEN` vs `READY/FULL`, route-pool request schema);
    target commerce/RideHailing backend scenarios pass.
