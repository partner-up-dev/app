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
- Active mode: Execute.
- Current discussion scope: Phase 4 Payment implementation planning.
- TDD means Technical Design Document in this packet. Test-driven development
  remains useful later, but executable tests should wait until product and
  technical contracts are stable enough.
- Implementation status: Phase 0 complete. Corrected Phase 1 complete.
  Phase 2 complete. Phase 3 Rental baseline complete.
- Production code and executable tests are now allowed because the user
  explicitly said to start.

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
- `71-phase-4-payment-implementation-plan.md`: concrete Phase 4 Payment
  implementation plan across data model, APIs, frontend, provider adapter,
  settlement orchestration, refunds, and tests.
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
- PaymentTx targets exactly one BillLine, not the Bill as a whole. Each
  participant pays their own BillLine; creator paying for other participants is
  out of scope for issue 231.
- Current Phase 4 UI direction is `Order Detail -> Bill Detail -> Payment
  Checkout`. Order Detail shows contract/service state and links to Bill
  Detail; Bill Detail owns obligation visibility; Payment Checkout owns one
  BillLine's provider-backed payment attempt.
- Fulfillment exists only to own service-execution truth that cannot be reduced
  to Order, Bill, or Payment. Manual operator work alone does not justify a
  separate domain.
- User payment integration target is WeChatPay APIv3. Frontend polling and
  backend gateway callbacks jointly drive the payment state machine. Callback
  transitions have first-class authority equal to status query transitions, and
  both paths must be idempotent.
- Payment provider extensibility is modeled as provider type plus provider
  instance. For WeChatPay, an instance is uniquely identified by `mch_id +
  app_id`. A server-owned `client_id -> provider_instance` binding chooses the
  provider instance. WeChat API execution mode such as JSAPI or H5 is
  provider-instance configuration, not PaymentTx channel. Native QR is out of
  Phase 4 scope.
- Payment provider credentials are stored directly inside the
  `PaymentProviderInstance.config` row for the Phase 4 serverless MVP. A
  WeChatPay provider instance config contains `apiV3Key`,
  `merchantCertificate`, and optional `platformCertificates`; when platform
  certificates are absent, the runtime downloads them from WeChatPay and
  persists the refreshed config. This increases DB blast radius and must be
  bounded by strict access control, redaction, and rotation discipline.
- Phase 4 provider configuration should use config-driven registration: an
  explicit backend command reads typed config and idempotently upserts a
  provider instance with its owning `clientId`.
- WeChatPay integration should use a mature SDK behind
  `WeChatPayProviderAdapter` rather than hand-writing the full signing,
  verification, and decryption path. If the chosen SDK depends on axios, axios
  must be pinned/overridden to a reviewed clean version and CI must reject known
  malicious versions.
- Do not introduce a separate `payment_provider_events` table in Phase 4 unless
  audit/dispute requirements become concrete. Idempotency should be handled by
  stable provider order/refund numbers, provider transaction ids, and monotonic
  PaymentTx transitions.
- Placement target should be backend-authored, for example
  `{ kind: "ORDERING", placementInstanceId, context } | { kind: "ORDER", orderId }`,
  so the frontend never infers whether an order already exists and does not
  depend on Offer as the public pre-order contract.
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
- The long-term admin information architecture should use three nav items:
  `Merchandising`, `Trade`, and `Payment`.
- But current Phase 2 admin implementation should not build `Payment Admin`
  yet. The first concrete admin views should be grouped as:
  `Product`, `Placement+Offer`, `Order+Bill`, and `Fulfillment`.
- Phase 2 should reuse the existing admin topology rather than invent a new
  parallel admin shell. The current implementation direction is a dedicated
  `admin-commerce-management` backend slice under `/api/admin/commerce/*`
  plus concrete admin pages for `Product`, `Placement+Offer`, `Order+Bill`,
  and `Fulfillment`.
- Real-name / identity-document privacy, masking, retention, and operator
  permission hardening are deferred for now and should not block current issue
  231 implementation planning.
- Baseline frontend discussion should now center on two user-visible chains:
  Rental and RideHailing from PR Page to Order completion/cancellation.
- `PR Page -> Ordering Detail -> Order Detail` is the preferred route spine
  for MVP user journeys. PR Page is the entry surface, Ordering Detail is the
  pre-order assembly surface, and Order Detail is the long-lived post-create
  lifecycle surface.
