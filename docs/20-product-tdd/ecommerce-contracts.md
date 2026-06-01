# Ecommerce Contracts

## Scope

This document preserves the smallest durable cross-unit technical truth for the
issue-231 ecommerce slice.

It owns:

- ecommerce domain grouping
- stable user-facing route and page topology
- PR-attached order invariant
- cross-unit owner boundaries for Merchandising, Trade, Fulfillment, Bill, and
  Payment
- minimum frontend journey spine for Rental and RideHailing

It does not own:

- admin field-by-field form configuration
- provider-specific ride dispatch details
- runtime rollout procedures
- low-level entity schema details that code can explain cheaply

## Domain Grouping

Backend implementation should group ecommerce work under these domain families:

- `merchandising`
- `trade`
- `fulfillment`
- `bill`
- `payment`

The important negative constraint is:

- do not create one generic `ecommerce` dumping-ground module

Frontend should reflect the same coarse grouping on admin navigation:

- `Merchandising`
- `Trade`
- `Payment`

Rental execution operations belong under `Trade`-adjacent operator work rather
than under Merchandising configuration.

## Authoritative Owners

### Merchandising

Owns:

- Product Catalog
- Offer
- Placement
- SKU base pricing model and quote-calculation DSL
- SPU listing / metadata / service policy truth
- Offer pricing policy truth
- SKU base cancellation policy truth

Does not own:

- order lifecycle
- fulfillment execution truth
- payment state

### Trade

Owns:

- Order as the binding commerce contract
- order snapshots
- PR-context order creation flow
- pricing execution for a concrete order draft/request
- translation from fulfillment termination decision into bill target amount

Does not own:

- external money movement
- service execution truth

### Fulfillment

Owns:

- service-side execution truth that cannot be reduced to Order, Bill, or
  Payment
- Rental booking result and cancellation handling
- RideHailing execution truth needed for usage-based final settlement
- authoritative termination admissibility decision

Does not own:

- contract pricing truth definitions
- bill settlement truth

### Bill

Owns:

- charge/refund obligation lines
- settlement derivation over successful payment movements
- reconciliation from current buyer-side total to target buyer-side total

Does not own:

- whether service-side termination is admissible
- provider execution truth

### Payment

Owns:

- external money movement
- gateway callback/query state

Does not own:

- bill obligation semantics
- service execution semantics

## User-Facing Route Spine

Stable user-facing ecommerce route families are:

- `/products/:productId`
- `/offers/:offerId`
- `/orders/:orderId`

Current constraints:

- do not nest these under `/pr/:id/*`
- Button Placement does not need a user-facing `/placements/:placementId` page
- do not introduce user-facing `/proposals/*`, `/checkout/*`, or
  `/cancellation/*` route families for MVP by default

## Frontend Page Topology

The preferred baseline user-visible route spine is:

1. `PR Page`
2. `Offer Detail`
3. `Order Detail`

Why this topology is durable:

- `PR Page` is the contextual entry surface where Button Placement is rendered.
- `/order/new` is the pre-order explanation and ordering-assembly surface.
- `Order Detail` is the long-lived post-create lifecycle surface.

This means:

- before create, primary action belongs on `/order/new`
- after create, primary action belongs on `Order Detail`
- payment, cancellation, fulfillment result, and final bill should stay inside
  `Order Detail` unless an external gateway constraint later forces a detour

## Placement Contract

- Placement is backend-authored.
- This task implements only `BUTTON` Placement.
- Button Placement is rendered inside the PR Page Utility Actions row when the
  PR Page determines the current user is an active participant.
- PR Page builds `matchingContext` from PR Detail and calls
  `POST /api/placements?type=BUTTON`.
- `matchPlacementInstance(type, matchingContext)` is the Placement boundary.
  Placement does not receive `userId`, `prId`, `contextType`, `slotKey`, or a
  PR-specific roster.
- A Placement Instance contains `offerId` and creative
  `{ ctaLabel, description? }`. It does not contain a navigation target.
- On click, PR Page checks existing PR-linked orders with explicit status enum
  values, then either routes to Order Detail or resolves bindings with
  `POST /api/placements/:instanceId/bindings` and opens `/order/new`.

PR-context visibility rules:

- active PR participants can see PR-context Button Placements
- non-active participants should not mount Button Placement

## PR-Attached Order Invariant

