# RideHailing Provider Reconcile Implementation Plan

## Purpose

This file turns the task packet decisions into an execution plan.

Target outcome:

- callback is a provider reconcile notification, not business truth;
- CaoCao query detail is the SSoT for provider phase, final provider amount,
  driver snapshot, and vehicle snapshot;
- final provider amount is priced through create-order-time locked Offer / SPU /
  SKU policy before Bill materialization;
- final settlement input and final Bill creation commit in the same database
  transaction;
- order detail polling and callback handling converge on the same provider sync
  path.

## Commit Shape

Prefer two reviewable commits.

1. `feat(ride-hailing): reconcile orders from provider detail`
   - provider detail observation model and phase mapping;
   - shared provider execution context loader;
   - provider sync use case;
   - callback-as-notify refactor;
   - order detail best-effort sync;
   - cancellation pre-sync.
2. `feat(ride-hailing): materialize final bills from locked pricing`
   - order-time pricing substrate persistence;
   - final settlement consequence use case;
   - Bill seed / split rule materialization;
   - tests for pricing, idempotency, and callback/polling convergence.

If the pricing substrate migration forces large fixture churn, keep the two
commit boundary but put schema/model/fixture work in commit 2 with the final
Bill consequence.

## Phase 0 - Lock Provider Detail Contract

Goal: avoid building reconciliation against a vague CaoCao detail shape.

Actions:

- inspect current CaoCao adapter detail parser and tests;
- verify the provider detail fields used for:
  - provider order id;
  - raw provider phase / status;
  - final provider amount in fen;
  - driver snapshot;
  - vehicle snapshot;
  - cancellation / terminal state indicators;
- add focused adapter tests around the confirmed detail payload shapes;
- keep callback event id mapping out of the new business-state path.

Primary files:

- `apps/backend/src/domains/ride-hailing/services/caocao-provider.ts`
- existing CaoCao provider tests / fixtures.

Acceptance:

- one normalized provider-detail observation can be produced without reading
  callback status/event fields;
- unknown provider detail phases are explicit and observable;
- final amount field precedence is tested.

## Phase 1 - Add Shared Provider Execution Context

Goal: callback, order detail polling, cancellation, and fee confirmation should
not each resolve provider binding differently.

Actions:

- extract a backend-owned loader for local RideHailing provider execution
  context;
- load:
  - trade order;
  - ride-hailing order facts;
  - selected ride-hailing order item / choice-set binding;
  - provider instance;
  - provider order id when present;
  - split rule snapshot;
  - order-time pricing substrate once Phase 5 adds it;
- support optional caller assertions:
  - provider instance id;
  - provider order id;
  - external order id / order reference from callback;
- return typed mismatch errors for invalid callback binding.

Primary files:

- `apps/backend/src/domains/ride-hailing/use-cases/*`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- `apps/backend/src/controllers/commerce.controller.ts`

Acceptance:

- callback path can validate route/binding without applying callback business
  facts;
- order detail and cancellation can reuse the same context loader;
- no duplicate provider binding lookup logic is introduced.

## Phase 2 - Normalize Provider Detail Into Local Execution Facts

Goal: create one mapping from provider detail observation to durable local
RideHailing facts.

Actions:

- introduce a normalized observation type, for example
  `RideHailingProviderOrderObservation`;
- map provider detail phase/status to `RideHailingExecutionPhase`;
- define terminal handling for `FINISHED`, `CANCELLED`, and provider failure
  states;
- define snapshot merge semantics:
  - non-empty provider fields may overwrite stale local provider fields;
  - empty provider fields must not erase existing snapshots;
  - conflicts use provider detail as the SSoT unless there is a stronger
    timestamped rule already available;
- keep driver location and route geometry out of durable sync.

Primary files:

- `apps/backend/src/domains/ride-hailing/model/*`
- `apps/backend/src/domains/ride-hailing/services/*`
- `apps/backend/src/domains/ride-hailing/use-cases/*`

Acceptance:

- callback event id to execution phase mapping is no longer used for business
  writes;
- provider detail phase mapping is unit-tested;
- snapshot merge behavior is unit-tested.

## Phase 3 - Build Provider Sync Use Case

Goal: make provider query the common reconciliation primitive.

Actions:

- add `syncRideHailingOrderWithProvider` under RideHailing use cases;
- inputs:
  - `orderId`;
  - optional provider assertion fields from callback;
  - `trigger`: `ORDER_DETAIL_POLL`, `CAOCAO_CALLBACK`, `CANCEL_REQUEST`, future
    job;
- behavior:
  - load shared execution context;
  - no-op when no provider order id exists;
  - query provider order detail;
  - normalize provider observation;
  - avoid DB writes when normalized facts are unchanged;
  - update execution phase, driver snapshot, vehicle snapshot, and final
    settlement input from provider detail only;
  - return the synchronized facts needed by callers or a reload hint;
  - expose provider query failures distinctly from binding/auth failures.

