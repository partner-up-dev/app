# 5-0 Evidence Index

| Question | Primary evidence |
| --- | --- |
| product ordering behavior | `docs/10-prd/behavior/workflows/commerce-and-support.md`, `docs/10-prd/behavior/rules-and-invariants.md` |
| owner/contract allocation | `docs/20-product-tdd/ecommerce-contracts.md`, `docs/20-product-tdd/ecommerce-provider-contracts.md`, `docs/20-product-tdd/unit-topology.md` |
| provider runtime boundary | `docs/40-deployment/provider-edge-routing.md` and payment runtime configuration owner |
| current backend transport | `apps/backend/src/controllers/commerce.controller.ts`, `payment.controller.ts`, `payment-provider.controller.ts` |
| current Web transport | `apps/web/src/domains/commerce/queries/useCommerce.ts`, `apps/web/src/domains/payment/queries/usePayment.ts` |
| browser proof | `tests/scenario/commerce/rental-ordering.scenario.test.ts`, `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts` |
| compatibility/dependency findings | focused import inventory recorded in `findings.md`; verify again immediately before any source mutation |
