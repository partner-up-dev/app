# Implementation Plan

Date: 2026-05-31

## Purpose

Define a reviewable implementation sequence for Phase 5 Ride Hailing. This plan
does not start implementation by itself.

## Slice 0: Final Handshake And Test Fixture Shape

Goal:

- Lock remaining high-level decisions that affect schema and UI surface.

Work:

- Confirm Caocao `ext_order_id` accepted character set and compressed UUID
  alphabet.
- Confirm parent route/page composition around RideHailing Ordering Content.
- Confirm first-cut waypoint behavior:
  - display existing waypoints only; or
  - allow waypoint editing in `RouteEditorOnMap`.
- Confirm fake Caocao HTTP server package shape for scenario tests.

Exit criteria:

- `10-caocao-provider.md`, `40-ordering-content-ia.md`, and
  `50-verification-plan.md` no longer contain blocking open questions for the
  first implementation slice.

Status on 2026-05-31:

- Sufficient for Slice 1. The remaining open handshake items are
  RideHailing/Caocao-specific and do not block the required Rental typed-order
  refactor.

## Slice 1: Base And Typed Rental Order Refactor

Goal:

- Make base Order clean before adding RideHailing order persistence.

Work:

- Add `rental_orders` entity, migration, repository, and typed model keyed by
  base order id.
- Backfill existing Rental-specific fields from `trade_orders` into
  `rental_orders`.
- Update Rental create-order flow to write base `trade_orders` and typed
  `rental_orders` in one transaction.
- Update Rental read models/use cases to compose from base + typed records.
- Move Rental order detail, cancellation, admin order/bill workspace, and
  fulfillment integration reads off base Rental-specific columns.
- Stop using or drop base `trade_orders` Rental-specific columns once all reads
  and writes have moved.
- Keep user-visible Rental behavior unchanged.

Exit criteria:

- Base `trade_orders` no longer owns Rental-specific facts.
- Rental create/read/cancel/bill/fulfillment paths pass existing tests.
- Rental scenario tests pass.
- A focused persistence test proves base + typed Rental writes are atomic.

Status on 2026-05-31:

- Implemented with migration `apps/backend/drizzle/0073_rental_typed_order.sql`.
- Verification evidence is recorded in `15-base-typed-order-refactor.md`.

## Slice 2: Backend Provider Instance Foundation

Goal:

- Add durable Caocao provider configuration and provider adapter boundary.

Work:

- Add `ride_hailing_provider_instances` entity, migration, repository, and typed
  model.
- Add config-driven registration command/script similar to Payment provider
  registration.
- Add `RideHailingProviderPort`.
- Add `RideHailingProviderRegistry`.
- Add `CaocaoProviderAdapter` with:
  - signing;
  - callback verification;
  - compressed UUID external id conversion;
  - request serialization helpers;
  - response/error parsing.
- Add provider-instance-specific callback route skeleton:
  `/api/ride-hailing/caocao/:providerInstanceId/callback/order-status`.

Exit criteria:

- Backend unit tests cover provider config validation, signer, callback verifier,
  and external id conversion.
- No ride order creation yet.

Status on 2026-05-31:

- Implemented with migration
  `apps/backend/drizzle/0074_ride_hailing_provider_instances.sql`.
- Verification evidence is recorded in
  `25-provider-instance-foundation.md` and `50-verification-plan.md`.

## Slice 3: RideHailing Order And Fulfillment Persistence

Goal:

- Add the durable local state needed before provider-backed order creation,
  following the base + typed order pattern established by Slice 1.

Work:

- Add `OrderStatus.INITIATING`.
- Do not extend base `TradeOrder` with RideHailing-specific facts.
- Add `ride_hailing_orders` entity/model keyed by base order id:
  route, departure time, rider/contact facts, selected vehicle SKU, quote
  snapshot, order-facing ride execution state, final settlement input, and final
  pricing references as needed.
- Keep base `trade_orders` limited to cross-family contract state.
- Add `ride_hailing_fulfillments` entity, migration, repository, and use-case
  shell.
- Keep Fulfillment provider-side:
  provider instance id, external order id, provider order no, dispatch state,
  cancellation side-effect result, fee-confirm side-effect result.
- Avoid duplicating order-facing driver assignment or execution projections in
  Fulfillment.

Exit criteria:

- Backend unit tests cover `INITIATING` transitions and the base order + typed
  RideHailingOrder + Fulfillment persistence shape.
- Existing Rental tests still pass after Slice 1 migration.

## Slice 4: RideHailing Ordering Backend Read/Evaluate

Goal:

- Let the frontend obtain RideHailing Ordering truth and provider-backed quotes.

Work:

- Extend placement/order target resolution so ride-hailing placements route to
  RideHailing Ordering when no active PR-attached order exists.
- Add RideHailing Ordering read use case:
  route field metadata, editable/locked state, rider/contact defaults, vehicle
  SKU options, and provider availability.
- Add RideHailing quote/evaluate use case:
  call Caocao estimate through `RideHailingProviderPort`;
  normalize vehicle quote options;
  return quote expiry state.
- Ensure backend revalidates upstream Offer/SPU/SKU/Placement truth and does not
  trust frontend-submitted pricing truth.

Exit criteria:

- Backend tests cover placement -> ride ordering read, quote evaluation, quote
  expiry, and disabled reasons.
- No provider order creation yet.

