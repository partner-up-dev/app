# Trade: Order Model

## Purpose

Define the minimal write-model and service-model for Order inside the Trade
domain before implementation.

This page focuses on the order contract itself, not on Bill or Fulfillment
details. Bill and Fulfillment are separate owners and should not be collapsed
into one giant Order object.

## Design Thesis

Order is the binding commercial contract created after pricing is resolved,
selection is frozen, and PR attachment is accepted.

Order should not be:

- a persisted scratchpad for transient form edits
- the owner of bill-share settlement truth
- the owner of fulfillment result truth
- the owner of merchandising rules

Recommended posture:

- transient order-form state and draft pricing live in request-time application
  flow only
- current issue-231 scope does not introduce a persisted Cart, draft Order, or
  TradeProposal aggregate
- persisted Order begins only after final submit passes validation, snapshots
  are frozen, and PR attach succeeds in the same transaction

## Cancellation Semantics First

The right first principle for cancellation is:

- Order cancellation means terminating the commercial contract
- Fulfillment and Bill are not the meaning of cancellation itself
- Fulfillment and Bill are the layered consequence owners of that contract
  termination attempt

So the key design problem is not "which downstream service gets called first".
The key problem is:

1. what counts as a valid contract-termination request at Order level
2. which side effects must be resolved before termination can become effective
3. which side effects are execution-side versus financial-side consequences

That gives a cleaner topology:

- Trade / Order owns cancellation intent, admission, and final contract outcome
- Fulfillment owns execution-side side effects and reversibility truth
- Bill owns obligation-side consequences once Trade has approved them
- Payment owns money movement after Bill materializes those consequences

This framing is especially important because issue 231 has two very different
families:

- `Rental` is policy-first and fulfillment-gated
- `RideHailing` is provider-authoritative before actual usage starts

So Order should encapsulate cancellation complexity by owning the workflow
entry and final contract result, while delegating family-specific side-effect
truth to the correct downstream owners.

## Performance And Unwind

An even stronger way to read the model is:

- the contract creates forward performance obligations
- cancellation is a reverse-direction unwind request against not-yet-finalized
  performance

Forward direction:

1. Order creates the contract
2. Bill materializes user-side monetary obligations when due
3. Fulfillment materializes service-side execution
4. the contract eventually reaches `COMPLETED`

Reverse direction:

1. user requests to stop or unwind future contract performance
2. Fulfillment judges service-side reversibility or provider/supplier outcome
3. Trade decides whether the contract termination can take effect
4. Bill materializes offsetting or residual financial consequences
5. the contract either becomes `CANCELLED` or remains non-terminal

This is not perfectly symmetric, because reverse direction cannot erase
history. It can only:

- stop future performance
- recognize already-consumed performance
- materialize compensating charge/refund consequences

That is why cancellation should not be modeled as "delete the order" or
"roll back the world". It is better understood as controlled contract unwind.

## Draft Versus Cart

Conceptually, the pre-submit form state can be understood as "cart-like" in the
very loose sense that it is the not-yet-committed selection and pricing state.

But in current issue-231 scope it should not become:

- a persisted Cart aggregate
- a persisted draft Order row
- a separate coordination aggregate such as TradeProposal

For the current Rental and RideHailing loops, that extra layer adds complexity
without serving a real business need. The order is created directly from the
final validated request.

## Aggregate Boundary

Trade owns:

- who the order belongs to
- what commercial terms were frozen
- which users currently belong to the order as participants
- what the selected items and pricing snapshots are
- whether the order is open, cancelled, failed, expired, or completed

Trade does not own:

- bill settlement authority
- payment transaction authority
- fulfillment result authority

Therefore the Order write model should store:

- authoritative contract snapshots
- references to Bill and Fulfillment
- order-owned closure / cancellation state

It also needs Order-owned termination-attempt history, because coarse
`Order.status` alone is not expressive enough for approved-versus-denied
termination attempts.

It should not duplicate BillShare settlement or Fulfillment result as the
authoritative source of truth inside the Order aggregate.

