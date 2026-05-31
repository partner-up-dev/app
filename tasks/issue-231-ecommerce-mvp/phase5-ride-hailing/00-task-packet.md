# Phase 5 Ride Hailing Packet

Date: 2026-05-31

## Purpose

This packet tracks Phase 5 of issue 231: provider-backed Ride Hailing from
Ordering to Fulfillment, with Caocao as the only current ride-hailing provider.

This file is intentionally an index and decision summary. Detailed exploration
must live in focused sibling files rather than continuing as a monofile.

## Packet Map

- `10-caocao-provider.md`
  - Caocao API evidence, config storage, external id, callback routing, and
    provider adapter boundary.
- `15-base-typed-order-refactor.md`
  - Required pre-refactor that migrates Rental-specific fields out of base
    `trade_orders` before RideHailing order persistence is added.
- `20-ordering-order-topology.md`
  - Placement/Ordering/Order flow, `INITIATING` order state, provider-call
    failure topology, and PR attachment behavior.
- `25-provider-instance-foundation.md`
  - Slice 2 durable provider instance, Caocao adapter, registration, and
    callback route foundation.
- `30-fulfillment-provider-topology.md`
  - RideHailingFulfillment provider collaboration topology and SSoT boundary.
- `35-order-fulfillment-foundation.md`
  - Slice 3 local RideHailing order and provider-binding fulfillment
    persistence implementation.
- `40-ordering-content-ia.md`
  - RideHailing Ordering Content information architecture.
- `45-order-detail-content-ia.md`
  - RideHailing Order Detail map-first live fulfillment content IA.
- `50-verification-plan.md`
  - Unit, scenario, and guardrail verification plan.
- `55-system-scenario-test-plan.md`
  - Full RideHailing system scenario acceptance boundary, fake Caocao fixture,
    product/SKU setup, UI path, and stable test id contract.
- `60-implementation-plan.md`
  - Ordered implementation slices and their exit criteria.
- `65-admin-provider-instance.md`
  - RideHailing Admin surface for configuring provider instances.
- `90-discussion-log.md`
  - Chronological discussion log and decision history.

## Objective & Hypothesis

Implement the issue 231 Ride Hailing slice from Ordering to Fulfillment with
Caocao as the only current ride provider.

Hypothesis:

- Ride Hailing should remain inside the existing Commerce topology:
  Placement -> Ordering Content / Order creation -> RideHailingOrder ->
  RideHailingFulfillment -> final Bill -> Payment.
- A provider adapter boundary is necessary even with only `caocao`, because
  signing, callback verification, external id conversion, status mapping,
  cancellation fee, tracking, and fee confirmation are provider-specific side
  effects.
- The MVP should be provider-backed, but not a full dispatch/monitoring product.
  The in-scope fulfillment truth is the minimum needed to create the final
  usage-based Bill and support pre-trip provider abort outcomes.

## Guardrails Touched

- `tasks/issue-231-ecommerce-mvp/00-task-packet.md`
- `tasks/issue-231-ecommerce-mvp/10-tdd-map.md`
- `tasks/issue-231-ecommerce-mvp/20-implementation-slices.md`
- `tasks/issue-231-ecommerce-mvp/46-trade-order-model.md`
- `tasks/issue-231-ecommerce-mvp/47-bill-model.md`
- `tasks/issue-231-ecommerce-mvp/48-fulfillment-model.md`
- `tasks/issue-231-ecommerce-mvp/49-order-cancellation-sequences.md`
- `tasks/issue-231-ecommerce-mvp/50-system-scenarios.md`
- `tasks/issue-231-ecommerce-mvp/52-basic-frontend-user-journeys.md`
- `docs/20-product-tdd/ecommerce-contracts.md`

## Current Decisions

- Provider instance storage uses a dedicated
  `ride_hailing_provider_instances` table with typed `config` JSON, not
  environment variables and not public config.
- Caocao callback URLs route to a concrete provider instance, similar to
  Payment callbacks.
- Caocao `ext_order_id` is generated inside `CaocaoProviderAdapter` as
  `rh` + compressed UUID encoding.
- Add generic `OrderStatus.INITIATING`.
- Order persistence should use base order + family typed order shape. Do not add
  RideHailing-specific facts directly onto base `TradeOrder`.
