# 5-5.3 Implementation Log

## 2026-07-20 — Monotonic Phase Primitive

Added the owner-local `reconcileRideHailingExecutionPhase` decision primitive in
`apps/backend/src/domains/ride-hailing/services/provider-order-observation.ts` before wiring any controller or
provider path to it. It makes the intended race rule executable:

- active phases move only forward;
- an active order may accept its first terminal phase;
- an already committed terminal phase is immutable in this slice;
- an unmapped provider phase changes nothing.

Focused test proof:

```text
pnpm exec vitest run apps/backend/src/domains/ride-hailing/services/provider-order-observation.test.ts \
  --config vitest.backend.config.ts --project backend-unit
# 1 file, 34 assertions passed
```

The root `pnpm test:unit:backend -- <path>` wrapper still loads every backend-unit suite; it exposed an unrelated
pre-existing environment failure in `pr-authoring/submit-preference-tags.test.ts` because `DATABASE_URL` was absent.
The directly targeted Vitest invocation is the credible proof for this isolated, no-database helper. Wiring the
primitive into reconciliation, row locking, terminal Bill proof, and callback/poll scenarios remains pending.

## 2026-07-20 — Reconciliation wiring

The reconciliation transaction now locks the Ride row before applying monotonic phase/snapshot/choice updates.
Terminal final-fare commit takes the same row lock, so concurrent terminal observations can create only one final
settlement input and one Bill target. A later provider amount disagreement returns a non-mutating
`correctionRequired` result with the existing Bill id and leaves settled history unchanged.

Verification after wiring:

- backend typecheck passed;
- provider observation/CaoCao unit suites passed (74 assertions);
- pure local Ride Detail projection test passed;
- fake-provider callback scenario passed for terminal final-bill creation and the no-authoritative-fare path.
- The cancelled-terminal callback scenario still has an existing payment fixture failure while marking its charge
  line settled; this is outside reconciliation and should be resolved with the payment-slice owner.

## 2026-07-20 — Cancellation claim and completion

Ride-hailing cancellation now follows a durable claim protocol:

- preflight provider reconciliation and provider-instance lookup stay outside database locks;
- a short claim transaction locks Trade first and Ride second, appends exactly one pending termination attempt, and
  marks it `RIDE_HAILING_FULFILLMENT` before any provider cancellation request;
- provider cancellation I/O runs without a transaction lock; transport failure denies the still-pending claim in a
  short Trade-then-Ride transaction so a retry remains possible;
- completion takes the same lock order, approves the owned claim, closes the order, and marks Ride `CANCELLED`;
  callback/reconcile approval of the pending claim is treated as an idempotent completion;
- a competing HTTP cancellation request observes the pending claim and returns
  `RIDE_HAILING_CANCELLATION_IN_PROGRESS` without issuing a second provider cancel request.

The admin ride-hailing scenario now holds the first fake provider cancellation response while issuing a concurrent
HTTP cancellation. It proves one provider cancel request, one approved attempt, and one terminal Trade/Ride state.

Verification:

```text
pnpm --filter @partner-up-dev/backend typecheck
pnpm exec oxlint apps/backend/src/domains/trade/use-cases/cancel-ride-hailing-order-from-order-detail.ts \
  apps/backend/tests/ride-hailing/admin-ride-hailing-order.scenario.test.ts \
  apps/backend/src/repositories/TradeOrderRepository.ts \
  apps/backend/src/repositories/RideHailingOrderRepository.ts
pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario \
  apps/backend/tests/ride-hailing/admin-ride-hailing-order.scenario.test.ts
```

All commands passed. The full CaoCao callback scenario retains one unrelated payment-fixture failure while settling a
charge line; it is recorded above and remains outside this cancellation slice.

The reconciliation phase transaction and terminal final-settlement/Bill transaction were also tightened to acquire
Trade then Ride before reading or mutating local projections. Provider detail/final-settlement queries remain outside
those transactions. The locked binding is checked against the provider observation so a changed dispatch binding
aborts rather than applying a stale observation.