PR attachment relation should remain PR-owned rather than duplicated as an
attachment snapshot inside Order. In current scope, PR -> Order is the
authoritative direction of attachment truth.

## Minimal Write Model

```ts
type OrderFamily = "RENTAL" | "RIDE_HAILING";

type OrderStatus =
  | "OPEN"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "COMPLETED";

type OrderParticipantSnapshot = {
  participant_id: string;
  user_id: string;
  role: "CREATOR" | "PARTICIPANT";
  joined_via: "PR_ACTIVE_PARTICIPANT" | "API";
  joined_at?: string | null;
  removed_at?: string | null;
};

type SplitRuleSnapshot =
  | {
      type: "RELATIVE";
      shares: { user_id: string; percent_bps: number }[];
    }
  | {
      type: "ABSOLUTE";
      shares: { user_id: string; amount_fen: number }[];
    };

type OrderOfferSnapshot = {
  offer_id: number;
  terms_version: number;
  product_type: "RENTAL" | "RIDE_HAILING";
};

type OrderItemSnapshot = {
  item_id: string;
  spu_id: number;
  spu_version: number;
  spu_name: string;
  sku_id: number;
  sku_version: number;
  sku_name: string;
  quantity: number;
  sku_facts_snapshot: unknown;
  pricing_model_snapshot: unknown;
  cancellation_policy_snapshot?: unknown | null;
};

type OrderPricingSnapshot = {
  currency: "CNY";
  item_breakdowns: OrderItemPricingSnapshot[];
  order_level_explanations: PriceExplanation[];
  subtotal_fen: number;
  total_fen: number;
};

type OrderItemPricingSnapshot = {
  item_id: string;
  resolved_amount_fen: number;
  explanations: PriceExplanation[];
};

type OrderTimeout = {
  unpaid_expires_at: string;
  default_window_minutes: 30;
};

type TradeOrderBase = {
  id: string;
  family: OrderFamily;
  created_by: string;
  status: OrderStatus;
  participants: OrderParticipantSnapshot[];
  split_rule_snapshot: SplitRuleSnapshot;
  offer_snapshot: OrderOfferSnapshot;
  items: OrderItemSnapshot[];
  pricing_snapshot: OrderPricingSnapshot;
  timeout: OrderTimeout;
  termination_attempts: OrderTerminationAttempt[];
  bill_ref?: { bill_id: string } | null;
  fulfillment_ref?: { fulfillment_id: string } | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
};

type OrderTerminationAttemptStatus = "PENDING" | "APPROVED" | "DENIED";

type OrderTerminationResolutionPath =
  | "TRADE_LOCAL"
  | "RENTAL_FULFILLMENT"
  | "RIDE_HAILING_FULFILLMENT";

type OrderTerminationEffectKind = "NONE" | "POLICY_REFUND" | "ABORT_FEE";

type OrderTerminationAttempt = {
  attempt_id: string;
  requested_at: string;
  requested_by: string;
  status: OrderTerminationAttemptStatus;
  resolution_path?: OrderTerminationResolutionPath | null;
  reason?: string | null;
  effect_kind?: OrderTerminationEffectKind | null;
  effect_amount_fen?: number | null;
  decided_at?: string | null;
};

type RentalOrder = TradeOrderBase & {
  family: "RENTAL";
  selected_zone_codes: string[];
  service_start_at: string;
  service_end_at: string;
  participant_count: number;
  contact_phone: string;
  registrants: {
    full_name: string;
    national_id?: string | null;
  }[];
};

type RideHailingOrder = TradeOrderBase & {
  family: "RIDE_HAILING";
  departure_time: string;
  rider_count: number;
  selected_vehicle_sku_id: number;
  route_snapshot: unknown;
  rider_contact_phone?: string | null;
  quote_snapshot: {
    pricing_input_snapshot: unknown;
    estimated_at: string;
    expires_at?: string | null;
    pricing_snapshot: OrderPricingSnapshot;
  };
};
```

## Snapshot Boundary

Order creation should freeze these truths:

