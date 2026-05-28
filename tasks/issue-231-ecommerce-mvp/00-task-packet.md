# Issue 231 Ecommerce MVP

## Objective & Hypothesis

Design the Technical Design Document route for the Ecommerce MVP before
implementation.

Hypothesis: issue 231 should be driven from commercial demand loops, then
realized through explicit domain groups under an ecommerce umbrella:
Merchandising, Trade, Fulfillment, Bill, and Payment. Route families stay
independent even when implementation ownership is grouped.

## Input Classification

- Type: Intent.
- Active mode: Explore -> Solidify.
- Current discussion scope: TDD and implementation slicing only.
- TDD means Technical Design Document in this packet. Test-driven development
  remains useful later, but executable tests should wait until product and
  technical contracts are stable enough.
- Implementation status: not started. Do not create production code or
  executable test files until the user explicitly says to start.

## Baseline

- GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/231
- Local baseline branch: `develop`
- Baseline commit: `dc063018`
- Precondition verified: issue 229 is closed and `develop` contains Booking
  Support removal work under `tasks/issue-229-remove-booking-support/`.

## Working Files

- `00-task-packet.md`: packet entry, scope, status, and guardrails.
- `05-commercial-demand-map.md`: business demands mapped to capabilities and
  owning domains.
- `10-tdd-map.md`: Technical Design Document map, acceptance scenario spine,
  and supporting test candidates.
- `20-implementation-slices.md`: commercial-loop technical-design execution
  slices.
- `30-open-questions.md`: decisions that should be confirmed before coding.
- `40-domain-topology.md`: domain topology and ownership boundaries.
- `44-merchandising-product-catalog.md`: Product Catalog minimal model and
  current SKU examples.
- `45-merchandising-placement-offer.md`: Placement and Offer internal
  Merchandising design.
- `46-trade-order-model.md`: Trade Order write model, snapshots, state
  ownership, and application-service design.
- `47-bill-model.md`: Bill and BillLine write model, settlement derivation,
  refund obligations, and Bill-domain services.
- `48-fulfillment-model.md`: first-principles Fulfillment need, ownership
  boundary, and current RideHailing scope tension.
- `49-order-cancellation-sequences.md`: cancellation workflow topology across
  Trade, Fulfillment, Bill, and Payment.
- `50-system-scenarios.md`: system scenario spine and sequence diagrams.
- `52-basic-frontend-user-journeys.md`: baseline frontend user journeys from
  PR Page to Order completion/cancellation for Rental and RideHailing.
- `60-6c-time-slot-reservation.md`: concrete 6C cooking-school reservation
  loop, state machine, placement matching, pricing, payment, and cancellation
  rules.
- `65-sku-cancellation-policy.md`: SKU base cancellation/refund policy model.
- `66-pr-ready-ordering-gate.md`: PR READY order attach gate and transactional
  invariant.
- `70-execution-plan.md`: staged implementation plan after design approval.
- `sequence-diagram-rental.md`: user-provided rental end-to-end flow reference.
- `sequence-diagram-ride-hailing.md`: user-provided ride-hailing end-to-end flow
  reference.

## Guardrails Touched

- Product and cross-unit contract truth:
  - `docs/10-prd/behavior/*`
  - `docs/20-product-tdd/system-state-and-authority.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/test-platform.md`
- Backend authority:
  - merchandising domain group: Product Catalog, Offer, Placement
  - trade domain group: in-scope Order families
  - fulfillment domain group: Rental Fulfillment and RideHailing Fulfillment
  - bill domain
  - payment domain
  - rental fulfillment facts for manually operated 6C reservations
  - fulfillment-family domains
  - PR-scoped placement read contract
  - domain command controllers and use-cases
- Frontend composition:
  - PR detail utility region under `apps/frontend/src/pages/PRPage.vue`
  - PR-domain utility peer components under
    `apps/frontend/src/domains/pr/ui/sections/`
  - Button Placement inside the PR Page Utility Actions region
- new route families for offer, order, product, placement, and bill/order
  surfaces, not nested under `/pr/*`
- Verification:
  - backend unit tests
  - frontend unit tests
  - backend scenario tests
  - root system scenario tests

## Current Decisions

- Booking Support is not the replacement substrate. It has been removed before
  issue 231; any reused idea must be reintroduced as ecommerce-owned behavior.
- The implementation strategy is not "ship one smallest commercial loop first,
  then grow." The TDD strategy starts by mapping the business loops, required
  functions, domain split, topology, and state transitions.
