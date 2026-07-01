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
- `RideHailing` for provider-instance configuration and ride-hailing-specific
  operator tools

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
- BillLine-local provider execution slot identity
- checkout target truth for a concrete bill line, including:
  - whether the line is payable by the current viewer
  - which provider instance is currently bound to an unfinished execution slot
  - hero facts needed by checkout UI
- BillLine settlement confirmation
- viewer-scoped bill-list read identity for `/api/commerce/bills`, where the contract intentionally returns ordered `billId[]` only and leaves per-bill summary hydration to bill-detail reads
- settlement derivation over successful payment movements
- reconciliation from current buyer-side total to target buyer-side total

Does not own:

- whether service-side termination is admissible
- provider execution truth

### Payment

Owns:

- provider orchestration for external money movement
- gateway callback verification and provider queries
- provider-specific merchant order/refund reference derivation and parsing
- payment provider registry and routing credentials
- provider catalog discovery for a concrete client runtime
- transient `PaymentTx` API resource reconstruction for polling current provider
  execution state

Does not own:

- bill obligation semantics
- persisted provider transaction lifecycle truth
- synthetic checkout-target aggregate reads
- service execution semantics

Payment provider systems own gateway-facing payment lifecycle truth. Backend
Payment code can create provider executions, query provider state, and accept
verified callbacks, but provider status, provider snapshots, provider
transaction ids, and provider failure states are not persisted as backend
payment transaction truth.

BillLine owns the local provider execution slot for an obligation line:

- `paymentProviderInstanceId` is set only when provider execution is initiated.
- `attemptCount` is monotonic local key material for provider reference
  derivation and is not reset after failed, closed, or expired provider states.
- `settledAt` is Bill-owned settlement confirmation. For `CHARGE` lines it
  means paid; for `REFUND` lines it means refunded.
- provider-specific merchant order/refund numbers are derived by the provider
  adapter from BillLine-local key material and are not persisted as Bill truth.

Current checkout interaction contract:

- billing-owned reads provide checkout target truth
- payment-owned writes and polling provide provider execution truth
- `GET /api/payment/providers` returns the current client-scoped provider
  catalog and must stay target-agnostic
- `POST /api/payment/:paymentProviderInstanceId/charge?bill-line=...` initiates
  or resumes charge execution for one bill line using an explicit provider
  choice
- `GET /api/payment/:paymentTxId` returns a transient `PaymentTx` resource view
  reconstructed from BillLine execution-slot state plus live provider query
  truth
- if a bill line already has an unfinished provider binding, selecting a
  different provider is rejected at charge-initiation time rather than hidden in
  provider discovery

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
2. `/order/new`
3. `Order Detail`

Why this topology is durable:

- `PR Page` is the contextual entry surface where Button Placement is rendered.
- `/order/new` is the pre-order explanation and ordering-assembly surface.
- `Order Detail` is the long-lived post-create lifecycle surface.
- `/offers/:offerId` may remain a user-facing offer route family, but
  PR-attached ordering does not require routing through Offer Detail.

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
- PR Page builds PR-derived `matchingContext` from PR Detail and passes it,
  together with `prId`, into Button Placement.
- Button Placement calls `POST /api/placements?type=BUTTON` through its
  Placement entry flow.
- `matchPlacementInstance(type, matchingContext)` is the Placement matching
  boundary. Placement does not receive `userId`, `prId`, `contextType`,
  `slotKey`, or a PR-specific roster as separate parameters; PR-derived facts
  are contained only inside `matchingContext`.
- A Placement Instance contains `offerId` and creative
  `{ ctaLabel, description? }`. It does not contain a navigation target.
- On click, Button Placement's entry flow checks existing PR-linked orders with
  explicit status enum values, then either routes to Order Detail or resolves an
  Ordering entry with `POST /api/placements/:instanceId/ordering-entry`, stores
  the generic Ordering handoff, and opens `/order/new`.
- Ordering entry resolution is a Placement boundary operation that calls the
  Offer domain for an `OrderingOfferDetail` projection, resolves bindings, and
  assembles `OrderingEntryPayload`.
- Placement does not own Offer facts, price evaluation, order lifecycle,
  fulfillment, or product-specific Ordering Content layout.

PR-context visibility rules:

- active PR participants can see PR-context Button Placements
- non-active participants should not mount Button Placement

## PR-Attached Order Invariant

PR-context order creation must append the created order id into
`partner_requests.orders` inside the same transaction.

Rules:

- order creation is allowed only when PR is `READY` or `ACTIVE`; `READY` is the roster-locked formed state and `ACTIVE` keeps the same PR-attached ordering authority after execution starts
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
- `SPU.salesPolicy.skuSelectionPolicy` declares how the user selects SKU
  candidates:
  - `EXACTLY_ONE` means the ordered item is one concrete SKU
  - `CHOICE_SET` means the user authorizes multiple acceptable candidate SKUs
    and fulfillment resolves one final SKU/provider vehicle