- `Offer` should not replace `Ordering`. Ordering is the more general frontend
  and application contract. It may carry or depend on an Offer, but it should
  remain a distinct concept from the selling offer itself.
- PR should stay outside Ordering. Current preferred direction is:
  page entry carries only refs/ids from existing owners; backend then resolves
  current Ordering read truth from those refs, currently often by traversing
  `Placement -> Offer -> Product`.
- Placement must know which Ordering field keys are bindable/lockable for the
  target selling flow, but it should not own full field schema or page layout.
- Backend should complete the Ordering read-model resolution before the
  frontend enters Ordering Detail.
- Do not introduce a separate standalone Ordering Assembler owner or
  `Offer*ContractSlice` middle object in the current scope.
- Do not treat `Derived ordering definition` as a standalone model either. At
  most it is discussion shorthand for the query-time field-definition fragment
  already embedded inside the Ordering page payload.
- The Ordering-side transport should stay narrow and readable:
  route/use-case-specific existing-owner refs/id only + current Ordering read model +
  `OrderingEvaluation`, where initial/default/locked input state lives inside
  the current Ordering read model.
- Ordering should be decoupled from Offer at the frontend/API contract level.
  Offer remains an upstream backend owner in the internal resolution chain, not
  the public pre-order contract for the page.
- How the user entered Ordering is outside the Ordering model itself. The input
  must not assume a specific predecessor such as Placement or Offer.
- Ordering is not persisted and has no `orderingId`. Do not introduce
  `resolveRef`, `orderingRef`, or any other generic Ordering locator to stand
  in for existing upstream owners.
- Create-order command shape belongs to Trade / Order, not to Ordering.
- Ordering input should be derived backward from Trade's `CreateOrderCommand`:
  selected item ids, quantities, and editable request fields are user input;
  product, pricing, policy, cancellation, and locked context values are
  backend-authoritative truth.
- It is still acceptable for Trade's `CreateOrderCommand` to carry `offer_id`,
  because that is a contract-source reference used by Trade to re-read and
  freeze Offer truth; it does not make Ordering read contract Offer-coupled.
- Reuse existing domain names where possible. Do not invent a generic
  `sellable` layer when SPU is already the sellable product body in the catalog
  model.
- Field defaults and editability/locking should be controlled by upstream
  metadata rather than by hard-coded per-page PR logic.
- Current agreed invariant: PR-bound fields are locked, and this should be
  enforced by Placement-owned binding metadata.
- `OrderingAvailability` and price preview are Ordering-owned computed state
  for current order input, not sibling boundaries next to Ordering.
- Phase 3 baseline frontend starts with the Rental browser system scenario.
  Payment and Rental Fulfillment may use simple browser-visible fake actions
  while real payment integration remains deferred. Full RideHailing chain and
  RideHailing browser scenario completion are not part of Phase 3.
- Cancellation should remain in the Order Detail journey. Payment should use
  dedicated Bill Detail and Payment Checkout pages because the payment target is
  a participant BillLine, not the whole Order or Bill.
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
  `PR Page -> Ordering Detail -> Order Detail`, with payment and cancellation
  staying inside the Order Detail journey rather than spawning extra user-facing
  routes by default.
- 2026-05-28: Phase 0 started and completed. Stable ecommerce cross-unit
  design was promoted into `docs/20-product-tdd/ecommerce-contracts.md` and
  connected into Product TDD index, unit topology, and system-state authority.
  A dedicated commit was created for this phase together with the task packet.
- 2026-05-28: Phase 1 backend foundation started. Added backend domain
  skeleton folders for `merchandising`, `trade`, `fulfillment`, `bill`, and
  `payment`, plus pure model/service code for stable rules only: Order
  termination attempt workflow, Rental/RideHailing fulfillment lifecycle
  derivation, and Bill target-total delta derivation. Targeted backend unit
  tests for the new ecommerce skeleton passed. Full `apps/backend` typecheck is
  currently blocked by a pre-existing error in
  `src/domains/pr-core/services/waitlist.service.test.ts`.