- Each commercial loop should get its own system scenario.
- System scenarios are black-box browser scenarios. Assertions should observe
  user-visible state through the browser, not probe backend API responses,
  database rows, or internal repositories.
- New route families introduced by this issue stand on their own. Offer, Order,
  Product, Placement, and Bill surfaces do not live under `/pr/:id/*`.
- `ecommerce` is an umbrella term for the issue and product area. It should not
  become a dumping-ground backend or frontend module.
- Product Catalog should use SPU plus SKU modeling, not a PR type enum and not
  a three-layer catalog for MVP. SPU and SKU ids are auto-increment integers.
- Placement has typed instances. This task implements only Button Placement.
  The Button Placement is rendered inside the PR Page Utility Actions region.
  The former below-Utility-Actions placement card is out of scope for now.
- Placement owns type-specific creative payloads. Product Catalog owns SPU/SKU
  sales and product-native pricing policy. Offer owns an SPU list and optional
  campaign/commercial overlay policy; it does not own campaign copy/media.
- Placement route/read surfaces are Placement-owned. PR detail may render a
  placement projection, but it is not the parent namespace or owner for
  Placement.
- Admin CRUD for Merchandising belongs to this task. First release should not
  rely only on seeded merchandising records.
- Current issue-231 loops do not require a persisted TradeProposal, Cart, or
  draft Order. Order is created directly from validated request plus frozen
  pricing result. If a later commercial loop needs asynchronous multi-user
  coordination, that should be introduced as a separate Trade design slice.
- Bill and Payment remain separate. Bill owns split obligations; Payment owns
  external money movement.
- Fulfillment exists only to own service-execution truth that cannot be reduced
  to Order, Bill, or Payment. Manual operator work alone does not justify a
  separate domain.
- User payment integration target is WeChat Pay APIv3. Frontend polling and
  backend gateway callbacks jointly drive the payment state machine. Callback
  transitions have first-class authority equal to status query transitions, and
  both paths must be idempotent.
- Placement target should be backend-authored, for example
  `{ kind: "OFFER", offerId } | { kind: "ORDER", orderId }`, so the frontend
  never infers whether an order already exists.
- Ride-hailing real provider fulfillment is out of scope for this task. This
  no longer means a pure placeholder boundary. The task now includes the
  minimum RideHailing Fulfillment execution truth required for usage-based
  final settlement, while full dispatch/monitoring UX and provider settlement
  accounting remain out of scope.
- Rental Fulfillment is already required in issue 231 because paid reservation
  execution, supplier confirmation/rejection, entry guidance, and manual
  supplier-side cancellation handling cannot be owned by Order, Bill, or
  Payment.
- Provider-backed ride execution belongs inside the RideHailing Fulfillment
  slice for this MVP. It should not be split into a separate top-level
  aggregation domain unless later provider-selection/failover complexity makes
  that slice independently large.
- Rental Fulfillment should have an operator-facing execution surface distinct
  from Merchandising Admin configuration.
- Exact Admin CRUD field-by-field confirmation is not a prerequisite discussion
  item anymore. Current implementation should follow three admin principles:
  fine-grained APIs, single-column card layout by default, and separate admin
  navigation items for Merchandising, Trade, and Payment.
- The first admin information architecture should use three nav items:
  `Merchandising` (Product, Placement, Offer), `Trade` (Order, Bill,
  Fulfillment), and `Payment`.
- Real-name / identity-document privacy, masking, retention, and operator
  permission hardening are deferred for now and should not block current issue
  231 implementation planning.
- Baseline frontend discussion should now center on two user-visible chains:
  Rental and RideHailing from PR Page to Order completion/cancellation.
- `PR Page -> Offer Detail -> Order Detail` is the preferred route spine for
  MVP user journeys. PR Page is the entry surface, Offer Detail is the
  pre-order assembly surface, and Order Detail is the long-lived post-create
  lifecycle surface.
- Payment and cancellation should be expressed inside the Order Detail journey
  rather than by introducing separate user-facing payment-result or
  cancellation routes in MVP unless a gateway constraint later forces that.
- Restaurant group-buy coupon business demand and its supporting functions are
  out of scope for this issue. Do not implement Voucher Entitlement,
  entitlement redemption, QR redemption, GoodsOrder, or `/entitlements/*` in
  this task.
- Order creation from a PR is allowed only after the PR is `READY`. This task
  does not change PR READY lifecycle, READY copy, READY notification copy, or
  `FULL` behavior. The required invariant is transactional: when Trade creates
  an order and attaches it to a PR, PR domain must reject the attachment if the
  PR is not READY, causing the whole order creation transaction to roll back.
