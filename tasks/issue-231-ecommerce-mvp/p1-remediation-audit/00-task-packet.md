# Issue 231 P1 Remediation Audit

## Objective & Hypothesis

Audit the current issue-231 ecommerce implementation against the existing
Product, Placement, Offer, and Order design packet, then define separate P1
repair plans before implementation.

Hypothesis: the current working tree has a usable Rental-first commercial loop,
but several P1 gaps prevent the implementation from matching the packet's
authority boundaries and lifecycle guarantees.

## Input Classification

- Type: Reality + Artifact.
- Active mode: Diagnose, then Solidify.
- User state: the diagnosed P1 issues are accepted; implementation has not been
  requested in this slice.
- Implementation rule: do not edit production code until the user explicitly
  says to start implementation.

## Working Files

- `00-task-packet.md`: entry, scope, guardrails, and status.
- `10-exploration-log.md`: documents read, code areas inspected, and sub-agent
  split.
- `20-diagnosis.md`: accepted P1 findings and supporting evidence.
- `30-p1-fix-plans.md`: separate repair plan for each accepted P1 issue.
- `40-module-topology.md`: current and target topology for the audited modules.
- `50-p2-fix-plans.md`: follow-up P2 repair plans after P1 closure.
- `60-placement-rental-decoupling.md`: over-coupling diagnosis and repair
  target for generic Placement binding.
- `70-fulfillment-decoupling.md`: repair target for settlement-driven
  fulfillment family dispatch.
- `80-order-creation-context-decoupling.md`: repair target for removing direct
  PR context access from Trade order creation.

## Guardrails Touched

- `tasks/issue-231-ecommerce-mvp/44-merchandising-product-catalog.md`
- `tasks/issue-231-ecommerce-mvp/45-merchandising-placement-offer.md`
- `tasks/issue-231-ecommerce-mvp/46-trade-order-model.md`
- `tasks/issue-231-ecommerce-mvp/47-bill-model.md`
- `tasks/issue-231-ecommerce-mvp/49-order-cancellation-sequences.md`
- `tasks/issue-231-ecommerce-mvp/71-phase-4-payment-implementation-plan.md`
- `docs/20-product-tdd/ecommerce-contracts.md`
- Backend domains: `merchandising`, `trade`, `bill`, `payment`,
  `fulfillment`, `pr-core`
- Frontend surfaces: PR utility placement, Ordering, Order Detail, Bill Detail,
  Payment Checkout

## Current Status

- Exploration complete.
- Sub-agent audits complete for Product, Placement/Offer, and Order/Trade.
- P1 diagnosis accepted by user.
- P1-1 `PricingApplication` implementation started after explicit user
  approval.
- P1-1 implementation complete for the Rental fixed-total path:
  - added Trade `PricingApplication`;
  - Rental evaluate/create now reuse its `OrderPricingSnapshot`;
  - SPU pricing rules and Offer SKU/SPU/ORDER pricing rules execute through
    the same service.
- P1-2 implementation complete:
  - added `placements.binding_rules`;
  - added Placement binding validation/resolution service;
  - Placement create/update accepts and validates binding rules;
  - Rental Ordering derives locked PR fields from binding rules;
  - Placement Admin exposes visual binding-rule row editing.
- P1-3 implementation complete:
  - added Bill-owned `BillLineSettlementProjection`;
  - Rental termination finalization derives settled BillLine basis through the
    Payment state projection before reconciliation;
  - Bill reconciliation bounds REFUND allocations by paid CHARGE BillLine
    basis;
  - unpaid cancellation no longer creates REFUND BillLines.
- P1-4 implementation complete:
  - user cancellation now chooses `TRADE_LOCAL` or `RENTAL_FULFILLMENT`
    resolution based on the frozen cancellation tier and whether a Rental
    Fulfillment exists;
  - Fulfillment-gated cancellations remain pending and mark the Rental
    Fulfillment cancellation handling as `REQUESTED`;
  - Fulfillment Admin exposes approve/deny cancellation actions;
  - Admin approval/denial finalizes the Trade termination attempt and updates
    Fulfillment cancellation state.
- P1-5 implementation complete:
  - payment settlement consequence now no-ops unless the source order is
    `OPEN` and has no pending termination attempt;
  - late successful CHARGE convergence on a cancelled Rental order no longer
    creates Rental Fulfillment;
  - late successful CHARGE convergence while cancellation is pending also
    no-ops;
  - open paid Rental fulfillment behavior remains covered by the existing
    commerce scenario.
- P2-1 implementation complete:
  - Rental `servicePolicy` now carries optional service-window fields:
    weekdays, daily start time, and daily end time;
  - Product Admin can edit and persist the Rental service window;
  - Rental Ordering evaluate/create validates the PR-bound service time against
    Product lead-time and service-window policy.
- P2-3 implementation complete:
  - Placement now has nullable `effectiveFrom` / `effectiveTo` fields;
  - Placement candidate lookup and direct ordering entry reject future/expired
    active windows;
  - Placement Admin can edit the active window.
