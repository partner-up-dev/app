# Verification Plan

Date: 2026-05-31

## Unit / Backend

- Caocao signer.
- Caocao callback verifier.
- Caocao external id conversion.
- Provider instance config validation.
- Adapter request serialization.
- Provider error mapping.
- Quote expiry/revalidation.
- Caocao status/event to normalized order/fulfillment outcome mapping.
- Provider callback idempotency using existing durable owner fields, without a
  first-cut provider-event table.
- Final settlement input -> final pricing -> Bill seed.
- Pre-trip cancellation:
  - no fee;
  - with fee;
  - denied.

## Scenario / Backend

- quote -> order/call -> provider callback/detail -> final settlement ->
  final Bill -> payment -> feeConfirm.
- provider hard failure before order open -> `FAILED` order -> detached PR
  attachment -> retry allowed.
- provider timeout/unknown -> `INITIATING` reconciliation path.

## Scenario / Frontend

- PR placement -> RideHailing Ordering Content.
- Route editor map shows route points and planned driving route.
- Route point callout edit opens route point editor when enabled.
- Departure opens `BottomDrawer(DatetimePicker)`.
- `同乘人` opens `BottomDrawer(List(UserBriefRow))`.
- `联系方式` opens `BottomDrawer(PhoneEditor)`.
- Vehicle quote cards render and allow selection.
- Order creation is disabled/enabled by the parent route/page affordance, not by
  the Ordering Content component itself.
- Order Detail later shows fulfillment states, final Bill Detail, and Payment
  Checkout.

## Guardrails

- `pnpm lint:backend`
- `pnpm test:unit:backend`
- `pnpm test:unit:frontend`
- targeted ride-hailing scenario tests once added

## Slice 1 Verification Evidence

Recorded on 2026-05-31 for the Rental typed-order prerequisite:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/trade/services/rental-termination-pricing.test.ts apps/backend/src/domains/trade/services/order-termination.test.ts`
  passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  passed.
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/rental-ordering.scenario.test.ts`
  passed.

Known caveat:

- `pnpm test:unit:backend` failed outside the Slice 1 surface in notification
  and waitlist tests due dynamic import timeouts / missing imported values.

## Slice 2 Verification Evidence

Recorded on 2026-05-31 for the RideHailing provider instance foundation:

- `pnpm --filter @partner-up-dev/backend typecheck` passed before task-packet
  documentation updates.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  passed with 9 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- final `pnpm --filter @partner-up-dev/backend typecheck` passed.

Alias follow-up on 2026-05-31:

- final `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts`
  passed with 9 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  passed.
