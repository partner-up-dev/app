# TDD Map

## Direction

Use Technical Design Document first.

In this packet, TDD means Technical Design Document, not Test-Driven
Development. The system scenario descriptions are the acceptance spine for the
design. Executable tests should be written after the product and technical
contracts are stable enough.

This issue is not implemented by choosing one commercial loop as a product
increment and then growing opportunistically. It is implemented by:

1. mapping commercial demands,
2. deriving required capabilities,
3. assigning domain ownership,
4. drawing topology and state-transition sequences,
5. designing one black-box system scenario per commercial loop,
6. later filling the necessary domain/use-case/repository/UI tests.

## Test Layer Contract

Use the repo's existing Vitest project layers:

- Backend unit: `apps/backend/src/**/*.test.ts`
- Frontend unit: `apps/frontend/src/**/*.test.ts`
- Backend scenario: `apps/backend/tests/**/*.scenario.test.ts`
- System scenario: `tests/scenario/**/*.scenario.test.ts`

System scenarios are the acceptance spine. They should use real browser
interactions and user-visible assertions only. Do not use API response probes,
database probes, or repository probes as assertions in these system scenarios.
Unit and backend scenario tests remain supporting proof for the domain
decisions that the system scenarios require.

## Commercial Loops

### Admin Merchandising CRUD

Business demand:

- Admin can create and update SPU/SKU records.
- Admin can create and update Offers.
- Admin can create and update typed Placement Instances.
- First implemented Placement type is `BUTTON`.
- Admin can configure Button Placement creative payload, target offer, and
  matching rule.
- Admin can configure SKU base cancellation policy where needed.

System scenario candidate:

- `tests/scenario/admin/admin-merchandising-crud.scenario.test.ts`
- scenario name: `admin_merchandising_crud_loop`

### 6C Time Slot Resource Reservation

Business demand:

- Eligible cooking PR reaches READY participant-stable state.
- PR detail shows a 6C cooking-school Button Placement inside Utility Actions.
- User enters an independent Offer route.
- Offer Detail assembles Rental Ordering from the Offer SPU list, using SPU
  SKU-selection and quantity policies.
- Rental Ordering collects selected zone, time, participant count, contact, and
  real-name data.
- Create-order CTA is enabled only when PR is READY and the current user is the
  PR creator.
- RentalOrder is created and billed through WeChat Pay APIv3.
- Frontend polling and backend WeChat callback jointly drive payment state.
- Platform operator contacts 6C and records reservation success/failure.
- Success displays entry instructions based on phone/real-name information.
- Overtime charge is paid onsite to 6C and stays outside platform billing.

System scenario candidate:

- `tests/scenario/time-slot-reservation/6c-time-slot-resource-reservation.scenario.test.ts`
- scenario name: `time_slot_resource_reservation_loop`

### Ride Hailing Quote, Completion, And Final Billing

Business demand:

- PR detail or route-aware context shows a ride-hailing Button Placement inside
  Utility Actions.
- Default placement matching: PR `type` equals or matches "网约车搭子" is
  primary.
  Other location-bound categories such as "烹饪搭子", "羽毛球搭子", and "自习搭子"
  can match a ride-hailing placement when the PR has a concrete time
  and meeting/destination context.
- Offer Detail assembles Ride Hailing Ordering from the Offer SPU list, using
  SPU SKU-selection and quantity policies.
- Ride Hailing Ordering starts quote/estimate flow rather than fixed-price
  order.
- Create-order CTA is enabled only when PR is READY and the current user is the
  PR creator.
- RideHailingOrder snapshots quote and applied pricing-rule explanations.
- RideHailing Fulfillment owns the minimum execution truth required for
  usage-based final settlement.
- After trip finish, final settlement input is committed, final pricing is
  resolved from the frozen contract, and the Bill is created from that result.
- Full dispatch/monitoring UX and provider settlement accounting are not
  implemented in this task.

System scenario candidate:

- `tests/scenario/ride-hailing/ride-hailing-quote-order.scenario.test.ts`
- scenario name: `ride_hailing_quote_order_loop`

## Current Code Entry Points

Backend:

- `apps/backend/src/controllers/partner-request.controller.ts` owns
  `GET /api/pr/:id`.
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts` builds the PR
  detail projection.
- PR detail is a good integration seam for Placement visibility, but Placement
  ownership should stay outside PR Core.
- `apps/backend/src/domains/pr-core/services/*` shows the local style for pure
  domain services and unit tests.
- `apps/backend/tests/pr-core/*` shows backend scenario builders, actions,
  probes, and assertions.

Frontend:

- `apps/frontend/src/pages/PRPage.vue` owns PR detail route assembly.
- The `/pr/:id` utility area is already split into peer components.
- This task implements `BUTTON` Placement inside the existing Utility Actions
  region. The earlier below-Utility-Actions placement card is out of scope for
  now.
- Route families introduced by this issue should be independent:
  `/products/*`, `/offers/*`, and `/orders/*`. Placement has an independent
  API/admin route family, but Button Placement does not require a user-facing
  `/placements/:placementId` page in this task. Bill may be a standalone route
  or an order section pending final route detail. User-facing coordination
  should stay under order language. Do not introduce a user-facing
  `/proposals/*` route in this task. Any future admin/internal proposal surface
  must be separately scoped. `/entitlements/*` is out of scope for issue 231.

## Supporting Test Candidates

### Product Catalog

Path candidate:
`apps/backend/src/domains/merchandising/product-catalog.test.ts`

Cases:

- Admin can create and update SPU/SKU, Offer, and Placement Instance
  records through Admin CRUD.
- Admin can configure a `BUTTON` Placement Instance that renders inside PR Page
  Utility Actions.
- SKU belongs to exactly one SPU.
- SPU supports product families needed by time-slot resource and quote-based
  services.
- SPU owns ordering/order/fulfillment contract, SKU-selection policy, quantity
  policy, and product-native pricing policy.
- One SPU cannot contain mixed product-type SKUs.
- SKU facts and SKU base pricing models validate at the boundary.

### Offer

Path candidate:
`apps/backend/src/domains/merchandising/offer-snapshot.test.ts`

Cases:

- Offer snapshots its SPU list and commercial overlay pricing-rule array.
- Offer uses SPU sales policy instead of modeling a separate line abstraction.
- SPU pricing rules are evaluated before Offer overlay rules.
- Pricing rules are evaluated by their array order inside each policy.
- Pricing rules target SKU, SPU, or Order data.
- Pricing conditions are JsonLogic-compatible JSON evaluated against the target
  data only.
- Pricing actions support `reset`, `minus`, and `ratio` payloads.
  `reset` replaces the current pricing model; `minus` subtracts a positive
  integer-fen amount; `ratio` adjusts the resolved amount by basis points.
- A matched rule records its `label` and `description` as user-facing price
  explanation.
- A matched rule's `continue` flag controls whether later rules are attempted
  against the updated pricing state for the same target.
- All money values in pricing rules and resolved prices are integer fen.
- SPU/Offer pricing can represent 6C rental zone + participant-count SKU base pricing
  models and ride-hailing dynamic quote plus ratio adjustments with the same
  rule array.
- Pricing conditions use SKU/SPU/Order target data, not PR Context. For
  ride hailing, tests should cover vehicle SKU, Guangzhou route, and campaign
  time window conditions.
- Offer/order creation snapshots SKU base cancellation policy for later
  order/refund use; Offer cancellation overlay is out of scope for issue 231.
- Offer has no marketing copy/media; Placement creative owns campaign content.
- One Offer may contain multiple SPUs, and different SPU families may require
  different Ordering surfaces.
- Frozen offer terms used by internal order coordination or order creation do
  not drift when the source offer later changes.

### Placement

Path candidate:
`apps/backend/src/domains/merchandising/placement-selection.test.ts`

Cases:

- Placement selection consumes PR context but is not PR-owned.
- PR context is plain rule-engine input data, not a PR domain model.
- Placement Matching Rule is persisted JSON evaluated by the rule engine and
  returns display / do-not-display.
- PR active participant access is checked before matching; non-active
  participants receive no PR-context placement projection.
- "烹饪搭子" receives a 6C Rental Button Placement by default when the PR
  context matches.
- "网约车搭子" receives a ride-hailing placement by default.
- "烹饪搭子", "羽毛球搭子", and "自习搭子" can match a ride-hailing placement
  when concrete time and meeting/destination context exist.
- Non-matching PR receives no placement.
- Placement type is backend-authored. This task implements only `BUTTON`.
- Placement creative is type-specific; Button Placement uses a button creative
  payload, while future Banner Placement would use a different payload.
- Button Placement target is backend-authored:
  `{ kind: "OFFER", offerId } | { kind: "ORDER", orderId } | ...`.
- Existing order target resolution uses `(offerId, prId)`: active
  participants see `ORDER` target when the PR already has an attached order for
  the offer; otherwise they see `OFFER` target.
- 6C placement matching is explicit: PR `type` equals or matches "烹饪搭子" or
  configured food/cooking text, active participant count within the supported
  SKU participant-count range, concrete activity time, at least one-day advance booking, and a
  3-hour slot inside the 10:00-22:30 service window. Inventory/capacity checks
  are out of scope for this task.
- Rule-engine adapter tests should cover supported JsonLogic operators and
  reject unsupported or non-boolean-result rules at admin-save time.

### Order Families

Path candidates:

- `apps/backend/src/domains/trade/rental-order-lifecycle.test.ts`
- `apps/backend/src/domains/trade/ride-hailing-order-lifecycle.test.ts`

Cases:

- RentalOrder captures required reservation attributes.
- RideHailingOrder stores quote/estimate separately from final settlement.
- Default unpaid order timeout is 30 minutes.
- Current PR active participants initialize the Order participant set at
  creation time.
- PR-context order creation and PR attachment happen in one transaction; if PR
  domain rejects attachment because the PR is not READY or because
  `order.created_by != pr.created_by`, the order creation fails atomically.
- Order cancellation snapshots SKU base cancellation policy and computes refund
  obligations from the snapshot.

### Bill And Payment

Path candidates:

- `apps/backend/src/domains/bill/bill-line.test.ts`
- `apps/backend/src/domains/payment/payment-tx.test.ts`

Cases:

- One Bill creates N BillLines from charge/refund seeds.
- One BillLine can be settled by M PaymentTx records.
- Bill settlement status is derived from lines, not from one payment row.
- PaymentTx failure does not mutate frozen bill obligations.
- PaymentTx targets exactly one BillLine and does not support the creator
  paying for other participants in issue 231.
- WeChat Pay APIv3 query result or verified callback can advance a pending
  PaymentTx to paid. Both paths are first-class state transitions and must be
  idempotent.

### Fulfillment

Path candidates:

- `apps/backend/src/domains/fulfillment/rental-fulfillment.test.ts`
- `apps/backend/src/domains/fulfillment/ride-hailing-fulfillment.test.ts`

Cases:

- Rental Fulfillment can succeed or fail and stores 6C entry/result
  information on success.
- Rental Fulfillment currently uses manual operator work to contact 6C; that is
  an implementation mode, not a separate Operator Fulfillment domain.
- Rental Fulfillment should expose an operator-facing execution surface rather
  than being hidden inside Merchandising Admin configuration.
- RideHailing Fulfillment stores the minimum execution truth needed for
  usage-based final settlement, even though full dispatch/monitoring UX remains out
  of scope.

Ride-hailing full provider dispatch/monitoring UX still has no test candidate
in this issue, but fulfillment-side trip completion and final-bill commitment
do.

Restaurant group-buy coupon demand and its supporting functionality have no
scenario or implementation slice in this issue. Voucher Entitlement,
entitlement redemption, QR redemption, GoodsOrder, and `/entitlements/*` are
out of scope.

### Frontend Unit

Path candidates:

- `apps/frontend/src/domains/merchandising/ui/sections/PRPlacements.test.ts`
- `apps/frontend/src/pages/PRPage.placement.test.ts`

Cases:

- PR Utility Actions renders one backend-authored Button Placement when a
  matching placement instance exists.
- Placement click routes to independent Offer route when target kind is
  `OFFER`.
- Placement click routes to independent Order route when target kind is
  `ORDER`.
- Empty placement list renders nothing and does not affect existing utility
  actions.
- PRPage keeps Button Placement composition inside Utility Actions while
  selection and target authority stay in Merchandising.

## Deliberate Non-Goals For First System Scenarios

- Non-WeChat payment gateways.
- Restaurant group-buy coupon commercial loop.
- Voucher Entitlement, entitlement redemption, QR redemption, and GoodsOrder.
- Full ride-hailing dispatch/monitoring UX and provider settlement accounting.
- Full admin merchandising UI polish.
- After-sales beyond reserving domain boundaries.
