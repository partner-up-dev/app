# PR Active Order Attachment

## Objective & Hypothesis

Investigate why PR-attached ordering blocks when a PR is `ACTIVE`, even though
the requested target behavior is to allow attachment in both `READY` and
`ACTIVE`.

Hypothesis:

- The current block is enforced by backend order-creation and PR-attachment
  guards that still require `request.status === "READY"`.
- A secondary constraint also exists in some placement matching rules and
  recovery copy that are written around the same `READY`-only assumption.
- Changing this behavior is a business-rule change, not a purely local bug fix,
  because durable product and technical docs currently state that PR-attached
  ordering is allowed only when PR is `READY`.

## Input Classification

- Type: `Reality`
- Active mode: `Execute`
- Evidence status: code-path evidence gathered, implementation applied, and
  focused verification completed

## Guardrails Touched

- Product truth:
  - `docs/10-prd/behavior/rules-and-invariants.md`
- Cross-unit technical truth:
  - `docs/20-product-tdd/ecommerce-contracts.md`
- Backend authority:
  - `apps/backend/src/domains/trade/use-cases/create-order.ts`
  - `apps/backend/src/domains/pr-core/use-cases/attach-order-to-pr.ts`
  - `apps/backend/src/controllers/placement.controller.ts`
- Frontend entry and recovery copy:
  - `apps/frontend/src/pages/PRPage.vue`
  - `apps/frontend/src/pages/OrderingPage.vue`
  - `apps/frontend/src/domains/commerce/ui/ButtonPlacement.vue`
  - `apps/frontend/src/domains/commerce/use-cases/usePlacementOrderingEntryFlow.ts`
- Scenario verification anchors:
  - `tests/scenario/commerce/rental-ordering.scenario.test.ts`
  - `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`

## Current Understanding

- PR detail already mounts Button Placement for active participants without a
  direct `READY`-only gate in the frontend page shell.
- Rental placement fixtures do not hard-require `READY` in matching rules.
- Ride-hailing placement fixtures also needed a `READY | ACTIVE` matching rule
  instead of `status === "READY"`.
- Backend order creation and PR attachment now share the same
  `READY | ACTIVE` order-attachable predicate.
- User-facing `PR_NOT_READY` copy now reflects the real gate:
  `创建订单需要搭子请求「已成团」或「进行中」`.
- Durable docs now describe `READY | ACTIVE` as the allowed PR-attached
  ordering states.

## Verification

- `pnpm --filter @partner-up-dev/backend test:unit -- src/domains/pr-core/services/status-rules.test.ts`
  passed.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts -t 'commerce_rental_order_attaches_to_active_pr_orders'`
  passed.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts -t 'ride_hailing_order_foundation_persists_base_typed_and_provider_binding_for_active_pr'`
  passed.
- `pnpm check:type:backend` passed.
- `pnpm check:type:frontend` passed.
- Frontend system-scenario command discovery was noisy because a broader
  `system-scenario` invocation also ran unrelated commerce scenarios with heavy
  debug logging, so the focused regression proof for this slice relies on the
  backend authority scenarios plus type checks.