- offer identity and terms version
- selected SPU/SKU identity and versions
- SKU facts snapshot
- pricing model snapshot
- resolved pricing snapshot and `PriceExplanation[]`
- SKU cancellation-policy snapshot where applicable
- split-rule snapshot
- family-specific order request payload

Order participants should not be described as a frozen snapshot copied from PR.
The more accurate current model is:

- on creation, current PR active participants are used to initialize
  `order.participants`
- `order.participants` is an Order-owned participant set
- current UI does not expose participant editing
- API-level participant adjustment can exist technically, but it is not part of
  the current user-facing issue-231 product contract

The PR attachment block is not a substitute for Offer / SPU / SKU pricing
snapshots.

PR attachment should not be snapshotted into Order in current scope. Pricing,
cancellation, and catalog truth are frozen separately in `offer_snapshot`,
`items`, and `pricing_snapshot`. PR attachment truth belongs to PR domain and
its relation model.

Order should not freeze:

- Placement creative
- product presentation images/details by default
- future BillShare settlement status
- future Fulfillment result state

## Status Ownership

Order write state should stay narrow.

Authoritative truths live in different owners:

- Bill owns settlement status
- Payment owns money-movement status
- Fulfillment owns booking / provider / completion result

Order should therefore not become a god enum like
`PENDING_PAYMENT -> PAID -> BOOKED -> REFUNDED` as the only source of truth.

Recommended split:

- Order aggregate owns `status`
- Order aggregate owns termination workflow truth
- Bill / Payment own settlement state
- Fulfillment owns execution/result state
- user-facing Order Detail phase is a projection composed from all of them

The important subtlety is:

- `Order.status` answers whether the contract is still open or already
  terminated
- `termination_attempts` answer what happened during each termination attempt
- Order should persist only the termination delta facts, not duplicate
  cancellation-policy snapshots or live fulfillment truth that already belong
  elsewhere
- For Rental, exact refund tier and percent should not be duplicated on the
  attempt record; they belong in the Order-translated `BillTargetAmountSeed`

## Key Invariants

- PR attach must succeed in the same transaction as order creation.
- If PR domain rejects attach because the PR is not READY or because
  `order.created_by` does not match `pr.created_by`, the entire order creation
  rolls back.
- For current PR-context commerce in issue 231, PR domain and the attachment
  relation must ensure at most one non-terminal Order per `(pr_id, offer_id)`
  to avoid Placement target ambiguity.
- Order snapshots are immutable after creation except for contract-state
  transitions, participant-set maintenance, and foreign references such as Bill
  / Fulfillment linkage.
- Default unpaid timeout is 30 minutes.
- Order cancellation and refund logic must use the frozen cancellation-policy
  snapshot, not current catalog state.
- For current issue-231 creation flow, current PR active participants are used
  to initialize `order.participants`.
- `termination_attempts` are Order-owned child records, not a top-level peer
  aggregate.
- An order may have multiple termination attempts, but at most one may be
  approved in the current scope.
- At most one attempt may remain `PENDING` at a time.
- When an attempt is approved:
  - `order.status` must be `CANCELLED`
  - the approved attempt `decided_at` must exist
- In current issue 231:
  - `POLICY_REFUND` and `NONE` are Rental-side financial effects after approval
  - `ABORT_FEE` is a RideHailing pre-trip provider-abort financial effect

## Fulfillment-To-Order Translation

The current preferred topology is:

- Fulfillment is the authority on service-side termination admissibility
- Order is the translator from service-side termination result to contract
  termination and Bill-side equivalence

So Fulfillment should return a normalized decision such as:

```ts
type FulfillmentTerminationDecision =
  {
    outcome: "APPROVED" | "DENIED";
    reason?: string | null;
    fee_fen?: number | null;
  };
```

Then Order / Trade uses:

- frozen contract snapshots already on the Order
- current Bill settlement truth
- the `FulfillmentTerminationDecision`

to derive a `BillTargetAmountSeed`.

That `BillTargetAmountSeed` expresses only the equivalent buyer-side total
amount after seller-side termination resolution. Bill remains free to decide
how to realize that delta as extra charge lines or refund lines.

This is the key "equivalence" step:

- seller-side fulfilled reality is reported by Fulfillment
- Order converts that into the buyer-side money delta required to remain
  equivalent

`reason` should now be understood as explanatory text, not as the primary
money-calculation input. The core
algorithmic inputs are:

- whether fulfillment approved or denied termination
- any provider-authoritative fee amount
- frozen order snapshots already owned by Order

This keeps the topology simple:

- Fulfillment decides whether seller-side performance can still be unwound
- Order converts that into contract-state change plus money-side equivalence
- Bill materializes the resulting delta

## Aggregate Methods

Recommended Order aggregate methods:

- `attachBill(billId)`
- `attachFulfillment(fulfillmentId)`
- `initializeParticipantsFromPr(activeParticipants)`
- `appendTerminationAttempt(actor, requestedAt)`
- `markTerminationAttemptResolving(attemptId, resolutionPath)`
- `approveTerminationAttempt(attemptId, reason, effect)`
- `denyTerminationAttempt(attemptId, reason)`
- `expireIfUnpaid(now)`
- `markFailed(reason, at)`
- `markCompleted(at)`
- `markCancelled(at)`

Recommended RentalOrder-specific validation / methods:

- `assertReservationRequestValid()`
- `assertRegistrantCountMatchesParticipants()`

Recommended RideHailingOrder-specific validation / methods:

- `assertQuoteSnapshotPresent()`
- `assertRideRequestMatchesQuoteBasis()`

These methods should remain about order-contract truth. They should not
implement external payment querying or supplier booking side effects.

## Application Services

The main workflow logic belongs in Trade application services rather than in
entity-to-entity nested calls.

Recommended services:

- `DraftOrderPricingService`
  - assemble `PricingInput`
  - execute SKU base pricing model
  - apply SPU pricing policy
  - apply Offer pricing policy
  - return `OrderPricingSnapshot` preview plus `PriceExplanation[]`
- `CreatePrContextOrderService`
  - load Offer / SPU / SKU
  - resolve and freeze pricing
  - build order snapshots
  - initialize `order.participants` from current PR active participants
  - create Order
  - ask PR domain to attach the order in the same transaction
  - treat PR-domain attach as the final authority gate for READY and
    `created_by` ownership
  - create Bill / Fulfillment foundations where required by the family
- `CancelOrderService`
  - append termination attempt
  - request a normalized `FulfillmentTerminationDecision`
  - translate that decision plus frozen order snapshots into a
    `BillTargetAmountSeed`
  - finalize Order contract state from that translation

## Family Notes

### RentalOrder

- Usually creates Bill immediately after order creation in the first 6C loop.
- Requires reservation attributes such as zone, service time, contact, and
  real-name registration payload.
- After Bill settlement, Rental Fulfillment can begin manual booking.

### RideHailingOrder

- In issue 231, it is a quote/order foundation rather than a real provider
  dispatch workflow.
- Must freeze quote basis and price explanations at contract time.
- Bill / Payment foundation may be immediate or deferred depending on later
  policy; the Order model should not assume every RideHailingOrder instantly
  creates a payable Bill.

## Participant Exit In Current Scope

For issue 231 as currently scoped, do not design or promise a normal
participant-exit product capability.

Reason:

- participant removal quickly expands into Bill allocation, refund obligation,
  settlement fairness, and fulfillment-side side effects
- the current Rental and RideHailing loops do not depend on that feature for
  MVP commercial validation

Therefore:

- `order.participants` exists as an Order-owned participant set
- UI does not expose participant-management controls in current scope
- participant removal / dispute handling should fall back to operator or
  customer-service handling
- if later product work wants self-service participant exit, it must be scoped
  together with Bill and Fulfillment consequences rather than added as a small
  Order-side convenience feature

## Current Scope Decision

For issue 231 as currently scoped:

- do not introduce a persisted Cart
- do not introduce a persisted draft Order
- do not introduce TradeProposal
- create Order directly from validated request + frozen pricing result

If later commercial loops truly require asynchronous multi-user selection or
consensus, that should be introduced as a new Trade design slice rather than
left half-enabled in the current issue.