- P2-5 implementation complete:
  - PR attachment no longer uses non-detached attachment as the uniqueness
    authority;
  - attachment lookup now resolves the current non-terminal Trade Order for
    `(prId, offerId)`;
  - open orders still block duplicates, while terminal orders allow a new order
    without detaching historical attachment rows.
- Placement/Rental decoupling started after user approval:
  - current diagnosis: Placement runtime and binding model still contain
    Rental-specific field enums and ProductType filtering;
  - target: generic Placement binding rules with Rental-specific requirements
    enforced by Offer/Product-derived definition-time contract and Rental
    Ordering consumption.
- Placement/Rental decoupling implementation complete:
  - `PlacementBindingRule` is now a generic `fieldKey <- contextPath` mapping;
  - Placement binding execution no longer knows PR or Rental fields;
  - Rental required binding fields are enforced through the target Offer's
    definition-time binding contract and consumed inside Rental Ordering;
  - PR placement resolution queries candidates by `slotKey` only and no longer
    filters matched Offers by ProductType.
- Fulfillment decoupling started after user approval:
  - current diagnosis: Trade settlement convergence directly hardcodes Rental
    Fulfillment creation;
  - target: Trade decides settlement eligibility, Fulfillment owns
    family-specific settlement consequence dispatch.
- Fulfillment decoupling implementation complete:
  - Trade Bill settlement convergence no longer imports Rental Fulfillment
    creation directly;
  - Fulfillment owns the prepaid-settlement family consequence dispatcher;
  - Rental still starts Rental Fulfillment after prepaid Bill settlement;
  - RideHailing currently no-ops for prepaid-settlement fulfillment consequence
    because its fulfillment is created during order initiation.
- Order creation context decoupling started after user correction:
  - current diagnosis: Trade order creation still reads PR participants and
    attaches orders to PR directly;
  - target: Trade order creation receives a resolved Order context
    (`participants`, snapshots, family facts) and no longer knows PR context;
  - PR + Offer non-terminal order attachment remains in PR/ordering
    orchestration, not in base order creation;
  - user rejected the earlier claim that merging Fulfillment attributes into
    Order is inherently a boundary problem; this must be re-evaluated under the
    `order base + typed order` model after this slice.
- Order creation context decoupling implementation complete:
  - Rental and RideHailing order creation now receive participant snapshots
    instead of `prId`;
  - Trade order creation no longer imports PR identifiers, `PartnerRepository`,
    or `attachOrderToPr`;
  - PR-aware ordering flow wraps Trade order creation and PR attachment in one
    transaction;
  - BillLine descriptions no longer embed PR-specific wording inside Trade
    order creation.

## Verification So Far

Order/Trade sub-agent reported these read-only checks passing on the current
working tree:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit`
- `pnpm --filter @partner-up-dev/backend db:lint`

These checks do not prove the P1 issues are fixed; they only bound current
type/schema health.

P1-1 implementation verification:

- `pnpm --dir apps/backend test:unit -- --run apps/backend/src/domains/trade/services/pricing-application.test.ts`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

P1-2 implementation verification:

- `pnpm --dir apps/backend test:unit -- --run apps/backend/src/domains/merchandising/services/placement-binding.test.ts`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/frontend exec vue-tsc --noEmit`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm lint:backend`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
- `pnpm --dir apps/backend test:unit -- --run apps/backend/src/domains/merchandising/services/placement-binding.test.ts apps/backend/src/domains/trade/services/pricing-application.test.ts`

P1-3 implementation verification:

- `pnpm test:unit:backend -- src/domains/bill/services/reconcile-lines.test.ts src/domains/payment/services/bill-payment-state.test.ts`
- `pnpm --filter backend typecheck`

P1-4 implementation verification:

- `pnpm --filter backend typecheck`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm lint:backend`
- `pnpm test:unit:backend -- src/domains/trade/services/order-termination.test.ts src/domains/fulfillment/services/fulfillment-lifecycle.test.ts`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

P1-5 implementation verification:

- `pnpm --filter backend typecheck`
- `pnpm lint:backend`
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

P2-1/P2-3/P2-5 implementation verification:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/domains/trade/services/rental-service-policy.test.ts apps/backend/src/domains/merchandising/services/placement-selection.test.ts`
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `pnpm lint:backend`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

Placement/Rental decoupling verification:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir apps/frontend exec vue-tsc --noEmit`
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/domains/merchandising/services/placement-binding.test.ts apps/backend/src/domains/merchandising/services/placement-selection.test.ts apps/backend/src/domains/trade/services/rental-service-policy.test.ts`
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `pnpm lint:backend`
- `pnpm --filter @partner-up-dev/backend db:lint`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

Fulfillment decoupling verification:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/domains/fulfillment/services/fulfillment-lifecycle.test.ts`
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
- `pnpm lint:backend`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`

Order creation context decoupling verification:

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --dir . exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
- `pnpm --dir . exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
- `pnpm lint:backend`
