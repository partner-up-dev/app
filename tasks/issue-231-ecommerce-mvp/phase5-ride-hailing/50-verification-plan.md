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
- Quote/evaluate uses each SKU's `rideHailingProviderInstanceId` fact and does
  not fall back to a default provider instance.
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

- RideHailing system scenario is the Phase 5 acceptance gate.
- The scenario must use the real frontend and browser interactions for the
  user-visible path.
- Assertions must be on rendered UI content/state, not direct backend API
  responses.
- PR placement -> RideHailing Ordering Content.
- Route editor map shows route points and planned driving route.
- Route point callout edit opens route point editor when enabled.
- Departure opens `BottomDrawer(DatetimePicker)`.
- `同乘人` opens `BottomDrawer(List(UserBriefRow))`.
- `联系方式` opens `BottomDrawer(PhoneEditor)`.
- Vehicle quote cards render and allow selection.
- Order creation is disabled/enabled by the parent route/page affordance, not by
  the Ordering Content component itself.
- Order Detail map-first content shows route, live/navigation state, driver
  info, passengers, selected ride type from base order generic item/pricing
  snapshot before acceptance, route summary, and status actions.
- Order Detail links to Bill Detail / Payment Checkout when bill/payment state
  exists; Payment Checkout itself remains outside the Order Detail content.
- Order Detail cancellation drawer shows availability, cancel fee, reason
  choices, detail input, disabled state, and success/error result once the
  cancellation use case exists.

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

Shrink correction rerun on 2026-05-31:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm db:lint` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/trade/services/order-status.test.ts apps/backend/src/domains/fulfillment/services/fulfillment-lifecycle.test.ts`
  passed with 10 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
  passed and asserts future execution/cancellation/settlement fields are not
  present on the foundation tables.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  passed with 5 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  passed.
- `pnpm lint:backend` passed.
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

## Slice 3 Verification Evidence

Recorded on 2026-05-31 for the RideHailing local order and provider-binding
fulfillment foundation:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/trade/services/order-status.test.ts apps/backend/src/domains/fulfillment/services/fulfillment-lifecycle.test.ts`
  passed with 10 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/ride-hailing-order-foundation.scenario.test.ts`
  passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  passed with 3 tests.
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  passed.

## RideHailing System Scenario Evidence

Recorded on 2026-05-31 for the provider-backed RideHailing Ordering to
Fulfillment path:

- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
  passed with 2 tests.
- The passing scenario covers:
  - PR placement to generic Ordering route;
  - RideHailing Ordering rendered content and drawers;
  - provider-backed SKU quote cards using each SKU's
    `rideHailingProviderInstanceId`;
  - provider-backed create order success;
  - provider create hard failure without leaving an apparently successful open
    order, followed by retry availability;
  - RideHailing Order Detail route, passenger, selected vehicle, driver,
    vehicle, and provider status content;
  - final Bill creation from provider detail;
  - Payment Checkout through the real frontend;
  - payment settlement consequence calling Caocao `feeConfirm`.

Final guardrail rerun on 2026-05-31:

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/merchandising/services/catalog-contract.test.ts`
  passed with 5 tests.