- Migrating existing Rental-specific fields out of base `trade_orders` is a
  mandatory RideHailing prerequisite, not optional technical debt.
- Specialized RideHailingOrder creation creates a provider-binding
  RideHailingFulfillment foundation; this is not base Order behavior. The
  initiating state is represented by base `TradeOrder.status = INITIATING` and
  typed RideHailingOrder provider-creation state, not by fulfillment owning
  dispatch state.
- Do not introduce separate provider-order-attempt or provider-event-inbox
  tables in the first cut unless a non-audit need is proven.
- RideHailing Fulfillment must not duplicate long-lived driver assignment,
  execution projection, dispatch state, or provider side-effect results in a way
  that creates SSoT drift.
- Future order-facing execution/cancellation/settlement facts must be added to
  the typed RideHailing order only in the slice that first writes and verifies
  that sequence; Slice 3 must not pre-create them.
- Base TradeOrder owns only generic commercial contract snapshots, such as item
  snapshot and pricing snapshot. It does not own raw Caocao estimate semantics.
- Product/PricingApplication owns RideHailing quote interpretation. It may
  depend on RideHailing Fulfillment/provider to obtain live provider estimates,
  but the raw estimate response is not an order fact and is not persisted in the
  first cut.
- RideHailing SKU carries ride-hailing-specific facts such as
  `rideHailingProviderInstanceId`; the SKU facts JSON must not duplicate SKU or
  product type. Provider estimate must use the provider instance declared by the
  SKU. Fulfillment/provider boundary validates and resolves that instance, it
  does not choose a default provider instance by itself.
- Phase 5 acceptance is a RideHailing system scenario test passing through the
  real frontend. The scenario must operate the UI and assert rendered content,
  not directly drive or assert backend APIs for the acceptance path.
- RideHailing Ordering Content excludes Context Header, PR source/back link,
  READY/creator eligibility, Price Detail footer, Bottom Action Bar, and create
  CTA.
- RideHailing Order Detail is a map-first live fulfillment surface, not a
  Rental-style generic detail card stack.
- RideHailing Order Detail links to Bill/Payment surfaces but does not embed
  Payment Checkout inside the order detail content.

## Current Implementation Status

- Slice 0 is sufficient for the Rental typed-order prerequisite; remaining
  handshake items are RideHailing/Caocao-specific and deferred to the slices
  that first need them.
- Slice 1 is implemented: Rental-specific order facts have moved from base
  `trade_orders` into typed `rental_orders`, with migration SQL and targeted
  verification recorded in `15-base-typed-order-refactor.md`.
- Slice 2 is implemented: durable Caocao provider instance storage, adapter,
  registration script, provider registry, and callback route skeleton are in
  place. Verification is recorded in `25-provider-instance-foundation.md`.
- Slice 3 is implemented: local RideHailing base order + typed order +
  provider-binding fulfillment persistence is in place. Verification is
  recorded in `35-order-fulfillment-foundation.md`.
- RideHailing end-to-end system scenario is implemented and passing for the
  provider-backed happy path and provider-create-failure retry path. The
  implemented path covers PR placement, RideHailing Ordering UI, SKU/provider
  quote evaluation, provider-backed order creation, RideHailing Order Detail,
  provider detail progression, final Bill, Payment Checkout, and Caocao
  `feeConfirm`.
- RideHailing SKU facts now carry `rideHailingProviderInstanceId` and
  `providerVehicleTypeCode` without duplicating product/SKU type in facts.
- RideHailing Provider Instance needs a dedicated admin surface at
  `/admin/ride-hailing`; it is implemented with sanitized provider config
  responses and blank-sign-key preservation on update. In the current cut, SKU
  editor still manually edits `rideHailingProviderInstanceId`; it does not yet
  select from provider instances.
- RideHailing Order Detail projects live provider state from the provider query
  boundary and keeps dispatch/cancellation/fee-confirm side-effect results out
  of RideHailingFulfillment persistence.

## Open Handshake Items

- First-cut route editing remains a display-oriented map/callout shell. Full
  route point mutation is still deferred.
- Provider callback-driven state convergence beyond the fake/provider-detail
  polling path remains a later hardening slice.
- Full provider cancellation and cancellation-fee UX remains deferred.

## Working Rule

Stop using this packet as a monofile. New Phase 5 discussion should update the
smallest focused file in this directory.