- Cancellation cannot be modeled by one generic cross-family regime. `Rental`
  cancellation is policy-first and fulfillment-gated; `RideHailing`
  cancellability and abort fee are provider-authoritative before actual trip
  usage starts.
- Order cancellation should be understood as commercial-contract termination.
  Fulfillment and Bill are layered side-effect owners of that termination
  attempt, not the meaning of cancellation itself.
- The cancellation model now further leans on a forward-versus-reverse
  performance reading: normal order flow performs the contract, while
  cancellation is a controlled unwind attempt that cannot erase performed
  history and therefore must materialize execution-side and financial-side
  consequences explicitly.

## Merchandising Closure Snapshot

The current Merchandising discussion is considered stable enough to serve as
the baseline for downstream Order / Bill / Fulfillment design.

### Product Catalog

- MVP Product Catalog uses two layers only: `SPU` plus `SKU`.
- There is no separate persisted top-level Product aggregate above SPU in this
  issue.
- `SPU` stores canonical `productType`; commerce contract fields such as
  ordering kind, order family, and fulfillment family are derived from that
  product type.
- `SPU` owns sales policy, service policy, product-native pricing policy, and
  presentation.
- `SKU` owns variant facts, base pricing model, and base cancellation-policy
  reference.
- `SkuFacts` are data-oriented variant facts, not a behavior-heavy model.
- `SpuPresentation` is display-only product detail data and is not frozen into
  order snapshots by default.

### Placement

- Placement is distinct from Offer and Product Catalog.
- Placement owns matching, creative, and backend-authored target resolution.
- Placement should distinguish `slotKey` from `PlacementInstance`.
- Current implemented slot shape for this issue is the PR Utility Actions
  button slot.
- Placement does not own price, order lifecycle, or fulfillment state.

### Offer

- Offer owns "how to sell", not "what the product is" and not "how to render
  campaign creative".
- Offer may include multiple SPUs, but all SPUs inside one Offer must share the
  same `productType` and therefore the same ordering family.
- Offer owns commercial overlay pricing rules and terms versioning.
- Offer does not own campaign copy/media; those stay in Placement.

### Pricing

- `PricingModel` is the executable SKU base-pricing model.
- `FIXED_TOTAL` resolves immediately.
- `DYNAMIC_QUOTE` is a valid SKU base-pricing model and carries an embedded
  quote-calculation JSON DSL (`calculatorSpec`).
- The quote DSL should be a generic typed arithmetic/component DSL rather than
  a ride-hailing-specific step enum.
- SPU pricing policy and Offer pricing policy share one rule DSL, but SPU
  policy may target only `SKU` while Offer policy may target `SKU`, `SPU`, or
  `ORDER`.
- `PriceExplanation` is a shared price-breakdown read model across SKU base
  pricing, SPU pricing policy, Offer pricing policy, and quote components.
- Runtime price execution belongs to a Trade / Order pricing application
  service, not to Merchandising. Merchandising owns pricing truth definitions;
  Trade owns pricing execution for a concrete order draft.

## Work Log

- 2026-05-25: Created packet for TDD discussion. Verified issue 231, issue 229,
  local baseline, Product TDD, PR detail projection, and PR utility topology.
- 2026-05-25: Revised route/domain/payment design: TradeProposal is internal
  order coordination; domain ownership is grouped into Merchandising, Trade,
  Fulfillment, Bill, and Payment; WeChat callback and frontend polling both
  drive payment state; SKU base cancellation policy and execution plan added.
- 2026-05-26: Revised scope: restaurant group-buy coupon loop removed; Admin
  CRUD is in scope; Placement typed instances added with only Button Placement
  implemented inside Utility Actions; product type now drives ordering page,
  order model, and fulfillment mechanism; PR READY is used only as the
  transactional order-attachment gate for this issue.
- 2026-05-26: Removed group-buy coupon supporting functionality from this
  task: Voucher Entitlement, entitlement redemption, QR redemption, GoodsOrder,
  and `/entitlements/*` are out of scope.
- 2026-05-26: Renamed fulfillment scope by product type: Rental Fulfillment
  and RideHailing Fulfillment. There is no separate Operator Fulfillment
  domain; current Rental Fulfillment is manually operated.
