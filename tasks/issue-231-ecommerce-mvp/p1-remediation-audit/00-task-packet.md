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
- P1-2 through P1-5 are still plan-only.
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
- P1-5 is still plan-only.

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
