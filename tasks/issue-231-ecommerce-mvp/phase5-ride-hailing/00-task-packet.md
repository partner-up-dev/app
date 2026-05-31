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
- `40-ordering-content-ia.md`
  - RideHailing Ordering Content information architecture.
- `50-verification-plan.md`
  - Unit, scenario, and guardrail verification plan.
- `60-implementation-plan.md`
  - Ordered implementation slices and their exit criteria.
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
- Specialized RideHailingOrder creation creates
  `RideHailingFulfillment(INITIATING)`; this is not base Order behavior.
- Do not introduce separate provider-order-attempt or provider-event-inbox
  tables in the first cut unless a non-audit need is proven.
- RideHailingOrder owns order-facing execution projection. Fulfillment must not
  duplicate long-lived driver assignment or execution projection in a way that
  creates SSoT drift.
- RideHailing Ordering Content excludes Context Header, PR source/back link,
  READY/creator eligibility, Price Detail footer, Bottom Action Bar, and create
  CTA.

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

## Open Handshake Items

- Exact parent route/page composition around RideHailing Ordering Content after
  the content IA is confirmed.
- Whether first-cut route editing supports waypoints beyond display, or only
  displays existing waypoints while permitting origin/destination edits.
- Fake Caocao HTTP server package shape for scenario tests.

## Working Rule

Stop using this packet as a monofile. New Phase 5 discussion should update the
smallest focused file in this directory.