- 2026-05-26: Product Catalog discussion tightened the model further: SPU stores
  canonical `productType` and derives the commerce contract; SPU pricing policy
  and Offer pricing policy share one DSL but differ in legal targets; dynamic
  quote remains a valid SKU base pricing model for ride hailing; shared
  `PriceExplanation` is introduced for price-breakdown projection; Offer is
  limited to one product type; Placement now distinguishes `slotKey` from
  `PlacementInstance`.
- 2026-05-26: Pricing discussion clarified that ride-hailing dynamic quote is
  a SKU-owned base pricing model with embedded calculator JSON DSL executed by
  a local pricing calculator in this issue; price computation should be one
  explicit pricing pipeline over SKU -> SPU -> Offer rather than nested onion
  calls between those domain objects.
- 2026-05-26: Pricing discussion further refined the quote model: `DYNAMIC_QUOTE`
  does not need a separate `quoteKind`; quote calculation should use a generic
  typed arithmetic/component DSL rather than a ride-hailing-specific step enum;
  the explicit pricing pipeline application service belongs to the Trade / Order
  domain.
- 2026-05-27: Added the first Order design draft: Order is a binding contract
  with immutable commercial snapshots; TradeProposal is an optional internal
  precursor rather than mandatory for every current loop; Bill and Fulfillment
  remain separate owners, so Order keeps narrow contract state plus references
  instead of duplicating settlement/result truth.
- 2026-05-27: Refined the Order design further: current scope removes
  TradeProposal, persisted Cart, and persisted draft Order; `created_by` and
  `status` align with existing naming; PR attach is the final authority gate
  for READY plus creator ownership; `(pr_id, offer_id)` may have at most one
  non-terminal order in this issue.
- 2026-05-27: Refined Order again: PR -> Order attachment stays PR-owned and is
  not duplicated as an Order snapshot; current-scope "退出订单" is modeled only
  as whole-order cancellation before irreversible side effects, not as
  participant-level partial withdrawal.
- 2026-05-27: Refined Order participant handling: PR active participants should
  initialize the Order participant set rather than become an immutable
  participant snapshot; issue 231 does not provide a normal self-service
  participant-exit capability, and participant disputes fall back to manual
  operator/customer-service handling.
- 2026-05-27: Added the first Bill design draft: Bill freezes participant charge
  obligations from Order, Payment remains the owner of external money movement,
  Bill settlement is derived from Bill-owned application records, and refund
  obligations are created from frozen cancellation-policy snapshots plus
  customer-paid basis.
- 2026-05-27: Simplified the Bill design: Bill should be created from narrow
  seeds rather than mirror broad Order shape; RideHailing uses usage-based
  final billing after trip finish rather than quote-time final payable amount.
- 2026-05-27: Simplified Bill further into a more symmetric topology:
  `Bill + BillLine + BillApplication`; charge and refund are both participant
  obligation lines with different bases, while Bill owns settlement derivation
  semantics rather than mirroring PaymentTx or Order state.
- 2026-05-27: Simplified Bill again for current scope: `BillApplication` is not
  required yet; successful `PaymentTx` can target one `BillLine` directly, and
  Bill owns settlement derivation semantics over those successful money
  movements.
- 2026-05-27: Confirmed current Bill/Payment cardinality: `1 Bill -> N PaymentTx`,
  `1 BillLine -> N PaymentTx`, and `1 PaymentTx -> exactly 1 BillLine` for
  issue 231. Multi-line allocation by one PaymentTx remains a future expansion.
- 2026-05-27: Started Fulfillment from first principles instead of fields
  first: Fulfillment is justified only when service-execution truth cannot be
  reduced to Order/Bill/Payment. Rental clearly requires this. RideHailing now
  has an explicit scope tension: quote/order-preparation-only can keep a thin
  boundary, but real final settlement would require a minimal execution-truth
  Fulfillment owner before Bill creation.
- 2026-05-27: Resolved the main RideHailing Fulfillment direction: it should
  upgrade from a placeholder boundary to the minimum execution-truth owner
  required for usage-based final settlement. Provider-backed ride execution remains
  inside the Fulfillment slice for this MVP, while full dispatch/monitoring UX
  and provider settlement accounting stay out of scope. Rental Fulfillment
  should use a dedicated operator-facing operations surface rather than being
  hidden inside Merchandising Admin.
