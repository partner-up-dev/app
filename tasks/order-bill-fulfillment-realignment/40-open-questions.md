# Open Questions

## 1. Backend Entry Naming And Ownership

Current backend has `ordering` routes and use cases. Target claim says
Ordering is frontend-only.

Question:

- Should backend public command become product-neutral, for example
  `POST /api/commerce/orders` with `family/productType`, or still family
  specific `POST /api/commerce/orders/rental` and
  `POST /api/commerce/orders/ride-hailing`?

Working preference:

- Backend should expose Order commands and quote/evaluation commands, not
  "Ordering" as a domain.

## 2. Placement Coupling

Current create functions still resolve by `offerId + prId` and use placement /
PR context inside `createRentalOrderFromPlacement` and
`createRideHailingOrderFromPlacement`.

Question:

- Should the create command accept only `offerId + prId + items +
  productTypedExtraProperties`, then let Order resolve Offer and PR authority
  without referring to Placement at all?

Working preference:

- Yes. Placement can route users into order assembly, but Order creation should
  not depend on Placement identity.

## 3. Merge Fulfillment Into Typed Orders

Question:

- Is "Fulfillment" being removed as a persistence aggregate entirely, or only
  for the current Rental/RideHailing families?

Working preference:

- Decision for current target contract: merge current `rental_fulfillments`
  into `rental_orders` and current `ride_hailing_fulfillments` into
  `ride_hailing_orders`.
- Keep the concept "execution" in language, but avoid a separate root unless a
  future family needs one-to-many or independent execution records.

Closed target details:

- remove `RentalFulfillment.lifecycleStatus`
- remove `RideHailingFulfillment.lifecycleStatus`
- do not move `irreversibleBoundaryAt`; cancellation policy owns irreversible
  boundary semantics

## 4. RideHailing Phase Model

Question:

- What exact enum should replace `providerCreationStatus` and separate
  fulfillment lifecycle?

Candidate:

```ts
type RideHailingExecutionPhase =
  | "CREATING_PROVIDER_ORDER"
  | "DISPATCHING"
  | "ACCEPTED"
  | "IN_TRIP"
  | "FINISHED"
  | "CANCELLED"
  | "FAILED";
```

Concern:

- `Order.status` and `RideHailingExecutionPhase` must not both try to express
  the same lifecycle. Base Order should express commercial contract state;
  RideHailing phase should express provider execution state.

Closed target details:

- remove `ride_hailing_orders.providerCreationStatus`
- remove `CREATE_UNKNOWN` as a durable business phase
- keep `Order.status = INITIATING` only if needed as an internal protection
  state while the local order exists but provider creation has not been safely
  resolved

## 5. ExecutionRef Semantics

Current implementation:

- `providerInstanceId`: local configured provider account / instance.
- `providerOrderId`: provider order identifier.
- `externalOrderId`: provider-owned formatting of the local order reference.
- `providerExecutionRef`: currently `{ providerOrderId, providerTripRef }`,
  but both are set to the same provider order id.

Question:

- Should `providerExecutionRef` be removed until provider semantics require a
  separate trip reference?

Closed target details:

- remove `providerExecutionRef`
- keep `providerInstanceId`
- keep a direct provider order reference on `ride_hailing_orders` only if it is
  required to query or correlate provider state
- remove `providerType`; derive through `providerInstanceId`
- remove persisted `externalOrderId`; provider adapter computes it dynamically
  because each provider can have a different external order id format

## 6. Provider Callback Authority

Current callback only parses and returns success.

Question:

- Should provider callback become authoritative for accepted / in-trip /
  finished / cancelled transitions?

Working preference:

- Yes for coarse execution transitions and final amount commit.
- Order detail query can still reconcile provider state as a recovery path, but
  should not be the primary final Bill creation path.

## 7. Final Bill Creation Timing

Question:

- For RideHailing, should final Bill be created only when callback commits
  final settlement input, or may read-side polling create it?

Working preference:

- Primary path: callback commits final settlement input and creates final Bill.
- Recovery path: explicit reconciliation command, not passive order-detail read.

## 8. Order Completion Timing

Question:

- Does RideHailing base Order become `COMPLETED` when the ride finishes, or
  when the final Bill is fully paid and provider fee is confirmed?

Needs product decision.
