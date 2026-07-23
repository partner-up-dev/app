# `6-4` Verification Log

Date: 2026-07-23

## Result

**Pass.** A qualifying RideHailing Bill settlement now creates one
deterministically keyed `ride-hailing.fee-confirm.v1` Job in the same database
transaction. Provider I/O begins only after that transaction commits and
JobRunner executes the task.

## Contract And Topology Evidence

- The first-party CaoCao contract review establishes that both allowance
  fields are optional. The adapter capture proves the request contains
  `order_id` and omits `allowance_amount` and `cao_allowance_amount`.
- The task payload contains only `schemaVersion` and stable `orderId`; current
  provider binding is reloaded at execution.
- The exact BillLine compare-and-set, all-charges-paid decision and
  `scheduleOncePerCause` call share the named RideHailing reconciliation
  transaction.
- Creation identity is deterministic by Bill. The Job writer serializes that
  identity, and the database has a partial unique index on
  `(job_type, creation_key)` for `ONCE_PER_CAUSE`.
- The generic transaction-bound writer has a real-Postgres rollback scenario.
  This proves Job insertion participates in its caller-owned transaction.
- The old synchronous Trade fee-confirmation consequence is absent.
- The Job handler returns only generic dispositions. It adds no
  `RECONCILIATION_REQUIRED`, `UNKNOWN` or other RideHailing business state to
  Job.

## Executed Proof

- Paid terminal settlement: one pending Job, exact replay remains one Job,
  provider call count is zero before JobRunner and one after successful run.
- All-zero terminal Bill: the already-settled Bill creates one Job without a
  payment callback; provider I/O again occurs only through JobRunner.
- Handler unit proof covers successful context reload, missing source,
  permanent invalid context and retryable provider failures.
- CaoCao adapter proof covers `order_id`-only serialization and absence of
  provider stdout diagnostics.
- `pnpm test:unit:backend`: 108 files, 495 tests passed.
- `pnpm test:scenario:backend`: 45 files, 137 tests passed.
- `pnpm test:scenario:system`: 11 files, 38 tests passed.
- `pnpm check:static`: passed, including database checks and backend/web builds.

## Evidence Boundary

There is no fee-specific concurrent `Promise.all` scenario or per-write
fault-injection seam. Phase 6 relies on the stronger owner topology plus the
generic real-Postgres transaction rollback, advisory serialization and
database uniqueness proof. A fee-specific duplicate-race test remains optional
hardening; it is not evidence for provider exactly-once behavior.

Sir explicitly accepts a repeated provider effect when a successful
`feeConfirm` response is lost, and excludes historic-row recovery. No operator
ambiguity workflow or backfill was added.
