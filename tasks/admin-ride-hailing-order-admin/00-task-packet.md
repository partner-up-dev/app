# Task Packet - RideHailing Order Admin

## Objective & Hypothesis

- Objective & Hypothesis: add a dedicated `RideHailing Order Admin` surface under the existing `RideHailing` admin group so operators can inspect ride-hailing orders and cancel orders from admin tooling. Hypothesis: a focused admin workspace plus one admin-only cancel command can reuse the existing ride-hailing cancellation core if the creator-only guard is refactored into an explicit actor policy.

## Guardrails Touched

- Typed input: Intent.
- Durable owner: RideHailing operator tooling across admin frontend and admin backend contracts.
- Product / contract docs:
  - `docs/10-prd/behavior/capabilities.md`
  - `docs/20-product-tdd/cross-unit-contracts.md`
  - `docs/20-product-tdd/ecommerce-contracts.md`
- Backend surfaces:
  - `GET /api/admin/ride-hailing/orders/workspace`
  - `POST /api/admin/ride-hailing/orders/:orderId/cancel`
  - `admin-ride-hailing-management` read/write use cases and controller typing
  - shared ride-hailing cancellation domain flow
- Frontend surfaces:
  - `/admin/ride-hailing/orders`
  - RideHailing admin navigation model and locale copy
  - RideHailing admin query/mutation hooks
  - dedicated order admin page with destructive confirmation

## Verification

- Results:
  - `pnpm check:type:backend` passed.
  - `pnpm check:build:frontend` passed.
  - `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/admin-ride-hailing-order.scenario.test.ts` passed.
  - `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts -t commerce_ride_hailing_order_detail_cancel_dispatching_order` passed.
  - `pnpm check:lint:backend` passed.
  - `pnpm check:lint:frontend` completed without new blocking findings; naming audit reported two existing `RideHailing*Content` weak-name findings outside this slice.