Primary files:

- `apps/backend/src/domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts`
- `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts`
- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`

Acceptance:

- repeated sync is idempotent;
- provider query failure does not mutate local execution facts;
- local terminal state is derived from provider detail, not protected by
  callback-specific guards;
- provider detail is the only source used for final settlement input.

## Phase 4 - Refactor CaoCao Callback As Notify

Goal: callback should authenticate, route, and trigger reconcile.

Actions:

- keep callback signature verification and route parsing;
- keep callback fields needed to locate and validate local binding;
- remove callback-derived business writes:
  - event id to execution phase;
  - raw callback driver / vehicle snapshots;
  - raw callback final amount;
- call `syncRideHailingOrderWithProvider` after binding validation;
- if provider detail query fails, return retryable non-2xx to CaoCao;
- if binding/signature validation fails, return the existing invalid-callback
  error semantics.

Primary files:

- `apps/backend/src/domains/ride-hailing/use-cases/handle-caocao-order-status-callback.ts`
- callback controller route files.

Acceptance:

- callback tests prove callback payload status/amount/snapshot are ignored;
- callback-triggered provider query failure returns retryable non-2xx;
- valid callback plus provider detail success updates local facts from provider
  detail.

## Phase 5 - Persist Base Order Pricing Substrate

Goal: later Bill creation must use the Trade order's create-order-time pricing
policy snapshot, not mutable current Offer / SPU / SKU rows.

Ownership:

- the durable snapshot is a Trade order-base concern;
- RideHailing consumes it because final usage amount arrives after execution;
- RideHailing-specific provider facts stay on `ride_hailing_orders`;
- do not introduce a `ride_hailing_orders`-owned pricing policy field unless a
  genuinely provider-specific pricing fact is discovered.

Actions:

- inspect `PricingApplication` required inputs for dynamic quote pricing;
- define the minimal base-order pricing substrate needed to price a runtime
  amount later;
- persist that substrate at create-order time on the base order / order item
  snapshot surface;
- prefer a shape that is explicit enough for active-order correctness without
  expanding display snapshots for this task;
- add migration / entity / model changes;
- update factories and fixtures that create RideHailing orders.

Important constraint:

- this is not for historical recomputation. There are no launched historical
  RideHailing final-billing orders to preserve. The reason is forward active
  order correctness.

Primary files:

- `apps/backend/src/domains/trade/model/order.ts`
- `apps/backend/src/entities/trade-order.ts`
- `apps/backend/src/domains/trade/use-cases/create-order.ts`
- `apps/backend/src/domains/trade/services/pricing-application.ts`
- migrations under the backend migration owner.

Acceptance:

- newly created orders that may need later pricing re-application carry the
  locked policy substrate needed for final pricing;
- the substrate is not stored as a RideHailing-only field;
- final pricing can run without reading current Offer / SPU / SKU policy rows;
- tests prove policy changes after create-order do not affect final billing.

## Phase 6 - Extract Final Settlement Consequence

Goal: move final Bill creation out of callback and make it an order-fact
consequence.

Actions:

- create `applyRideHailingFinalSettlementConsequence`;
- input should include a transaction executor or run inside the provider sync
  transaction;
- load committed `finalSettlementInput`;
- no-op if final settlement is absent or final Bill already exists;
- derive customer-facing Bill target by applying locked pricing policy to the
  provider final amount;
- materialize charge lines through:
  - `TradeOrder.splitRuleSnapshot`;
  - `materializeChargeLinesFromSplitRule`;
  - Bill seed / Bill use case semantics;
- preserve existing Bill idempotency and unique `source_order_id` behavior.

Primary files:

- `apps/backend/src/domains/ride-hailing/use-cases/*`
- `apps/backend/src/domains/bill/services/materialize-charge-lines.ts`
- `apps/backend/src/domains/bill/use-cases/create-bill-from-seed.ts`
- `apps/backend/src/entities/bill.ts`

Acceptance:

- `ensureRideFinalBill` is removed from callback handler;
- final settlement input and final Bill creation commit in one DB transaction;
- manual participant-count splitting is gone;
- final Bill total uses locked pricing result, not raw provider amount directly;
- repeated consequence application creates one Bill only.

## Phase 7 - Wire Order Detail Polling

Goal: user polling should reconcile stale local state without making provider
failure break the detail page.

Actions:

- before building RideHailing detail projection, best-effort call provider sync
  when local phase is active and provider order id exists;
- catch provider query failures and keep the order detail response available;
- after a successful sync mutation, reload local order / ride facts or build the
  response from synchronized facts;
- keep `queryDriverLocation` and `queryDriverRoute` as projection-only live
  geometry calls;
- avoid provider sync once local terminal state is already coherent.

Primary files:

- `apps/backend/src/domains/trade/use-cases/ride-hailing-ordering-flow.ts`
- `apps/backend/src/domains/trade/use-cases/rental-ordering-flow.ts`
- `apps/backend/src/controllers/commerce.controller.ts`

Acceptance:

- lost callback scenario is repaired by order detail polling;
- provider query failure does not fail `GET /api/commerce/orders/:orderId`;
- response reflects post-sync durable facts when sync succeeds.

## Phase 8 - Wire Cancellation Freshness

Goal: local stale phase should not allow or deny cancellation incorrectly.

Actions:

- call provider sync before local cancellation eligibility check;
- re-check local ride phase after sync;
- keep provider cancellation command behavior separate from detail sync;
- return existing user-facing cancellation errors when provider state makes
  cancellation invalid.

Primary files:

- RideHailing cancellation use case / controller files.

Acceptance:

- if provider has already advanced beyond cancellable phase, local cancellation
  is rejected after sync;
- if provider still allows cancellation, existing cancellation behavior remains
  unchanged.

## Phase 9 - Verification Matrix

Run focused tests first, then broader gates.

Unit tests:

- provider detail phase mapping;
- snapshot merge semantics;
- callback ignores payload status / amount / snapshot;
- provider query failure in callback returns retryable non-2xx and mutates
  nothing;
- final settlement consequence:
  - same transaction with final settlement input;
  - locked pricing policy application;
  - split rule allocation;
  - idempotency;
- order detail provider sync failure remains best-effort.

Backend scenario tests:

- lost callback repaired by `GET /api/commerce/orders/:orderId`;
- callback success path persists provider-detail-derived facts only;
- callback provider-detail failure is retryable;
- final bill uses create-order-time locked policy even if current policy changes;
- cancellation pre-sync closes stale local loopholes;
- callback and polling race remains idempotent.

Commands:

- `pnpm test:unit:backend`
- `pnpm test:scenario:backend`
- narrower test commands during development as needed;
- `pnpm check:static` before final push if time and unrelated baseline permit.

## Phase 10 - Pre-Deployment Notes

Before pushing for CI / preprod deployment:

- ensure migrations are included and reversible according to the repo migration
  pattern;
- ensure env-limited migration SQL is added only if preprod test data needs it;
- confirm the task packet and this plan reflect any implementation deviations;
- prepare a short deployment note:
  - callback now triggers provider detail reconcile;
  - callback provider-detail failure returns retryable non-2xx;
  - order detail polling can mutate local RideHailing facts best-effort;
  - final settlement and final Bill commit atomically.

## Stop Conditions

Pause and return to design review if any of these happen:

- CaoCao query detail cannot reliably expose final amount or terminal phase;
- locked pricing substrate requires reading mutable current Offer / SPU / SKU
  rows at final settlement time;
- Bill creation cannot be called safely inside the same transaction;
- order detail polling would need to perform high-frequency live geometry writes;
- final Bill derivation conflicts with existing product or Bill ownership docs.

## Implementation Notes

- Implemented base-order `pricingExecutionSnapshot` on `trade_orders`, not a
  RideHailing-owned pricing field.
- RideHailing callback now verifies callback routing/signature, then queries
  provider detail through the shared sync path. Callback status, driver,
  vehicle, and amount fields are not used as business truth.
- `syncRideHailingOrderWithProvider` owns provider-detail-derived local facts:
  execution phase, driver snapshot, vehicle snapshot, and final settlement
  input.
- `applyRideHailingFinalSettlementConsequence` owns final Bill creation from the
  committed RideHailing final settlement input, locked base-order pricing
  snapshot, split rule, and Bill seed.
- Order Detail polling now best-effort reconciles provider detail before
  response projection, and skips provider live projection if detail query fails.
- RideHailing cancellation pre-syncs provider detail and permits cancellation
  before trip start (`DISPATCHING`, `ACCEPTED`, `ARRIVED_AT_PICKUP`).
- Frontend cancellation affordance was aligned with the backend pre-trip
  cancellable phases.

## Verification Completed

- `pnpm check:type:backend`
- `pnpm check:type:frontend`
- `pnpm test:unit:backend`
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
- `pnpm exec vitest run --project system-scenario tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`
- `pnpm db:lint`
- `pnpm db:check`
- `pnpm exec biome lint ...` over the changed backend/frontend source and
  scenario files.

Observed unrelated baseline:

- `pnpm test:scenario:backend -- apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`
  did not filter by file in this workspace and ran all backend scenarios; it
  exposed an unrelated payment provider duplicate-active-client failure. The
  RideHailing callback scenario was verified with the explicit `pnpm exec
  vitest run ... <file>` command above.