## Slice 5: RideHailing Ordering Content Frontend

Goal:

- Implement the user-visible RideHailing Ordering Content component.

Work:

- Add `RouteEditorOnMap`:
  - map route points;
  - driving planned route;
  - point callouts;
  - chevron edit affordance;
  - disabled editing support.
- Add RideHailing Ordering Content:
  - route editor map;
  - time / `同乘人` / `联系方式` row;
  - `BottomDrawer(DatetimePicker)`;
  - `BottomDrawer(List(UserBriefRow))`;
  - `BottomDrawer(PhoneEditor)`;
  - vehicle quote cards.
- Add frontend queries/mutations for RideHailing ordering read/evaluate.
- Keep page-level CTA, price detail, PR source/header, and eligibility outside
  the Ordering Content component.

Exit criteria:

- Frontend unit/component tests cover the content component affordances.
- Browser check verifies map/callout layout does not overlap or break on mobile
  and desktop.

## Slice 6: Provider-Backed Create Ride Order

Goal:

- Create a local RideHailingOrder and provider Caocao order without exposing a
  false `OPEN` state on provider failure.

Work:

- Add RideHailing create-order application service:
  - re-read upstream truth;
  - revalidate PR READY / creator through PR attachment authority;
  - create base `TradeOrder(INITIATING)`;
  - create typed `RideHailingOrder`;
  - attach PR offer slot;
  - create `RideHailingFulfillment(INITIATING)`;
  - call Caocao `orderCarV2`;
  - promote to `OPEN` only after provider execution ref exists.
- Handle provider hard failure:
  - fulfillment dispatch state -> `FAILED`;
  - order -> `FAILED`;
  - detach PR attachment;
  - no Bill.
- Handle provider timeout/unknown:
  - keep order `INITIATING`;
  - expose reconciliation-safe state.

Exit criteria:

- Backend tests cover success, hard failure, timeout/unknown, duplicate active
  order prevention, and retry after failed/detached creation.
- Frontend can navigate to Order Detail only after successful create/call.

## Slice 7: Provider Callback, Detail Query, And Ride State Application

Goal:

- Apply provider execution progress without turning callbacks into unverified
  order truth.

Work:

- Complete provider-instance callback route.
- Parse/verify Caocao callbacks through the instance-specific adapter.
- Treat callback as a trigger:
  query provider detail before order-facing terminal/billing mutations.
- Map provider statuses into RideHailingOrder execution state and
  Fulfillment provider binding/dispatch state.
- Make transitions idempotent without a first-cut provider-event table.

Exit criteria:

- Backend unit tests cover valid callback, invalid signature, duplicate
  callback, out-of-order callback, and detail-query-driven mutation.

## Slice 8: Cancellation And Abort Fee

Goal:

- Support pre-trip provider-authoritative cancellation.

Work:

- Add RideHailing cancellation use case in Trade/Order.
- If no provider execution exists, cancel locally.
- If provider execution exists but actual trip usage has not started, ask
  Fulfillment/provider for cancel or cancel-fee result.
- Map provider result to termination attempt:
  no fee, fee, denied.
- Emit abort-fee Bill seed only after provider-approved fee result.
- Deny ordinary cancellation once actual usage starts.

Exit criteria:

- Backend tests cover local void, approved no fee, approved with fee, denied,
  and in-trip cancellation denial.

## Slice 9: Final Settlement, Bill, Payment, Fee Confirm

Goal:

- Complete usage-based postpaid billing.

Work:

- On trip finished / unpaid provider state, query provider detail.
- Commit final settlement input to the RideHailingOrder-facing execution truth.
- Resolve final pricing from frozen quote/order contract.
- Create final Bill only after final pricing resolution.
- Reuse existing Bill Detail and Payment Checkout.
- After relevant local Payment settlement, call Caocao `feeConfirm` through
  Fulfillment/provider port.

Exit criteria:

- Backend tests cover final settlement -> Bill -> Payment consequence ->
  feeConfirm.
- Existing Rental prepaid billing remains unchanged.

## Slice 10: Scenario Tests And Fake Caocao Server

Goal:

- Prove the full user-visible and provider-boundary loop.

Work:

- Add fake Caocao HTTP server/package or scenario fixture according to Slice 0.
- Register a normal `CAOCAO_OPEN_API` provider instance pointing at the fake.
- Scenario path:
  - PR placement;
  - RideHailing Ordering Content;
  - quote;
  - create/call;
  - provider callback/detail;
  - final settlement;
  - Bill Detail;
  - Payment Checkout;
  - feeConfirm.
- Add failure-path scenario for provider create failure and retry if feasible.

Exit criteria:

- Targeted ride-hailing scenario passes through real frontend, backend HTTP,
  provider adapter, fake provider HTTP boundary, isolated database, Bill, and
  Payment.

## Slice 11: Guardrail Sweep And Documentation Promotion

Goal:

- Stabilize the implementation and promote durable truths.

Work:

- Run targeted and broad guardrails:
  - `pnpm lint:backend`;
  - `pnpm test:unit:backend`;
  - `pnpm test:unit:frontend`;
  - targeted ride-hailing scenario;
  - broader scenario suite if time allows.
- Update durable docs only for verified stable truths:
  - Product TDD;
  - deployment/config docs for Caocao provider registration;
  - task packet final verification notes.

Exit criteria:

- Phase 5 has explicit verification evidence and no known unbounded side
  effects.