- 2026-05-27: Expanded Fulfillment into concrete family write models. Current
  direction is `1 Order -> at most 1 Fulfillment`, with intentionally different
  foundation timing: Rental Fulfillment starts after prepaid Bill settlement,
  while RideHailing Fulfillment starts at order creation because execution
  precedes final billing. Rental uses shared `lifecycle_status` plus
  `booking_status` and `cancellation_handling`; RideHailing uses shared
  `lifecycle_status` plus authoritative `ride_phase` and
  `final_settlement_input_commit`. RideHailing no longer commits final money
  directly inside Fulfillment; instead Fulfillment commits execution-side final
  settlement input, then Trade runs the frozen pricing contract and writes
  final pricing resolution before Bill creation.
- 2026-05-27: Refined RideHailing Fulfillment status flow: top-level
  fulfillment state is better split three ways: shared
  `FulfillmentBase.lifecycle_status` (`PENDING -> ACTIVE -> COMPLETED /
  CANCELLED / FAILED`), ride-specific authoritative `ride_phase`
  (`DISPATCHING`, `DRIVER_ACCEPTED`, `DRIVER_ARRIVING`, `IN_TRIP`,
  terminal ride phases), and a dedicated high-frequency live-tracking read
  contract rather than a persisted middle projection layer. This keeps
  cross-family lifecycle, ride-specific execution semantics, and volatile
  tracking reads from collapsing into one overloaded status field.
- 2026-05-27: Refined Rental Fulfillment to match the same topology more
  cleanly: shared `lifecycle_status` plus authoritative `booking_status` and a
  separate `cancellation_handling` subflow. `booking_status` no longer carries
  a fake `COMPLETED` value; completion belongs to lifecycle, while booking and
  cancellation remain explicit execution truths.
- 2026-05-27: Added cross-domain cancellation sequence analysis. The current
  conclusion is that cancellation is a Trade-owned workflow that may require
  Fulfillment gating and Bill consequence materialization. `Order.status` alone
  is not enough; Order needs additional termination-workflow truth beyond the
  coarse contract state.
- 2026-05-28: Corrected the cancellation analysis to be family-first rather
  than a fake universal regime. `Rental` manual-handling requirement now comes
  from the frozen order cancellation-policy snapshot and is then gated by live
  fulfillment truth. `RideHailing` cancellability and abort fee are
  provider-authoritative; local ride phase only classifies which path to use
  and does not decide fee/no-fee.
- 2026-05-28: Clarified the cancellation first principle further: Order
  cancellation is contract termination, while Fulfillment and Bill are the
  execution-side and obligation-side consequence owners. This reframing is now
  the preferred way to control cancellation complexity in issue 231.
- 2026-05-28: Refined the cancellation model again using a forward-versus-
  reverse performance framing. Order owns the contract and unwind request,
  Fulfillment owns service-side progress/reversibility truth, and Bill owns
  forward charge obligations plus reverse-direction offset consequences.
- 2026-05-28: Refined cancellation topology again: Order should not persist a
  large termination result object. The current preferred direction is
  `termination_attempts[]` under Order, a normalized
  `FulfillmentTerminationDecision` returned by Fulfillment, and an
  Order-translated `BillTargetAmountSeed` consumed by Bill.
- 2026-05-28: Simplified Rental termination persistence further: exact refund
  tier and percent are better derived by Order/Trade from immutable Order
  snapshots plus the termination attempt `requested_at`, then reflected in an
  exact `BillTargetAmountSeed`, rather than duplicated on the Order-owned
  attempt record or re-derived inside Bill.
- 2026-05-28: Replaced termination-side reason codes with configurable
  explanatory `reason` strings because those fields are no longer part of the
  money-calculation core. Also clarified that the packet is now strong enough
  for topology-led domain skeleton implementation, but several product/API
  details still need confirmation before full end-to-end coding.
- 2026-05-28: Tightened implementation-readiness assumptions. Exact Admin CRUD
  field confirmation and real-name privacy hardening are no longer treated as
  pre-implementation discussion blockers. Admin implementation should follow
  fine-grained APIs, single-column cards by default, and three nav items:
  Merchandising, Trade, and Payment. Planned implementation order is backend
  domain work first (excluding payment and ride-hailing integration details),
  then admin CRUD and Rental Fulfillment Ops, then baseline frontend UI after
  user-journey confirmation, then payment, then ride hailing.
- 2026-05-28: Frontend-discussion focus narrowed to two baseline user-visible
  chains only: Rental and RideHailing from PR Page to Order
  completion/cancellation. Preferred route spine is now
  `PR Page -> Offer Detail -> Order Detail`, with payment and cancellation
  staying inside the Order Detail journey rather than spawning extra user-facing
  routes by default.