PR-context order creation must append the created order id into
`partner_requests.orders` inside the same transaction.

Rules:

- order creation is allowed only when PR is `READY`
- order creation is allowed only for the PR creator
- PR domain is the final authority on attachment acceptance
- if PR domain rejects attachment, the whole order creation transaction must
  roll back
- `pr_attached_orders` is retired; PR owns `orders uuid[]`
- `trade_orders.offerId` is the order-offer identity

Current issue-231 uniqueness constraint:

- for one `(prId, offerId)`, allow at most one non-terminal order

## Merchandising Baseline Contract

- Product Catalog uses two layers only: `SPU` and `SKU`
- `SPU` owns canonical `productType`
- `Offer` may include multiple SPUs only when they share the same
  `productType`
- `Placement` owns creative and matching, not price or order state

Pricing ownership:

- `PricingModel` is SKU-owned base pricing truth
- `SPU` owns listing, metadata, sales policy, service policy, and presentation
  truth; it does not own runtime pricing rules
- `Offer PricingPolicy` is commercial overlay truth
- concrete pricing execution belongs to Trade
- persisted `trade_orders.items` are SKU snapshots plus quantity, including
  SKU facts, SKU pricing model, and SKU cancellation policy snapshot; SPU
  fields are not copied into order items

## Ordering Command Contract

- `/order/new` receives transient `{ offerId, prId?, bindings }` from the
  entry surface.
- Order Content is selected from the Offer's SPU `productType`.
- Bindings only prefill and lock client fields; they are not submitted as
  authoritative server input.
- Order Content exposes selected SKU `items`, user-editable participants, and
  family `extraProperties`.
- BottomActionBar creates the command:
  `{ offerId, prId?, participants, items, extraProperties }`.
- This command is not coupled to Placement or `matchingContext`.
- command `items` are `{ skuId, quantity }`; backend resolves SKU -> SPU and
  verifies the SKU belongs to the Offer.
- for PR-scoped orders, order row creation and `attachOrderToPr` are one
  transaction. PR authority validates attachability; Order does not own PR
  status as a separate proactive validation rule.

## Rental Frontend Journey Contract

The baseline Rental user-visible chain is:

1. PR Page placement entry
2. Offer Detail ordering
3. Order creation
4. Order Detail `待支付`
5. same Order Detail `待确认预订`
6. same Order Detail resolves to:
   - `预约成功`
   - `预约失败`
   - `取消处理中`
   - `已取消`
   - `已完成`

Cancellation entry should live on `Order Detail`, not as a separate user-facing
route.

## RideHailing Frontend Journey Contract

The baseline RideHailing user-visible chain is:

1. PR Page placement entry
2. Offer Detail quote assembly
3. Order creation from quote snapshot
4. Order Detail with quote basis and fulfillment state
5. same Order Detail with final bill after trip finish
6. same Order Detail with final payment/completed state

Cancellation entry should live on `Order Detail`.

High-frequency ride tracking should use a dedicated API contract rather than
forcing the whole order-detail projection to become a high-frequency payload.

## Fulfillment And Billing Contract

Rental:

- prepaid
- Bill exists before execution begins
- Rental execution state is stored on `rental_orders`
- booking state becomes actionable after prepaid settlement

RideHailing:

- usage-based final settlement
- Order is created from quote snapshot
- provider binding and execution phase are stored on `ride_hailing_orders`
- provider adapter computes external order id dynamically; it is not persisted
- provider callback updates execution phase, driver / vehicle snapshots, and
  committed final settlement input
- final Bill is created only after provider final settlement input is
  committed, not lazily from Order Detail reads

## Termination Contract

Order cancellation is contract termination, not merely a bill or fulfillment
operation.

Topology:

- family typed Order state is authoritative on service-side termination
  admissibility
- Order translates service-side reality into buyer-side equivalent total
- Bill materializes the delta needed to converge to that target total

Current stable shapes:

- Order stores `termination_attempts[]`
- Fulfillment returns `FulfillmentTerminationDecision`
- Order hands Bill a `BillTargetAmountSeed`

## Verification Contract

The in-scope browser black-box ecommerce scenarios are:

- admin merchandising CRUD
- 6C time-slot reservation
- ride-hailing quote -> completion -> final billing

System-scenario assertions should remain browser-visible. Hidden invariants
such as transaction rollback or settlement derivation belong in backend unit
tests and backend scenario tests.