- 2026-05-28: Bill design was simplified again before further implementation:
  `BillLine` should no longer persist a structured upstream-cause union.
  Human-readable `label` plus optional `description` is enough for BillLine.
  `SplitRuleSnapshot` should use canonical `RELATIVE` or `ABSOLUTE` forms,
  while `AA_EQUAL` is treated only as an upstream helper/input mode rather than
  durable cross-domain truth.
- 2026-05-28: Phase 2 admin scope was tightened again before UI work:
  `Payment Admin` should not be built yet. Current admin-view implementation
  order should group around `Product`, `Placement+Offer`, `Order+Bill`, and
  `Fulfillment`, even though the longer-term admin IA still recognizes
  `Merchandising`, `Trade`, and `Payment` as coarse product areas.
- 2026-05-28: Corrected Phase 1 implementation to match the user's real
  definition: backend foundation now means `entities + repositories +
  use-cases + migration`, while still excluding `controller`, `payment`, and
  `ride hailing`. Added Rental-first persistence entities, repositories,
  `0070_ecommerce_rental_foundation.sql`, merchandising contract guards,
  merchandising create use cases, transactional `createRentalOrder` with PR
  READY attach gate plus immediate Bill creation, and basic Rental Fulfillment
  use cases. Verification: touched backend unit tests pass, `db:lint` passes,
  and full backend typecheck now fails only on the pre-existing
  `waitlist.service.test.ts` issue.
- 2026-05-28: Adjusted Phase 3 sequencing: Rental and RideHailing browser
  system scenario tests should be written before the bulk of baseline frontend
  UI implementation. Early scenario work may use simple payment/fulfillment
  test doubles while real integrations stay deferred to later phases.
- 2026-05-28: Finished the main remaining Rental-side Phase 1 tail:
  explicit `CancellationPolicySnapshot` typing on Order item snapshots,
  Rental termination target-total derivation, Bill effective-total
  reconciliation with deterministic proportional allocation, and trade use
  cases for requesting/finalizing Rental termination attempts. The exact Bill
  reconciliation rule is no longer treated as an open question.
- 2026-05-28: Phase 2 started and baseline admin/operator implementation landed
  on top of the corrected Rental foundation. The implementation reuses the
  existing admin shell and adds a dedicated
  `/api/admin/commerce/*` backend slice plus concrete admin views for
  `Product`, `Placement+Offer`, `Order+Bill`, and `Fulfillment`. Verification:
  targeted backend ecommerce unit tests still pass, backend typecheck remains
  blocked only by the pre-existing `waitlist.service.test.ts` error, and
  frontend build passes.
- 2026-05-29: Phase 3 started with the Rental baseline user chain. Added
  minimal public commerce APIs for PR Button Placement resolution, Rental
  Ordering read/evaluate/create, Order Detail projection, browser-visible fake
  payment, and fake Rental booking confirmation. Added PR utility placement
  entry, Rental Ordering Detail, Rental Order Detail, and the
  `commerce_rental_ordering_reaches_confirmed_fulfillment` system scenario.
  Verification: frontend `vue-tsc` passes; targeted Rental system scenario
  passes; backend typecheck remains blocked only by the pre-existing
  `waitlist.service.test.ts` `orderIds` type error.
- 2026-05-29: Strengthened the Rental system scenario from a pure happy-path
  navigation check into a content-and-interaction scenario. It now verifies
  Ordering product copy, locked participant count, two same-headcount zone/SKU
  choices, price preview update when switching zone from CNY 20.00 to CNY
  32.00, Order Detail frozen selected SKU, participant count, total price, bill
  line count, payment status transition, and Rental fulfillment success copy.
- 2026-05-29: Corrected two Phase 3 boundary leaks: Ordering read/evaluate no
  longer performs the PR active-participant gate beyond UI reachability, and
  PR READY / creator / duplicate active-order authority moved into a
  PR-owned `attachOrderToPr` use case called inside the Trade order-creation
  transaction. Trade still builds and freezes the order, but PR owns whether
  the order may attach to the PR.
- 2026-05-29: Completed the remaining Phase 3 Rental frontend baseline gates:
  Ordering now shows cancellation-policy summary and a price-detail affordance;
  Order Detail supports a browser-visible Rental cancellation sequence backed
  by existing termination attempt and Bill reconciliation use cases; PR Button
  Placement existing-order target is covered; non-READY and non-creator
  Ordering states are browser-verified as disabled. The Rental system scenario
  file now contains four browser scenarios covering completion, disabled
  states, cancellation, and existing-order routing. Verification: backend
  typecheck, frontend `vue-tsc`, backend Problem Details lint, and the targeted
  Rental system scenarios all pass.
