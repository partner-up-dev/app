# RideHailing Order Detail Mock Control Plan

## Purpose

This slice improves fake Caocao ride lifecycle control so manual and scenario
checks can inspect RideHailing Order Detail states one by one.

It is an infrastructure slice for later RideHailing Order Detail UI slices.

## Classification

- Primary input route: `Reality`
- Current mode: `Execute`
- Production-code mutation was performed after Impact Handshake and explicit
  `开始`.

## Current Facts

- Fake Caocao order state lives in `packages/fake-caocao-server/src/state.ts`.
- Fake Caocao phases are:
  `CREATED`, `ACCEPTED`, `IN_TRIP`, `FINISHED`, `CANCELLED`.
- Fake Caocao currently advances phase inside
  `FakeCaocaoState.advanceOrderDetail`.
- `/common/queryOrderDetailV2` calls `advanceOrderDetail`, then posts a callback
  for the new phase when `callbackUrl` exists.
- Backend `buildRideHailingDetailProjection` calls provider
  `queryOrderDetail` whenever a provider binding exists.
- Frontend `CommerceOrderDetailPage.vue` refetches RideHailing order detail
  every 1500 ms until a bill exists.
- Therefore merely opening Order Detail drives fake Caocao through:
  `CREATED -> ACCEPTED -> IN_TRIP -> FINISHED`, then final settlement callback
  creates the bill. This prevents stable manual inspection of intermediate
  states.

## Target Model

- Provider detail reads must be read-only in fake Caocao by default.
- Fake Caocao lifecycle movement should be explicit through admin/test-control
  routes.
- The fake server should support inspecting and setting or advancing an order
  phase without knowing the internal provider order id in advance when practical.
- Callback posting should happen when an admin/test-control route moves the fake
  order phase, because backend state changes through provider callbacks.
- Existing quote, estimate availability, next-create failure, cancellation, and
  fee-confirm controls should remain stable.

## Candidate Implementation

- Replace `advanceOrderDetail(providerOrderId)` with read-only detail lookup for
  `/common/queryOrderDetailV2`.
- Add explicit state helpers:
  - `setOrderPhase(providerOrderId, phase)`
  - `advanceOrderPhase(providerOrderId)` using the existing phase order
  - optionally `findOrderByExternalOrderId(externalOrderId)` or route support
    for addressing by provider id or external id
- Add fake admin/test routes:
  - `POST /__fake_caocao/orders/:providerOrderId/phase`
  - `POST /__fake_caocao/orders/:providerOrderId/advance`
  - `POST /__fake_caocao/orders/latest/advance`
- Each route returns the updated order and posts the corresponding callback when
  `callbackUrl` exists.
- Keep create-time immediate accepted callback as a separate decision:
  - conservative first step: keep it, so newly created orders enter
    `ACCEPTED` on the backend without relying on detail polling
  - follow-up option: make create callback behavior configurable if manual
    inspection needs a stable `DISPATCHING` state immediately after create

## Open Decision

- Whether this slice should also disable create-time callback by default.
- Whether RideHailing Provider Instance Admin should expose a dev-only "advance
  phase" action for the selected fake provider instance.

Admin action recommendation:

- Add the action, but do not model it as provider-instance lifecycle. It is a
  developer control for the fake provider endpoint behind that Provider
  Instance.
- Because a Provider Instance can have multiple orders, the button needs an
  explicit target policy. Recommended MVP policy: advance the latest
  non-terminal fake Caocao order for that endpoint, returning the advanced
  `providerOrderId` and phase.
- If later manual review needs more precision, add an order selector or provider
  order id input. Do not overload one provider card action with ambiguous
  multi-order semantics.
- The action should live in a separate dev-only card in the Admin main area, not
  inside the left Provider Instance selection card or the edit form card. This
  keeps selection, editing, and fake lifecycle controls as separate UI concerns.
- Frontend Admin should call the fake Caocao control route directly through the
  selected Provider Instance `config.endpointBaseUrl`; do not add a backend
  admin proxy for this control.
- Because this bypasses backend, the "dev-only" constraint is a frontend UI /
  build constraint, not a security boundary. The action must be rendered only
  under `import.meta.env.DEV`, and the fake server remains the only expected
  receiver of `/__fake_caocao/*` control routes.

Current recommendation:

- Do not disable it in the first mutation. The immediate accepted callback is not
  the main source of rapid state collapse; detail polling is. Keeping it reduces
  behavior change and preserves current "driver assigned quickly" tests.
- Add explicit phase controls first. If Order Detail UI needs a stable
  `DISPATCHING` state next, add a second control such as
  `/__fake_caocao/callback-mode` or create options.

## Implemented Shape

- `/common/queryOrderDetailV2` is now read-only for fake Caocao order phase.
- Fake Caocao exposes explicit control routes:
  - `POST /__fake_caocao/orders/latest/advance`
  - `POST /__fake_caocao/orders/:providerOrderId/advance`
  - `POST /__fake_caocao/orders/:providerOrderId/phase`
- Control routes update fake state, post the matching provider callback when a
  callback URL exists, and return the updated fake order.
- "Latest" means the latest inserted non-terminal fake order; `FINISHED` and
  `CANCELLED` orders are skipped.
- Create-time callback still moves a callback-enabled order to `ACCEPTED`. This
  preserves current "driver assigned quickly" behavior while preventing polling
  from collapsing the remaining lifecycle.
- Frontend RideHailing Provider Instance Admin renders a separate dev-only
  "开发调试" card when a provider instance is selected. The card directly calls
  the selected instance `config.endpointBaseUrl` fake control route; it does not
  use a backend proxy.
- The dev-only Admin control is a convenience UI and not a security boundary.

## Verification

- `pnpm --filter @partner-up-dev/fake-caocao-server test`
- `pnpm --filter @partner-up-dev/fake-caocao-server typecheck`
- Focused RideHailing system scenario:
  `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- Scenario coverage proves repeated Order Detail reads do not advance fake
  provider phase beyond the create-time accepted callback.
