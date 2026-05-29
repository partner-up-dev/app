# Open Questions

## Still Needs Confirmation

1. Remaining route family details

   Confirm only path parameter names and whether Bill needs a standalone route
   or is always an order section. Confirmed user-facing route families:

   - `/products/:productId`
   - `/ordering/from-placement` for the current Placement-entry Rental flow
   - `/orders/:orderId`

   These are not nested under `/pr/:id/*`. Placement has an independent
   API/admin route family, but current recommendation is that Button Placement
   does not need a user-facing `/placements/:placementId` page. User-facing
   proposal/coordination state should be represented as an order phase. Do not
   introduce a user-facing `/proposals/*` route in this task; any future
   admin/internal proposal surface must be separately scoped.
   `/entitlements/*` is out of scope for issue 231.

2. Placement read contract shape

   Recommended endpoint shape:

   - `GET /api/commerce/placements?context=pr&contextId=:prId&type=BUTTON`

   Rejected as primary ownership shapes:

   - `GET /api/pr/:id/placements`
   - `GET /api/pr/:id` includes placement projection as the only source of
     truth

   PR detail may embed the placement projection later for page-load
   composition, but the contract and selection authority should remain owned by
   Placement.

3. Placement rule engine

   Confirmed MVP choice: use `json-logic-js` for Placement Matching Rule
   evaluation. Keep `json-rules-engine` as a future migration option only if
   matching later requires async facts such as LBS/geocoding lookup during rule
   evaluation. Hide the library behind a Merchandising-owned
   `PlacementRuleEngine` port.

4. Domain folder names

   Working backend candidates:

   - `domains/merchandising`
   - `domains/trade`
   - `domains/fulfillment`
   - `domains/bill`
   - `domains/payment`

   The important constraint is negative: do not put all of them under one
   `domains/ecommerce` bucket. The route design remains independent even when
   implementation ownership is grouped.

5. Tiered cancellation user-facing copy

   The rule is modeled as SKU base cancellation policy in issue 231. Offer
   cancellation overlay is a future extension. The visible copy still needs
   product wording before implementation.

6. Ride-hailing provider-integration cut

   Confirmed: issue 231 now includes the minimum RideHailing Fulfillment
   execution truth required for usage-based final settlement. It is no longer a pure
   placeholder boundary.

   Still open: how thin the provider-facing integration cut should be in the
   MVP. The current recommendation is:

   - keep provider-backed ride execution inside the RideHailing Fulfillment
     slice
   - do not split a separate top-level ride-aggregation domain yet
   - keep full dispatch/monitoring UX and provider settlement accounting out of
     scope

7. Order cancellation workflow record

   Current cancellation-sequence analysis now says the workflow record must be
   family-first rather than a fake universal cancel contract.

   Confirmed direction:

   - keep `Order.status` coarse
   - keep `termination_attempts[]` as Order-owned child records
   - let Fulfillment return a normalized termination decision that Order
     translates into a Bill adjustment

   Still open before coding:

   - exact minimal field set for `termination_attempts[]`
   - exact shape of `FulfillmentTerminationDecision`
   - exact shape of `BillTargetAmountSeed`
   - whether `RideHailing` should persist provider abort fee as part of the
     termination attempt, or only as a downstream Bill adjustment seed
   - whether a pure target-total seed is enough for all current bill
     reconciliation paths, including ride-hailing abort-fee allocation
   - whether post-irreversible Rental requests should be modeled as explicit
     denial or routed to a separately typed after-sales/manual-adjustment path

8. Remaining implementation readiness

   Current packet is strong enough for the Rental Phase 3 baseline already
   started. It is not yet strong enough to code the whole issue straight
   through without additional design decisions.

   The main remaining gaps are:

   - exact ride-hailing provider integration cut and live-tracking API shape
   - Rental cancellation result wording and state grouping
   - exact real-payment return/polling UX once WeChat Pay is implemented
   - exact RideHailing Ordering and Order Detail IA

9. Admin implementation principles to keep stable during execution

   Exact CRUD field confirmation is intentionally not treated as a design
   blocker anymore, but these implementation principles should remain stable:

   - fine-grained APIs
   - avoid two-column admin forms unless necessary
   - one card should usually occupy the full row
   - long-term admin IA recognizes three coarse areas:
     `Merchandising`, `Trade`, and `Payment`
   - but current Phase 2 should not implement `Payment Admin` yet
   - current concrete admin views should group as:
     `Product`, `Placement+Offer`, `Order+Bill`, and `Fulfillment`
   - current Phase 2 should reuse the existing admin shell and backend
     `/api/admin/*` topology rather than inventing a parallel admin surface

