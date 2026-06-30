# RideHailing Immediate Finished Diagnosis

## Objective & Hypothesis

- Objective: diagnose why a CaoCao ride-hailing order becomes locally `FINISHED`
  immediately after creation while the provider-side order later times out during
  dispatch.
- Current hypothesis: the provider detail parser treats CaoCao `orderFeeVo.totalFee`
  as a final settlement amount before the order is terminal. Because provider
  status `1` is not mapped to a local active phase, the observation fallback
  converts the non-null amount into `FINISHED`.
- Current execution slice: only fix CaoCao status mapping completeness and
  adapter label projection. The separate `finalSettlementInput` generation issue
  is intentionally left to another thread.

## Guardrails Touched

- Input type: `Reality`.
- Active mode: `Diagnose`.
- Durable owner candidates:
  - provider detail parsing: `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`
  - provider observation/state mapping:
    `apps/backend/src/domains/ride-hailing/services/provider-order-observation.ts`
  - sync mutation path:
    `apps/backend/src/domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts`
  - order detail trigger:
    `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- No product/business code changed during this diagnosis.

## Evidence

- Attached production-like snapshot:
  - base `order.status` is `OPEN`
  - ride `executionPhase` is `FINISHED`
  - `finalSettlementInput.committedAt` is `2026-06-30T08:23:48.893Z`, about
    843 ms after `order.createdAt`
  - CaoCao `basicOrderVO.status` in the stored provider snapshot is `1`
  - CaoCao `orderTime`, `updateTime`, and `departureTime` are all
    `2026-06-30 16:23:48`, matching initial creation rather than trip finish
  - driver and vehicle snapshots are null
  - final bill was created at `2026-06-30T08:23:48.878Z`
- Create-order path only persists ride phase `INITIATING -> DISPATCHING` and
  base order `OPEN`; it does not write `FINISHED`.
- Order detail path calls provider sync via `ORDER_DETAIL_POLL` whenever the
  order has a provider binding.
- `parseCaocaoOrderDetail` reads `phase` from top-level or `basicOrderVO.status`
  and reads `finalAmountFen` from `orderFeeVO/orderFeeVo.totalFee`.
- `mapProviderDetailPhaseToExecutionPhase` does not map phase/status `1`.
  When phase is unmapped and `finalAmountFen !== null`, it returns `FINISHED`.
- Existing unit test explicitly covers the fallback:
  `phase: "UNKNOWN", finalAmountFen: 4800 -> FINISHED`.
- CaoCao official order-status documentation maps:
  - `1` 未派单
  - `2` 已派单
  - `3` 乘客上车，计费开始
  - `8` 行程结束，计费结束
  - `5` 待支付
  - `7` 已支付，待评价
  - `6` 已评价
  - `11` 预约单改派中
  - `12` 司机已到达
  - `4/10/13/14/20/21/26/27` cancellation-related terminal states

## Current Understanding

Sequence:

1. `POST /api/commerce/orders` creates local base order and ride-hailing facts.
2. CaoCao create returns provider order id; local ride phase becomes
   `DISPATCHING`, base order becomes `OPEN`.
3. Frontend navigates to `/orders/:orderId`.
4. `GET /api/commerce/orders/:orderId` builds ride detail and calls
   `syncRideHailingOrderWithProvider`.
5. Sync queries CaoCao detail. CaoCao detail contains `basicOrderVO.status = 1`
   and `orderFeeVo.totalFee = 1362`.
6. Parser returns `phase = "1"` and `finalAmountFen = 1362`.
7. Observation has no status mapping for `1`; the non-null amount fallback marks
   the local execution phase as `FINISHED` and commits final settlement.
8. Final settlement consequence creates the bill.

## Confirmed Constraints

- The provider-side status in the snapshot is not a terminal local signal by the
  current code's own label behavior: unmapped status falls back to `正在呼叫`.
- The visible frontend state follows backend `rideHailing.executionPhase`; the
  frontend maps `FINISHED` to `行程已结束`.
- Root instruction requires explicit user start before modifying code.

## Verification

- Completed: static source trace from create order to order detail sync.
- Completed: attached data inspected and matched against parser/observer logic.
- Completed code changes:
  - map CaoCao `1` and `11` to local `DISPATCHING`
  - map CaoCao `2` and `9` to local `ACCEPTED`
  - keep `3`, `12`, `5/6/7/8`, and cancellation statuses explicit
  - replace broad CaoCao status labels with official-status labels
  - keep status-mapping tests scoped to official phase mapping; non-terminal
    `finalAmountFen` generation remains owned by the separate settlement thread
- Completed verification:
  - `pnpm test:unit:backend -- apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts apps/backend/src/domains/ride-hailing/services/provider-order-observation.test.ts`
    - backend-unit project result: 66 files, 298 tests passed
  - `pnpm exec biome check apps/backend/src/domains/ride-hailing/services/caocao-provider.ts apps/backend/src/domains/ride-hailing/services/provider-order-observation.ts apps/backend/src/domains/ride-hailing/services/caocao-provider.test.ts apps/backend/src/domains/ride-hailing/services/provider-order-observation.test.ts`
  - `pnpm check:lint:backend`
  - `pnpm check:type:backend`
- Known out-of-scope:
  - `finalSettlementInput` is still generated whenever provider detail exposes
    `finalAmountFen`; another thread owns that fix.