Pricing ownership:

- `PricingModel` is SKU-owned base pricing truth
- `SPU` owns listing, metadata, sales policy, service policy, and listing-level
  presentation truth; it does not own runtime pricing rules
- `SKU` owns SKU-specific presentation truth, such as a vehicle class hero image
  for RideHailing
- `Offer PricingPolicy` is commercial overlay truth
- concrete pricing execution belongs to Trade
- persisted fixed `trade_orders.items` are SKU snapshots plus quantity,
  including SKU facts, SKU pricing model, and SKU cancellation policy snapshot;
  SPU fields are not copied into order items
- persisted choice-set `trade_orders.items` are one logical item containing
  candidate SKU quote snapshots and a nullable resolution. The candidate set is
  buyer authorization truth; the resolution records the final SKU/provider
  vehicle and provider binding.

## Ordering Command Contract

- `/order/new` receives transient `OrderingEntryPayload` from the Commerce
  Ordering handoff store:
  `{ source: { offerId }, offerDetail, prId?, bindings }`.
- `source.offerId` is the commercial source reference and the stable entry for
  dynamic listing/quote issuance.
- `offerDetail` is an Offer-owned ordering projection containing the product
  type, SPU/SKU ids, display facts, base SKU pricing models, cancellation
  policy summaries, and Offer pricing policy needed to render the initial
  ordering surface. It is not a user-facing Offer Detail page and is not the
  dynamic quote authority.
- Ordering Content is selected from `offerDetail.productType`.
- Bindings only prefill and lock client fields; they are not submitted as
  authoritative server input.
- Ordering Content receives `{ source, offerDetail, bindings }`, calls
  `POST /api/commerce/offers/:offerId/listing` with product-specific listing
  input, and emits quote-bound draft items plus local display summary for the
  footer price and price detail.
- Ordering Content does not receive `prId`, does not know Placement, and does
  not evaluate or submit orders.
- Offer Listing is Offer-domain owned. It resolves active Offer/SPU/SKU truth,
  applies product-specific availability masks, executes product-specific
  quote/pricing logic, persists quote snapshots, and returns listed items with
  product-type-independent `quoteId`s.
- For RideHailing, listing uses route/departureAt to query provider vehicle
  availability/estimates, joins provider results to local ACTIVE SKUs, and does
  not return unavailable SKUs.
- RideHailing `departureAt` remains part of the backend listing/order contract,
  but the current Ordering UI short-circuits the user-facing behavior to
  `现在出发`; PR-derived time is not imported into the active ordering surface
  for this slice.
- For Rental, listing issues fixed quotes for the available rental SKUs matching
  the current listing facts.
- Ordering Page owns create-order orchestration. Ordering Content must not call
  create-order.
- Create-order product item payload is quote-only and does not repeat
  participants, riders, contact phone, route, departureAt, offer id, or SKU ids:
  - fixed items: `{ kind: "FIXED", quoteId, quantity: 1 }`
  - choice-set items: `{ kind: "CHOICE_SET", candidateQuoteIds, quantity: 1 }`
- Quote owns quote validity. Order asks Quote to resolve quote-bound item facts;
  Order does not hand-check quote existence, expiry, active Offer, active SKU,
  product membership, or quote-set coherence.
- Expired quotes are rejected from create-order with HTTP 409 problem details
  code `ORDERING_QUOTE_EXPIRED`; the frontend refreshes listing and asks the
  user to click create again. When the refreshed listing still contains
  matching RideHailing SKUs, the frontend preserves those selected candidate
  ids; vanished selected SKUs are pruned. Quote-expired failures are not mixed
  into HTTP 200 results.
- Ordering creation uses `POST /api/commerce/orders`. Successful transport
  responses are a discriminated result:
  - `CREATED` navigates to Order Detail
  - `CANCELLED` carries a cancelled order id and user-displayable reason; the
    Ordering Page shows a failure dialog and does not navigate
- for PR-scoped orders, order row creation and `attachOrderToPr` are one
  transaction. PR authority validates attachability; Order does not own PR
  status as a separate proactive validation rule.
- Trade Order Base orchestrates base `trade_orders`, optional PR attachment,
  and product-typed `create -> init` steps. Product-typed order code owns its
  own order or fulfillment management, but it does not attach PR or coordinate
  the base trade order.

## Rental Frontend Journey Contract

The baseline Rental user-visible chain is:

