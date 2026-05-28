# Execution Plan

## Preconditions

- Do not start production implementation until the user explicitly says to
  start.
- Treat this packet as the working design source until stable truths are
  promoted into `docs/20-product-tdd/*`.
- Keep route families independent from `/pr/:id/*`.
- Keep implementation domains grouped as Merchandising, Trade, Fulfillment,
  Bill, and Payment.
- Implement Admin CRUD for merchandising. Do not rely only on seeded
  merchandising records.
- Implement only Button Placement in this task, rendered inside PR Page Utility
  Actions.
- Placement owns campaign creative; Product Catalog owns SPU/SKU sales and
  pricing policy; Offer owns the SPU list and campaign/commercial overlay
  policy, not marketing copy/media.

## Remaining Design Decisions

These do not block the architecture, but they should be resolved before coding
the corresponding slice:

- Route parameter names for products, placements, offers, orders, and
  bills/order sections. Confirm whether Placement needs any user-facing detail
  route; current recommendation is API/admin only for Button Placement.
  `/entitlements/*` is out of scope for issue 231.
- Placement read endpoint shape, currently recommended as
  `GET /api/placements?context=pr&contextId=:prId&type=BUTTON`.
- Visible copy for SKU base cancellation policy.
- Exact route/API/read-model contract for operator-facing fulfillment pages.
- Basic frontend user journeys before frontend-heavy work starts.
- Exact ride-hailing provider integration cut and live-tracking API shape.

## Phase 0: Promote Stable Design

Goal: move stable contracts from task packet into durable Product TDD docs.

Work:

- Promote domain grouping and ownership.
- Promote route-family topology.
- Promote Placement type topology and Button Placement UI contract.
- Promote PR-domain READY order-attachment guard and transactional rollback
  semantics.
- Promote payment state machine: frontend polling and backend callback jointly
  drive payment state.
- Promote browser black-box system scenario rules.
- Promote explicit non-goals: restaurant group-buy coupon commercial loop,
  below-Utility-Actions placement card, merchant settlement/deposit,
  inventory/capacity, full ride-hailing dispatch/monitoring UX, and provider
  settlement accounting.

Verification:

- Review docs for route/domain consistency.
- No production code changes.

## Phase 1: Backend Domain Foundation

Goal: implement backend foundation for the Rental slice across entities,
repositories, migrations, and internal use cases, while deliberately deferring
controller/API surface work, payment integration, and ride-hailing work.

Work:

- Rental-capable Merchandising persistence and create use cases for Product,
  SKU, SKU cancellation policy, Offer, and Placement.
- Trade persistence and transactional Rental order creation with the PR READY
  attach invariant.
- Bill persistence and immediate bill creation from Rental order creation.
- Rental Fulfillment persistence and basic operator-facing use cases such as
  booking confirmation/rejection and entry-guidance recording.
- Internal application services and ports needed by later admin surfaces.
- Add HTTP controllers only when a frontend or operator surface actually needs
  them; do not front-load broad route creation.

Verification:

- Backend unit tests for touched domains.
- `db:lint` after schema migration changes.
- Backend scenario tests for cross-domain invariants such as PR attach
  rollback can follow after the Rental foundation lands.

## Phase 2: Admin CRUD And Rental Fulfillment Ops

Goal: ship admin/operator surfaces after the backend skeleton exists.

Work:

- Current phase should not build `Payment Admin` yet.
- Concrete admin views should be grouped as:
  - `Product`
  - `Placement+Offer`
  - `Order+Bill`
  - `Fulfillment`
- Product admin CRUD.
- Placement+Offer admin CRUD.
- Order+Bill admin read/action surfaces where needed.
- Rental Fulfillment operations page/queue.
- Use fine-grained APIs.
- Prefer single-column card layout by default; avoid two-column forms unless
  there is a strong need.

Verification:

- Admin browser scenario for merchandising CRUD.
- Supporting unit tests for admin-facing write/read contracts as needed.

## Phase 3: Baseline Frontend UI

Goal: ship all user-facing frontend that the existing backend can already
support, but only after user journeys are roughly confirmed.

Work:

- Start Phase 3 by writing the Rental and RideHailing browser system scenario
  tests first.
- During this first scenario-writing step, use simple fulfillment/payment test
  doubles where the real implementation is intentionally deferred.
- Button Placement inside PR Utility Actions.
- Offer detail pages and ordering pages.
- Rental and ride-hailing order detail foundations.
- Add controllers/APIs on demand from concrete frontend needs instead of
  pre-building broad route surfaces.

Verification:

- Rental and RideHailing browser system scenarios should exist before the
  corresponding UI implementation is considered complete.
- Frontend unit tests for the shipped UI surfaces.
- Browser scenario progress on non-payment/non-provider parts.

## Phase 4: Payment

Goal: integrate WeChat Pay APIv3 after the payable user flows and bill
foundation are already visible.

Work:

- PaymentTx model completion and WeChat Pay adapter.
- Callback and polling state authority.
- Idempotent callback/query handling.
- User-facing payment result flow.

Verification:

- Payment unit tests.
- Backend scenario for repeated callback/query handling.
- Browser scenario completion for the rental prepaid loop.

## Phase 5: Ride Hailing

Goal: finish the ride-hailing-specific provider-backed flow after the broader
commerce backbone is already in place.

Work:

- Ride-hailing provider integration cut.
- Ride live-tracking API passthrough or short-TTL strategy.
- Final-settlement-input commit and post-usage billing flow.
- Ride-hailing cancellation/abort consequence flow.

Verification:

- Ride-hailing unit tests and backend scenario tests.
- Browser scenario completion for the ride-hailing loop.

## Phase 6: Scenario Completion And Hardening

Goal: close the loop with scenario completion and operational hardening after
the main vertical slices exist.

Work:

- Complete and stabilize the three browser black-box system scenarios.
- Add audit/event records for payment, cancellation, Rental Fulfillment result,
  and manual operation actions.
- Do admin polish, audit views, and operational enhancements beyond the
  required CRUD/ops baseline.

Verification:

- Run the three browser black-box system scenarios.
- Regression run for all three system scenarios.
