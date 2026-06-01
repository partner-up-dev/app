# Modification Plan

Status: executed in the current working tree. Legacy fulfillment tables,
repositories, and create use cases have been removed from target code; the
remaining route/page wording that says "fulfillment" is a compatibility admin
surface name backed by typed Order rows.

This plan is not implementation approval. It lists the proposed mutation order
for the current target contract.

## Execution Principle

Use expand / migrate / contract where persistence is involved:

1. add target fields and code paths;
2. backfill from current rows;
3. switch reads and writes to target model;
4. remove obsolete fields / tables after tests prove parity.

Avoid a big-bang deletion of current `rental_fulfillments` and
`ride_hailing_fulfillments` until target read/write paths are verified.

## Slice 1: Durable Contract And Test Anchors

Files:

- `docs/20-product-tdd/ecommerce-contracts.md`
- `tasks/order-bill-fulfillment-realignment/*`
- backend scenario tests under `apps/backend/tests/commerce/`
- browser scenarios under `tests/scenario/commerce/`

Changes:

- Promote the target contract from task packet into durable Product TDD only
  after final confirmation.
- Add or update tests first for target behavior:
  - Rental prepaid payment creates/activates RentalOrder booking state, not a
    separate fulfillment root.
  - RideHailing provider create success writes provider reference and opens the
    order.
  - RideHailing provider create indeterminate result tries cancellation /
    absence proof and fails local creation when safe.
  - RideHailing callback updates execution phase and creates final Bill on
    final settlement input.

Verification:

- Tests can fail initially; they pin the target contract before mutation.

## Slice 2: Schema Expand

Files:

- `apps/backend/src/entities/rental-order.ts`
- `apps/backend/src/entities/ride-hailing-order.ts`
- new Drizzle migration

Rental schema target:

- add `bookingStatus`
- add `cancellationHandlingStatus`
- add `supplierCancellationOutcome`
- add `entryGuidance`
- add `bookingNote`
- add `cancellationNote`
- add `serviceEndedAt`

Rental schema removal later:

- remove `selectedZoneCodes`
- remove `participantCount`
- remove `rental_fulfillments` table after migration and code switch

RideHailing schema target:

- add `providerInstanceId`
- add direct provider reference field if needed for callback/query correlation
- add `executionPhase`
- add driver assignment snapshot
- add vehicle assignment snapshot
- add final settlement input snapshot

RideHailing schema removal later:

- remove `providerCreationStatus`
- remove `ride_hailing_fulfillments` table after migration and code switch
- do not persist `externalOrderId`
- do not persist `providerExecutionRef`
- do not persist `providerType`

Verification:

- `pnpm db:lint`
- backend typecheck/build guardrails after generated schema updates

## Slice 3: Domain Model Refactor

Files:

- `apps/backend/src/domains/trade/model/rental-order.ts`
- `apps/backend/src/domains/trade/model/ride-hailing-order.ts`
- `apps/backend/src/domains/fulfillment/**`
- repositories for rental / ride-hailing order and current fulfillment

Changes:

- Move Rental execution types into RentalOrder model.
- Move RideHailing execution/provider binding types into RideHailingOrder
  model.
- Delete target usage of `FulfillmentLifecycleStatus` for Rental/RideHailing.
- Delete `RideHailingProviderExecutionRef` from the target model.
- Keep provider instance id as local provider binding.
- Represent provider external id as adapter-computed, not persisted.

Verification:

- unit tests for rental execution state derivation if any derived projection is
  still needed
- unit tests for RideHailing execution phase transitions

## Slice 4: Rental Write Path

Files:

- `apps/backend/src/domains/trade/use-cases/create-rental-order.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts`
- `apps/backend/src/domains/fulfillment/use-cases/apply-order-prepaid-settlement-consequence.ts`
- `apps/backend/src/domains/fulfillment/use-cases/create-rental-fulfillment.ts`

Changes:

- Stop writing `selectedZoneCodes`; preserve zone facts only in
  `orders.items[*].skuFactsSnapshot`.
- Stop writing `participantCount`.
- On prepaid settlement success, update RentalOrder booking state instead of
  creating `RentalFulfillment`.
- Move confirm/reject booking and entry guidance operations to RentalOrder.
- Remove direct runtime dependency on `RentalFulfillmentRepository` from target
  write paths.

Verification:

- Rental order persistence scenario
- Rental payment-to-booking scenario
- cancellation/refund scenarios that currently reference fulfillment state

## Slice 5: RideHailing Create Path

Files:

- `apps/backend/src/domains/trade/use-cases/create-ride-hailing-order-foundation.ts`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- `apps/backend/src/domains/ride-hailing/services/*`
- `apps/backend/src/domains/ride-hailing/use-cases/*`
- `apps/backend/src/repositories/RideHailingOrderRepository.ts`

Changes:

- Replace separate RideHailingFulfillment creation with fields on
  RideHailingOrder.
- Delete `providerCreationStatus` writes.
- Let Provider adapter compute external order id from local order id and
  provider instance.
- On provider create success:
  - persist provider order reference on RideHailingOrder if needed;
  - set execution phase to dispatching;
  - transition base Order to `OPEN`.
- On provider create hard failure:
  - set execution phase to failed;
  - transition base Order to `FAILED`;
  - release PR attachment if retry is allowed.
- On provider create indeterminate response:
  - call provider cancel / verify-no-order;
  - if safe, fail local creation;
  - otherwise keep `INITIATING` for internal recovery only and do not expose as
    successful created order.

Verification:

- RideHailing provider create success scenario
- provider hard failure retry scenario
- indeterminate create recovery unit/scenario coverage

## Slice 6: Provider Callback Path

Files:

- `apps/backend/src/controllers/ride-hailing-provider.controller.ts`
- `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts`
- provider adapter normalization types
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
  or a new RideHailing execution use case

Changes:

- Normalize callback into a provider event.
- Resolve local RideHailingOrder by local order id or provider reference.
- Update execution phase:
  - dispatching / accepted
  - in trip
  - finished
  - cancelled / failed
- Persist driver and vehicle snapshots for OrderDetail when provided.
- Commit final settlement input when provider reports final amount.
- Create final Bill from committed final settlement input.
- Remove passive final-Bill creation from OrderDetail read path, or downgrade it
  to an explicit recovery/reconciliation command.

Verification:

- provider callback scenario: accepted/in-trip/final amount
- final Bill appears only after final settlement input
- payment after final Bill confirms provider fee

## Slice 7: Backend API Boundary Rename / Decoupling

Files:

- `apps/backend/src/controllers/commerce.controller.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- frontend commerce query hooks

Changes:

- Remove backend durable "Ordering" naming from command ownership.
- Rename `createRentalOrderFromPlacement` and
  `createRideHailingOrderFromPlacement` to Order-owned command use cases.
- Ensure create command depends on `offerId + prId + items +
  productTypedExtraProperties`, not Placement identity.
- Keep compatibility routes temporarily if needed, but make target code path
  Order-owned.

Verification:

- PR placement still routes user to frontend order assembly.
- Existing order resolution from PR/offer still works.
- Order creation does not require placement id.

## Detail: Order-Owned Create Commands

The current `createRentalOrderFromPlacement` and
`createRideHailingOrderFromPlacement` should be split away from the frontend
entry source. Placement may route the user into order assembly, but backend
order creation should be an Order command.

### Target Names

- `createRentalOrderFromCommand`
- `createRideHailingOrderFromCommand`

These are application-level command use cases. Lower-level writers can keep
names like `createRentalOrder` / `createRideHailingOrderFoundation` during the
transition, but HTTP create routes should call the command use cases.

### Shared Command Shape

`createdBy` is injected from auth, not trusted from request JSON.

```ts
type CreateOrderItemCommand = {
  skuId: number;
  quantity: number;
};

type CreateOrderParticipantCommand = {
  userId: string;
};