## Confirmed From Discussion

- Implementation is not ordered by "one commercial loop first, then extend."
- TDD should start from the business loops and domain topology.
- One commercial loop should have one system scenario.
- Offer, Order, and Product get user-facing route families. Placement has an
  independent API/admin route family; Button Placement itself is a PR-page
  projection in this task.
- `/entitlements/*` is out of scope for issue 231.
- `ecommerce` is an umbrella, not a single module bucket.
- User payment provider is WeChat Pay APIv3.
- Frontend polling and backend WeChat callback jointly drive payment state.
  Callback transitions are first-class state transitions, equal in authority to
  payment-status query transitions.
- System scenarios should be browser black-box tests and should not assert by
  probing API responses, database rows, or repositories.
- RideHailing Fulfillment is no longer modeled as a pure placeholder boundary.
  It should own the minimum execution truth required for usage-based final
  settlement.
- Rental cancellation handling is policy-first and fulfillment-gated:
  `requiresOperatorHandling` comes from the frozen order cancellation-policy
  snapshot, then is evaluated against live execution truth.
- RideHailing cancellability and abort fee are provider-authoritative. Local
  ride phase is path-classification context only and must not be used as the
  authority for fee/no-fee decisions.
- Provider-backed ride execution belongs inside the RideHailing Fulfillment
  slice in this MVP unless later complexity justifies a separate aggregation
  bounded context.
- Rental Fulfillment should have an operator-facing execution surface distinct
  from Merchandising Admin configuration.
- Restaurant group-buy coupon commercial demand is out of scope for this task.
- Admin CRUD for SPU/SKU, Offer, Placement Instance, and SKU
  cancellation policy is in scope.
- Exact Admin CRUD field confirmation is not required before implementation.
  Current implementation should instead follow stable admin principles:
  fine-grained APIs, one-column card layouts by default, and a current admin
  view grouping of `Product`, `Placement+Offer`, `Order+Bill`, and
  `Fulfillment`. `Payment Admin` is deferred for now.
- Phase 2 admin/operator implementation should reuse the existing admin shell
  and place its backend surface under `/api/admin/commerce/*`.
- Real-name / identity-document privacy, masking, retention, and permission
  hardening are deferred for now and should not block current issue 231
  implementation planning.
- Product Catalog uses two layers in MVP: SPU as the sellable service/product
  body, and SKU as the tradeable variant. SPU owns the canonical
  `productType`, derived commerce contract, SKU-selection policy, quantity
  policy, service policy, presentation, and product-native pricing policy. SKU
  owns variant facts and base pricing model. SPU and SKU ids are
  auto-increment integers.
- Voucher Entitlement, entitlement redemption, QR redemption, and GoodsOrder are
  out of scope because group-buy coupon functionality has been removed from
  this task.
- Placement is typed. This task implements only Button Placement, rendered
  inside PR Page Utility Actions.
- Placement owns type-specific marketing creative. Offer does not own campaign
  copy or media.
- Admin configures Placement Instances, creative payloads, and matching rules.
  Backend owns matching and final Offer/Order target authoring.
- Different SKU types select different ordering pages, order models,
  and fulfillment mechanisms.
- One Offer may contain multiple SPUs, but all SPUs inside one Offer must share
  the same product type / ordering family. Ordering Detail assembles one
  ordering root from the Offer SPU list and each SPU's sales policy.
- SKU owns a base pricing model. SPU owns product-native pricing policy.
  Offer's ordered rules are optional campaign/commercial overlays. SPU pricing
  policy and Offer pricing policy share one rule DSL, but SPU policy may target
  only SKU-level data while Offer policy may target SKU/SPU/Order data. Pricing
  rules can reset the target pricing model or apply positive-amount minus /
  ratio adjustments to the resolved amount. Conditions do not evaluate PR
  Context. Cancellation policy is SKU base only in issue 231; Offer
  cancellation overlay is a future extension.
- Ride-hailing `DYNAMIC_QUOTE` should be modeled as a SKU base pricing model
  with embedded quote-calculation JSON DSL (`calculatorSpec`) executed by a
  local calculator against order pricing input, not as a required provider API
  call in this issue.
- `DYNAMIC_QUOTE` does not need a separate `quoteKind` field at the pricing
  model layer. The quote DSL and SKU/product context already define the
  calculation semantics.
- Quote calculation DSL should be a typed arithmetic/component DSL, not a
  ride-hailing-specific step enum. It should support reusable numeric
  expressions, explainable components, and total-floor / total-cap adjustments.
