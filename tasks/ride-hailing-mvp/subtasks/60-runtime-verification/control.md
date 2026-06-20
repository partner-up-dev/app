# Runtime Verification

## Status

Pending. This is a cross-subtask verification packet, not an implementation
slice by itself.

## Objective & Hypothesis

Objective:

- keep the RideHailing MVP recovery grounded in browser-visible and provider
  runtime evidence

Hypothesis:

- the task is large enough that each implementation slice should have focused
  verification, while this packet preserves the end-to-end runtime checklist

## Guardrails Touched

- dev entry owner: root `pnpm dev:ensure` and portless scripts
- provider runtime owner: `packages/fake-caocao-server/`
- browser scenario owner: `tests/scenario/commerce/`
- frontend route owners:
  `/order/new` and `/orders/:orderId`

## Runtime Checklist

Use `pnpm dev:ensure` from the repository root when local frontend/backend
services are needed.

Checkpoints:

- PR placement opens `/order/new` with correct route, riders, and contact
  prefill.
- Ride quote list shows provider-backed availability and price ranges.
- Create success navigates to `/orders/:orderId`.
- Order detail shows real route geometry or a deliberate MVP route summary.
- Provider state progression is understandable without internal terminology.
- Final bill and payment/completion transition are visible and coherent.

## Verification Commands

Choose the narrowest sufficient set per slice:

- `pnpm check:type:frontend`
- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
- `pnpm vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- broader scenario or static gates only when the blast radius justifies it

## Current Blockers / Notes

- live dev DB migration was previously blocked in this workspace by
  `CONNECT_TIMEOUT ws-win.hadream.localhost:5436`
- manual browser validation should wait until a concrete UI slice is approved
  and local services are reachable

## Next Step

Use this packet as the verification checklist when a subtask moves from
discussion to implementation.