1. PR Page placement entry
2. `/order/new` ordering assembly and Offer Listing quote issuance
3. Order creation from fixed quote id, unless any intended participant still has another unpaid payable order obligation
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
2. `/order/new` ordering assembly and route/time-based Offer Listing quote issuance
3. Order creation from selected candidate quote ids, unless any intended participant still has another unpaid payable order obligation
4. Order Detail with quote basis and fulfillment state
5. same Order Detail with final bill after trip finish
6. same Order Detail with final payment/completed state

Cancellation entry should live on `Order Detail`.

High-frequency ride tracking should use a dedicated API contract rather than
forcing the whole order-detail projection to become a high-frequency payload.

## Fulfillment And Billing Contract

Rental:

- prepaid
- create-order must reject when any intended participant still has another unpaid payable order obligation; this guard applies before the new order row is created
- the current payable-obligation guard is Bill-owned and only considers positive unsettled `CHARGE` lines whose source order unpaid window is still open
- zero-amount `CHARGE` lines are created as settled and historical zero-amount charge lines must be backfilled to the same paid semantics
- Bill exists before execution begins
- typed order creation keeps the standard unpaid payment window on the base
  Order timeout snapshot
- Rental execution state is stored on `rental_orders`
- booking state becomes actionable after prepaid settlement

RideHailing:

- usage-based final settlement
- the same participant unpaid-order guard applies before create-order starts provider dispatch
- typed order creation overrides the base Order timeout snapshot so final-bill
  payment is not constrained by the standard unpaid payment window
- Order is created from candidate quote snapshots. For RideHailing, the user
  orders one unresolved choice-set item: several acceptable vehicle SKU
  candidates, with one final resolution.
- create-order sends the user-authorized candidate set to the selected
  RideHailing provider port. CaoCao supports multi-candidate dispatch through
  `/common/orderCarV2` with `is_simultaneously_call=1` and
  `service_type_price`, so the CaoCao adapter submits all selected candidates
  instead of choosing a cheapest fallback. When a future provider adapter does
  not support multi-candidate dispatch, that adapter owns the
  provider-specific fallback choice. Provider create failure cancels the local
  order without retrying the next candidate/provider and returns the
  `CANCELLED` create-order result to the Ordering Page.
- provider dispatch binding is stored on `ride_hailing_orders`, not on the
  choice-set resolution. The choice-set resolution represents only the final
  service vehicle confirmed by the provider lifecycle.
- execution phase and ride execution snapshots are stored on
  `ride_hailing_orders`
- provider adapter computes external order id dynamically; the provider-side
  order id returned by create is stored in the RideHailing dispatch binding
  together with provider instance identity
- provider order-detail reads own execution truth: execution phase, driver
  snapshot, vehicle snapshot, and other ride-lifecycle facts come from
  provider order-detail reads
- provider final settlement truth must come from a provider query result, but
  the concrete source depends on the provider's currently integrated API
  surface
- for the currently integrated CaoCao surface:
  - `ride_hailing_orders.finalSettlementInput` is derived from
    `queryOrderDetailV2.orderFeeVo.totalFee`
  - `finalSettlementInput.amountFen` binds `orderFeeVo.totalFee`
  - `orderFeeVo.companyPayAmount` is not the current settlement source
- local RideHailing terminal phases that may trigger final-settlement capture
  are only `FINISHED` and `CANCELLED`
- terminal final-settlement capture is best-effort:
  - when a local RideHailing order is observed in `FINISHED` or `CANCELLED`
    and `finalSettlementInput` is still null, backend may issue the provider
    final-settlement query inline on that natural sync path
  - for the currently integrated CaoCao surface, `queryFinalSettlement()` is a
    dedicated adapter read that internally calls `queryOrderDetailV2` and reads
    `orderFeeVo.totalFee`
  - if that final-settlement query does not yet return an authoritative
    `orderFeeVo.totalFee`, backend keeps `finalSettlementInput = null` and
    relies on a later natural sync trigger rather than fabricating settlement truth
  - provider order-detail sync must not directly materialize
    `finalSettlementInput`; terminal settlement capture still goes through the
    provider final-settlement query contract, even if the adapter reuses the
    same provider endpoint under the hood
- final Bill is created only after provider final settlement input is
  committed, not lazily from Order Detail reads
- cancellation-fee query is a separate pre-cancel decision surface:
  - it may inform whether cancellation is acceptable before cancellation
  - user-side RideHailing cancellation from Order Detail must query this
    surface before sending the destructive cancellation command
  - if the previewed cancellation fee is greater than zero, frontend must show
    the amount and require explicit confirmation before cancellation
  - it must not be reused as post-cancel final settlement truth
- for cancelled RideHailing orders, if the provider final-settlement query
  later returns a non-zero `orderFeeVo.totalFee`, backend may still materialize
  that result through the same final Bill model

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