- 2026-05-29: Refined Phase 4 Payment topology before implementation:
  PaymentTx remains BillLine-scoped, each participant pays their own line,
  Bill Detail and Payment Checkout become dedicated user-facing pages, and
  Rental Fulfillment should be started by explicit Trade/application-service
  orchestration after prepaid Bill settlement rather than by modeling
  Fulfillment as a generic listener. A separate provider-event table is not in
  Phase 4 scope unless concrete audit/dispute requirements appear.
- 2026-05-29: Expanded Phase 4 into a concrete implementation plan in
  `71-phase-4-payment-implementation-plan.md`: PaymentTx persistence,
  provider port and WeChat adapter, Bill Detail, Payment Checkout, callback/query
  idempotency, explicit Trade settlement consequences, refund PaymentTx flow,
  and multi-participant BillLine payment system scenarios.
- 2026-05-29: Added provider-instance/client routing to the Phase 4 plan:
  provider type is separate from provider instance, WeChatPay instances are
  keyed by `mch_id + app_id`, and `client_id` maps to provider instance so the
  `web` client can route to WeChatPay without changing Bill or Order. WeChat
  API execution mode stays inside provider configuration.
- 2026-05-29: Added provider credential configuration to the Phase 4 plan:
  provider instances carry `clientId` and callback routes include
  `providerInstanceId` only as a routing hint.
- 2026-05-30: Clarified secret storage and config persistence: Phase 4 stores
  WeChatPay `apiV3Key`, merchant certificate material, and platform
  certificates directly in `PaymentProviderInstance.config` as a serverless MVP
  compromise. If platform certificates are absent, runtime WeChatPay adapter
  code downloads and persists them. This replaces the previous
  secret-ref/encrypted-DB and separate credential-row plans and requires redaction,
  restricted DB access, and rotation discipline. Also added a WeChatPay SDK
  spike: prefer a mature SDK behind the provider adapter, and if it brings
  axios, pin/override axios to a reviewed clean version and block known
  compromised versions in CI.
- 2026-05-30: Added Phase 4 global review. The current plan is sufficient for
  implementation after confirming first production `client_id`, WeChatPay SDK
  choice, merchant order/refund number format, payment expiration behavior,
  callback failure handling, refund trigger timing, and credential readback
  redaction.
- 2026-05-30: Confirmed the current `apps/frontend` payment client id is `web`,
  not `wechat_official_account_web`; Phase 4 implementation should route `web`
  through the server-owned provider-instance/client-binding table.
- 2026-05-30: Started Phase 4 implementation: added Payment provider
  instance/credential/client-binding/PaymentTx persistence, BillLine-scoped
  Payment Checkout, Bill Detail, fake WeChatPay scenario adapter, WeChatPay
  APIv3 adapter boundary using `wechatpay-axios-plugin@0.9.6`, axios
  `1.16.1` pin/override, and a payment supply-chain lint.
- 2026-05-30: Completed the Phase 4 implementation slice: added WeChatPay charge
  and refund callback routes, config-driven provider registration, PaymentTx
  charge/refund convergence, BillLine-scoped Checkout client actions, direct
  refund PaymentTx creation after Rental cancellation refund lines, and paid
  cancellation browser coverage. Verification scope is recorded in the Phase 4
  implementation plan.
- 2026-05-30: Tightened Phase 4 after review: removed WeChatPay Native support,
  removed PaymentTx channel, modeled charge/refund through `PaymentTx.type`,
  moved JSAPI/H5 into WeChat provider `chargeMode`, and corrected the
  settlement topology so Payment convergence asks Bill to derive settlement,
  Bill notifies Order, and Order starts Rental Fulfillment.
- 2026-05-30: Corrected the Payment provider topology again: PaymentTx now
  points to `PaymentProviderInstance` and exactly one BillLine; BillLine owns
  refund-to-charge-line linkage through `refundOfBillLineId`; provider
  instances own exactly one runtime `clientId`; and the frontend sends client
  identity only as the RPC-layer `x-client-id` header (`web` for
  `apps/frontend`).