type CreateOrderCommandBase<TExtraProperties> = {
  createdBy: string;
  offerId: number;
  prId?: number | null;
  participants: CreateOrderParticipantCommand[];
  items: CreateOrderItemCommand[];
  extraProperties: TExtraProperties;
};
```

`spuId` should not be part of the create command because `ProductSku` already
owns `spuId`. The backend resolves SKU -> SPU and verifies the SPU belongs to
the Offer.

`participants` is also part of the command. It is a user-editable Order
property assembled by Ordering Content. When the order is entered from a PR,
bindings may prefill participants from PR participants, but Order must persist
the participants submitted by the command, not reconstruct them from PR.

### Rental Command Shape

```ts
type CreateRentalOrderCommand = CreateOrderCommandBase<{
  serviceStartAt: string;
  serviceEndAt: string;
  contactPhone: string;
  registrants: Array<{
    fullName: string;
    nationalId?: string | null;
  }>;
}>;
```

Explicitly excluded:

- `selectedZoneCodes`: SKU facts snapshot owns this.
- `participantCount`: derive from command participants or typed inputs where
  needed; do not persist another count.
- `irreversibleBoundaryAt`: cancellation policy owns this.

### RideHailing Command Shape

```ts
type CreateRideHailingOrderCommand = CreateOrderCommandBase<{
  route: RideHailingRouteSnapshot;
  departureAt?: string | null;
  riders: string[];
  contactPhone: string;
}>;
```

Explicitly excluded:

- `providerInstanceId`: selected through SKU facts.
- `providerVehicleTypeCode`: selected through SKU facts.
- `externalOrderId`: provider adapter computes this.
- `providerOrderId`: provider returns this after create succeeds.
- provider creation status / execution phase: backend-owned consequence.

### Command Use Case Responsibilities

Each command use case should:

1. Resolve Offer by `offerId` and assert it is active.
2. Resolve every `items[*].skuId`.
3. Verify each SKU is active and its SPU is included in the Offer.
4. Verify command family matches Product SPU type.
5. Build order item snapshots from DB SKU facts, pricing model, and
   cancellation policy; do not copy SPU fields into order items.
6. Validate command `participants` as Order input and materialize participant
   snapshots from the command.
7. Do not make Order proactively own PR attach rules. PR remains the authority
   for whether a PR-scoped order can be attached.
8. Run `PricingApplication` from authoritative inputs.
9. Write Order / typed Order / Bill or provider initiation in the correct
   transaction.
10. Attach the created Order to PR in the same transaction when PR-scoped.

For PR-scoped orders, `attachOrderToPr` is the passive PR boundary: if PR
attachment fails, the entire order creation rolls back. Order should not
rebuild participants from PR. PR-derived participant defaults belong in
Ordering Content before the command is submitted.

### Items And SKUs

At command input level, `items` are selected SKUs:

```ts
type CreateOrderItemCommand = {
  skuId: number;
  quantity: number;
};
```

At persistence level, `orders.items` are not merely SKU ids. They are SKU
snapshots plus quantity:

- `sku.id`
- `sku.version`
- `sku.name`
- `sku.factsSnapshot`
- `sku.pricingModelSnapshot`
- `sku.cancellationPolicySnapshot`
- `quantity`

So, command `items` are selected SKU ids; persisted order items are SKU-derived
order line snapshots. SPU stays listing / metadata and should not be copied
into order items.

Top-level `order.pricingSnapshot` should be removed in the target model.
Pricing model snapshots live inside item SKU snapshots, while concrete payable
amounts belong to Bill materialization.

Short-term route compatibility can keep:

- `POST /api/commerce/orders/rental`
- `POST /api/commerce/orders/ride-hailing`

But payload naming should move from `productTypedExtraProperties` to
`extraProperties`, and route handlers should call the order-command use cases,
not `*FromPlacement`.

## Slice 8: Frontend Read Boundary

Files:

- `apps/frontend/src/pages/OrderingFromPlacementPage.vue`
- `apps/frontend/src/pages/CommerceOrderDetailPage.vue`
- commerce query hooks and model types

Changes:

- Treat Ordering as frontend assembly only.
- Keep OrderDetail low-frequency:
  - status
  - route
  - selected item / vehicle
  - execution phase
  - driver / vehicle assignment
  - bill summary
- Add or prepare separate LiveTracking query boundary for high-frequency driver
  coordinates / ETA.
- Update frontend expectations for `INITIATING`: it is not a successful active
  ride state.

Verification:

- browser scenarios for Rental order detail
- browser scenarios for RideHailing order detail and final Bill
- no high-frequency provider tracking through OrderDetail

## Slice 9: Contract Cleanup

After target code and migrations pass:

- remove obsolete fulfillment repositories and use cases for Rental/RideHailing
- remove old fulfillment entity exports
- remove old columns:
  - `rental_orders.selectedZoneCodes`
  - `rental_orders.participantCount`
  - `ride_hailing_orders.providerCreationStatus`
- drop old fulfillment tables
- update admin commerce fulfillment page or replace it with typed order
  execution work queues

Verification:

- `pnpm lint:backend`
- `pnpm test:unit:backend`
- `pnpm test:scenario:backend`
- targeted `tests/scenario/commerce/*`

## Suggested Implementation Order

1. Durable contract and test anchors.
2. Schema expand.
3. Domain model refactor.
4. Rental write path.
5. RideHailing create path.
6. Provider callback path.
7. Backend API naming / Placement decoupling.
8. Frontend read boundary.
9. Contract cleanup.

Reasoning:

- Rental is simpler and prepaid, so it should validate the merge pattern first.
- RideHailing create/callback has external side effects, so it should follow
  after the typed-order merge mechanics are proven.
- API naming and frontend cleanup should happen after the backend target path
  exists, otherwise we risk changing call sites without stable behavior.
