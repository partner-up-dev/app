# Core Data Models

This file inventories current state first, then records target-shape notes for
discussion. It is not an implementation decision yet.

## Current Order

Base `trade_orders` owns cross-family commercial contract state:

- `id`
- `family`: `RENTAL | RIDE_HAILING`
- `offerId`
- `createdBy`
- `status`: `INITIATING | OPEN | CANCELLED | FAILED | EXPIRED | COMPLETED`
- `participants`
- `splitRuleSnapshot`
- `items`
- `pricingSnapshot`
- `timeout`
- `terminationAttempts`
- `closedAt`
- timestamps

Target note:

- Base Order should remain commercial-contract state, not family execution
  state.
- If `RideHailingOrder` carries an execution phase, avoid duplicating that with
  another family-specific creation status.
- `orders.items` is the authority for SKU facts snapshotted into the order.
  Product-specific commercial facts such as zone selection must not be promoted
  into `rental_orders` unless they are truly rental-family execution facts.
- Target correction: remove top-level `order.pricingSnapshot`. SKU pricing
  model snapshots live under `orders.items`; concrete payable amounts are
  materialized into Bill.
- SPU no longer owns PricingPolicy in the target contract. SPU is listing and
  metadata; SKU owns sellable facts, pricing model, and cancellation policy.

## Current Bill

`bills`:

- `id`
- `sourceOrderId`
- `status`: `ACTIVE | VOIDED | CLOSED`
- `currency`
- `closedAt`
- timestamps

`bill_lines`:

- `id`
- `billId`
- `userId`
- `kind`: `CHARGE | REFUND`
- `amountFen`
- `currency`
- `label`
- `description`
- `refundOfBillLineId`
- `createdAt`

Target note:

- Bill should not own execution state.
- Bill materializes payable/refundable money after Order or family execution
  decides the monetary target.

## Current Order Items

`trade_orders.items` is a JSONB array typed as `OrderItemSnapshot[]`.

Current shape:

```ts
type OrderItemSnapshot = {
  itemId: string;
  spuId: number;
  spuVersion: number;
  spuName: string;
  skuId: number;
  skuVersion: number;
  skuName: string;
  quantity: number;
  skuFactsSnapshot: unknown;
  pricingModelSnapshot: unknown;
  cancellationPolicySnapshot?: CancellationPolicySnapshot | null;
};
```

Current meaning:

- `itemId`: order-local line id. It is used to connect
  `pricingSnapshot.itemBreakdowns[*].itemId` back to the order item.
- `spuId`, `spuVersion`, `spuName`: frozen SPU identity/display at order
  creation.
- `skuId`, `skuVersion`, `skuName`: frozen SKU identity/display at order
  creation.
- `quantity`: selected SKU quantity.
- `skuFactsSnapshot`: authoritative item-level product facts for the order.
  Rental zone facts belong here, not in `rental_orders`.
- `pricingModelSnapshot`: SKU pricing model at order creation.
- `cancellationPolicySnapshot`: optional cancellation policy snapshot, currently
  used by Rental termination pricing.

Current related pricing shape:

```ts
type OrderItemPricingSnapshot = {
  itemId: string;
  resolvedAmountFen: number;
  explanations: PriceExplanation[];
};

type OrderPricingSnapshot = {
  currency: "CNY";
  itemBreakdowns: OrderItemPricingSnapshot[];
  orderLevelExplanations: PriceExplanation[];
  subtotalFen: number;
  totalFen: number;
};
```

Target notes:

- Command `items` are selected SKUs plus quantity.
- Persisted target `orders.items` are SKU snapshots plus quantity, not SPU
  snapshots.
- Do not persist client-provided SKU display or facts. Resolve them from SKU
  repositories at command handling time.
- Do not include SPU identity/display in target `orders.items`; SPU is listing
  and metadata, not pricing/policy authority.
- `itemId` should remain an order-local line id so pricing, cancellation, and
  future per-line bill attribution can reference the exact frozen item.
- `skuSnapshot` should include SKU facts, pricing model, and cancellation
  policy snapshot.
- `skuFactsSnapshot` should become product-type-discriminated rather than
  `unknown` if kept as a nested field under `skuSnapshot`.
- Consider renaming in a later cleanup:
  - command `items` -> `skus` if API clarity needs it;
  - persisted `items` can remain `items` because they are order line snapshots.

Target item shape:

```ts
type OrderItemSnapshot = {
  itemId: string;
  sku: {
    id: number;
    version: number;
    name: string;
    factsSnapshot: SkuFacts;
    pricingModelSnapshot: PricingModel;
    cancellationPolicySnapshot?: CancellationPolicySnapshot | null;
  };
  quantity: number;
};
```

Open naming option:

- `sku` can be named `skuSnapshot` if explicitness is preferred.
- The contract is that SPU fields are removed from Order item snapshots, and
  SKU carries facts / pricing / cancellation policy snapshots.

## Current RentalOrder

`rental_orders` currently owns typed rental facts:

- `orderId`
- `selectedZoneCodes`
- `serviceStartAt`
- `serviceEndAt`
- `participantCount`
- `contactPhone`
- `registrants`
- timestamps

Current `RentalFulfillment` owns execution facts separately:

- `orderId`
- `lifecycleStatus`: `PENDING | ACTIVE | COMPLETED | CANCELLED | FAILED`
- `bookingStatus`: `PENDING_BOOKING | BOOKING_CONFIRMED | BOOKING_REJECTED`
- `cancellationHandlingStatus`
- `supplierCancellationOutcome`
- `entryGuidance`
- `bookingNote`
- `cancellationNote`
- `irreversibleBoundaryAt`
- `serviceEndedAt`
- timestamps

Target note:

- Merge rental booking / entry / cancellation handling fields into
  `rental_orders`.
- Delete `selectedZoneCodes`; zone facts belong to SKU facts in
  `orders.items[*].skuFactsSnapshot`.
- Delete `participantCount`; participants are owned by base Order
  `participants`, and registrant count can be derived or validated at command
  time without becoming another stored count.
- Delete fulfillment `lifecycleStatus`; rental execution state is expressed by
  explicit rental fields such as booking and cancellation handling state.
- Do not move `irreversibleBoundaryAt` into `rental_orders`; cancellation
  strategy / policy is the authority for irreversible boundary semantics.
- `RentalOrder` becomes the family execution aggregate for Rental, and there is
  no separate `RentalFulfillment` persistence root for this scope.

## Current RideHailingOrder

`ride_hailing_orders` currently owns typed ride facts:

- `orderId`
- `routeSnapshot`
- `departureAt`
- `riders`
- `contactPhone`
- `providerCreationStatus`: `PENDING | SUCCEEDED | FAILED | UNKNOWN`
- timestamps

Current `RideHailingFulfillment` owns provider execution facts separately:

- `orderId`
- `lifecycleStatus`
- `providerInstanceId`
- `providerType`
- `externalOrderId`
- `providerOrderId`
- `providerExecutionRef`
- timestamps

`providerExecutionRef` currently is:

```ts
type RideHailingProviderExecutionRef = {
  providerOrderId?: string | null;
  providerTripRef?: string | null;
};
```

Current implementation sets both `providerOrderId` and `providerTripRef` to
the provider order id. Therefore it is not the provider instance id. It is a
provider-side execution reference, but its semantic split is currently weak.

Target notes:

- Move remaining provider execution fields into `ride_hailing_orders`.
- `providerInstanceId` should remain a provider binding field because the order
  needs to know which configured provider instance owns execution.
- Delete `providerCreationStatus`; provider creation is represented by base
  `Order.status` plus RideHailing execution phase / provider order reference.
- Delete `providerExecutionRef`; it duplicates `providerInstanceId` plus
  provider-side order identity for current scope.
- Delete `providerType`; resolve it through `providerInstanceId`.
- Delete persisted `externalOrderId`; provider adapters compute provider
  external order ids at provider-call time. This is provider-owned because
  Caocao and future providers may format the outbound local-order reference
  differently.
- Do not preserve a generic `providerOrderId` on the old Fulfillment aggregate.
  If the provider order identifier is still needed, persist it directly on
  `ride_hailing_orders` as a concrete provider reference field owned by
  RideHailingOrder.

## Proposed Conceptual Split For RideHailing Detail

Order Detail, low frequency:

- base order id/status/family
- selected vehicle / SKU snapshot
- frozen quote basis
- route snapshot / driving plan
- riders and contact
- provider order id / dispatch phase
- driver and vehicle assignment after available
- final amount / bill id after settlement input is committed

Live Tracking, high frequency:

- driver current coordinate
- driver heading / speed if available
- ETA / distance-to-pickup or distance-to-destination
- last provider update timestamp

Target note:

- Do not force high-frequency tracking through the whole order-detail
  projection.