- `PriceExplanation` should be a shared price-breakdown read shape across SKU
  base pricing, SPU pricing policy, and Offer overlay pricing, and should also
  be able to represent quote components emitted from the SKU base calculator
  DSL.
- The explicit pricing pipeline application service belongs to the Trade / Order
  domain, not Merchandising. Merchandising owns pricing truth definitions; Trade
  owns pricing execution for a concrete order draft.
- Fulfillment is named by product type: Rental Fulfillment and RideHailing
  Fulfillment. There is no separate Operator Fulfillment domain; current Rental
  Fulfillment is manually operated.
- PR-context order creation must attach the created order to PR inside the same
  transaction. PR domain rejects attachment when the PR is not READY, causing
  the whole order creation to fail atomically.
- Issue 231 should not change PR READY lifecycle, READY copy, READY
  notification copy, or `FULL` behavior.
- 6C merchant minimum quotes, platform-to-merchant deposit, supplier settlement,
  and inventory/capacity management are out of scope for this task.
- 6C user-visible cancellation deadline is 1 hour earlier than the merchant
  deadline.
- Placement matching uses existing PR data, especially PR `type` values such
  as "烹饪搭子", "网约车搭子", "羽毛球搭子", and "自习搭子". Do not introduce
  ecommerce-purpose category fields into PR Context.
- Placement should distinguish `slotKey` from `PlacementInstance`; `slotKey`
  identifies the render container, while the instance is the configured record
  selected into that slot.
- Placement matching is not surface-based. The PR Page currently embeds one
  Button Placement row in Utility Actions, but Placement itself is not PR-bound.
- PR active participants can see PR-attached orders and PR-context placements.
  Non-active participants should receive no PR-context placement projection;
  this access gate is not a Placement Matching Rule.
- `TradeProposal` is internal language. User-facing surfaces should keep users
  inside "订单" language and avoid exposing a separate proposal abstraction.
- Implementation domain grouping should be Merchandising, Trade, Fulfillment,
  Bill, and Payment.
- Frontend/application direction now prefers `Ordering Detail` over
  `Offer Detail` as the durable pre-create page concept.
- Current preferred dependency direction is:
  `Placement` provides the ordering entry plus bindings, then backend resolves
  one current Ordering read model by traversing `Placement -> Offer ->
  Product`. No separate
  standalone Ordering Assembler owner, persisted Offer-owned ordering-schema
  object, or `Offer*ContractSlice` middle object is preferred for the current
  scope.
- The phrase `Derived ordering definition` should also not become a named
  middle object. If retained at all, it only means the field-definition
  fragment already embedded in the query-time Ordering page payload.
- `OrderingAvailability` and price preview are Ordering-owned computed state
  derived from current order input, not sibling boundaries next to Ordering.
- The current preferred Ordering-side transport shape is:
  route/use-case-specific existing-owner refs/id only + current Ordering read
  model + `OrderingEvaluation`, with initial/default/locked input state living
  inside the current Ordering read model. Keep it narrow, decouple the public
  Ordering contract from Offer, and do not invent a generic `sellable` layer.
- Entry route/use-case concerns are outside the Ordering model itself. The
  page-entry input must not assume a specific predecessor such as Placement or
  Offer.
- Ordering is not persisted and has no `orderingId`; do not introduce
  `resolveRef`, `orderingRef`, or any other generic Ordering locator.
- Create-order command shape belongs to Trade / Order rather than Ordering.
- Ordering input should be defined by reading backward from Trade's
  `CreateOrderCommand`: frontend owns only selected ids, quantities, and
  editable request values; backend remains authoritative for all display truth,
  policy truth, pricing truth, and locked context values.
- Phase 3 starts with Rental browser system scenario and Rental baseline UI.
  Browser-visible fake payment and fake Rental booking confirmation are
  acceptable until real Payment and fuller Rental Fulfillment operations are
  implemented. Full RideHailing chain and RideHailing browser scenario
  completion are deferred to the RideHailing phase.
- Trade's `CreateOrderCommand` may still carry `offer_id` as contract-source
  reference without making the Ordering read contract Offer-coupled.
- Offer-to-Ordering conversion should happen on the backend before entering the
  Ordering page. Ordering Detail should consume resolved Ordering data instead
  of running `Offer -> Ordering` adaptation logic inside the page.
- If Placement binds a field from PR context, that field is locked by
  invariant. This should be expressed by Placement-owned binding metadata, not
  by page-level hard-coded component logic.
