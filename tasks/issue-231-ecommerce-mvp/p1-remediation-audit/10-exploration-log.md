# Exploration Log

## Source Packet Read

Primary design anchors:

- `00-task-packet.md`: issue status, current decisions, route families, and
  domain owner boundaries.
- `44-merchandising-product-catalog.md`: SPU/SKU model, pricing model, service
  policy, pricing pipeline, and Product Admin expectations.
- `45-merchandising-placement-offer.md`: Placement matching/target/binding,
  Offer pricing overlay, Ordering read-model topology, and PR Utility Actions
  button placement.
- `46-trade-order-model.md`: Order write model, snapshots, PR attach
  invariant, create command, and cancellation semantics.
- `47-bill-model.md`: Bill/BillLine obligation semantics and settlement
  derivation.
- `49-order-cancellation-sequences.md`: family-specific cancellation topology.
- `71-phase-4-payment-implementation-plan.md`: BillLine-scoped PaymentTx and
  settlement consequence flow.

## Code Areas Inspected

Product:

- `apps/backend/src/entities/product-spu.ts`
- `apps/backend/src/entities/product-sku.ts`
- `apps/backend/src/entities/sku-cancellation-policy.ts`
- `apps/backend/src/domains/merchandising/model/product.ts`
- `apps/backend/src/domains/merchandising/model/pricing.ts`
- `apps/backend/src/domains/merchandising/services/catalog-contract.ts`
- `apps/backend/src/domains/merchandising/use-cases/create-product-spu.ts`
- `apps/backend/src/domains/merchandising/use-cases/create-product-sku.ts`
- `apps/backend/src/domains/admin-commerce-management/use-cases/*product*`
- `apps/frontend/src/domains/admin-commerce/ui/product-management/*`

Placement and Offer:

- `apps/backend/src/entities/placement.ts`
- `apps/backend/src/entities/offer.ts`
- `apps/backend/src/domains/merchandising/model/placement.ts`
- `apps/backend/src/domains/merchandising/model/offer.ts`
- `apps/backend/src/domains/merchandising/services/placement-rule-engine.ts`
- `apps/backend/src/domains/merchandising/services/placement-selection.ts`
- `apps/backend/src/domains/merchandising/use-cases/resolve-commerce-placement-for-pr.ts`
- `apps/backend/src/controllers/commerce.controller.ts`
- `apps/backend/src/controllers/admin-commerce-management.controller.ts`
- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/commerce/ui/PRCommercePlacementAction.vue`

Order, Bill, Payment, Fulfillment:

- `apps/backend/src/entities/trade-order.ts`
- `apps/backend/src/entities/rental-order.ts`
- `apps/backend/src/entities/pr-attached-order.ts`
- `apps/backend/src/entities/bill.ts`
- `apps/backend/src/entities/payment.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/create-rental-order.ts`
- `apps/backend/src/domains/trade/use-cases/finalize-rental-order-termination.ts`
- `apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts`
- `apps/backend/src/domains/bill/use-cases/reconcile-bill-to-target-amount.ts`
- `apps/backend/src/domains/pr-core/use-cases/attach-order-to-pr.ts`
- `tests/scenario/commerce/rental-ordering.scenario.test.ts`

## Sub-Agent Split

- Product explorer: Product Catalog persistence, admin, ordering usage, tests.
- Placement/Offer explorer: Placement matching/target/binding, Offer validation,
  frontend consumption, tests.
- Order/Trade explorer: Order creation, PR attach, cancellation, Bill/Payment
  settlement, frontend routes, verification.

## Key Exploration Result

The implementation is not an empty skeleton. It contains a working Rental-first
chain, but it simplifies several packet contracts:

- pricing is mostly SKU fixed-total only;
- Placement lock/binding metadata is not persisted;
- cancellation is mostly Trade-local and not truly fulfillment-gated;
- Bill reconciliation creates refund lines without conditioning on paid basis;
- payment settlement can still apply consequences after Order cancellation;
- RideHailing remains outside the implemented user chain.
