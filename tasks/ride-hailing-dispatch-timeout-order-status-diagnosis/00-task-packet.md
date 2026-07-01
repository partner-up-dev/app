# RideHailing Dispatch Timeout Order Status Diagnosis

Date: 2026-06-30

## Objective & Hypothesis

- Reality: diagnose why a RideHailing order can show execution phase
  `CANCELLED` while the base order status remains ongoing / `OPEN`.
- User-stable reproduction: provider dispatch timeout causes cancellation.
- Current hypothesis: provider sync persists RideHailing execution truth but does
  not propagate terminal RideHailing cancellation into the Trade order lifecycle.

## Guardrails Touched

- Input route: `Reality`.
- Active mode: `Diagnose`.
- Durable owner candidates:
  - Trade order lifecycle:
    `apps/backend/src/domains/trade/`
  - RideHailing provider execution truth:
    `apps/backend/src/domains/ride-hailing/`
  - user-visible order detail:
    `apps/frontend/src/domains/commerce/ui/order-detail/`
- No business code mutation before explicit user start.

## Verification

- Completed: traced dispatch-timeout / provider-cancelled status mapping.
- Completed: traced base order status persistence during provider sync.
- Completed: implemented provider-observed cancellation lifecycle propagation.
- Completed: split RideHailing final bill payment consequence from Rental
  prepaid `OPEN` gate.
- Completed: added recurrence guards.

## Current Understanding

- Contract boundary from `docs/20-product-tdd/ecommerce-contracts.md`:
  - Trade owns order lifecycle.
  - RideHailing owns service execution truth.
- Prior task evidence already noted an adjacent bug: terminal RideHailing phases
  may leave base `order.status = OPEN`.
- CaoCao cancellation-like provider statuses map to local RideHailing
  `executionPhase = CANCELLED`.
  - `4` = system cancel
  - `10` = cancelled pending payment
  - `13` = cancelled paid
  - `14` = free cancel
  - `20` = user cancel
  - `21` = customer-service cancel
  - `26` = driver cancel
  - `27` = third-party cancel
- Provider callback and order-detail polling both call
  `syncRideHailingOrderWithProvider()`.
- `syncRideHailingOrderWithProvider()` persists RideHailing execution phase,
  driver, and vehicle snapshots, and only promotes base order status
  `INITIATING -> OPEN`.
- There is no provider-sync branch that propagates terminal
  `executionPhase = CANCELLED` into Trade `order.status = CANCELLED`.
- Manual/admin RideHailing cancellation uses the Trade termination mechanism and
  does persist both:
  - base `order.status = CANCELLED`
  - `ride_hailing_orders.execution_phase = CANCELLED`
- Therefore the observed split state is caused by an asymmetric lifecycle
  propagation path:
  - user/admin-initiated cancel closes Trade order
  - provider-observed cancel only closes RideHailing execution phase
- Frontend labels are direct projections:
  - `order.status = OPEN` -> `进行中`
  - `ride.executionPhase = CANCELLED` -> `已取消`
  so the UI is revealing backend state inconsistency rather than inventing it.
- Fix caveat:
  - final bill materialization for RideHailing does not currently require base
    order `OPEN`
  - payment-settlement consequence does currently skip non-`OPEN` orders, so a
    provider-cancelled order with non-zero final payable amount needs explicit
    handling if provider fee confirmation must still happen after payment.

## Next Step

- Implementation completed:
  - provider sync now closes `INITIATING` / `OPEN` RideHailing Trade orders when
    the effective RideHailing execution phase is `CANCELLED`
  - provider-observed cancellation records an approved termination attempt with
    `requestedBy = system:ride-hailing-provider`
  - `applyBillSettlementToOrder()` now routes RideHailing bills through final
    settlement rules before applying the Rental-style `OPEN` prepaid gate
  - cancelled RideHailing orders with final settlement input can still confirm
    provider fee after final bill payment
- Recurrence guards:
  - `order-termination.test.ts` covers provider-observed RideHailing
    cancellation and pending-attempt approval
  - `caocao-callback-route.scenario.test.ts` covers cancelled callback closing
    Trade order, final bill creation, and post-payment provider fee confirmation
  - existing rental late-payment scenario continues to guard against cancelled
    Rental orders starting fulfillment after late payment
- Verification completed:
  - `pnpm test:unit:backend -- apps/backend/src/domains/trade/services/order-termination.test.ts apps/backend/src/domains/trade/services/order-status.test.ts`
  - `pnpm test:scenario:backend -- apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts apps/backend/tests/commerce/rental-order-persistence.scenario.test.ts`
  - `pnpm check:type:backend`
  - `pnpm check:lint:backend`
  - `pnpm exec biome check apps/backend/src/domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts apps/backend/src/domains/trade/use-cases/apply-bill-settlement-to-order.ts apps/backend/src/domains/trade/services/order-termination.ts apps/backend/src/domains/trade/services/order-termination.test.ts apps/backend/src/repositories/TradeOrderRepository.ts apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
