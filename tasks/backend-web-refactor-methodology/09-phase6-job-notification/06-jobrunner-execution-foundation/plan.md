# `6-1` Execution Plan

## Ordered Batches

1. **Characterize before mutation**
   - freeze current scheduling, timing-bucket, missed, retry, lease-expiry,
     active-dedupe and unknown-handler behavior in focused tests;
   - record the nine source registrations and obtain a pre-deploy inventory of
     live pending/retry/running type + payload shapes;
   - extract an injectable runner factory with clock and store seams
     while preserving the current singleton.
2. **Introduce contracts without cutting over producers**
   - add versioned Job definition/payload decoder and structured disposition;
   - add a legacy adapter so current handlers remain executable;
   - move registration assembly to an explicit composition-root surface.
3. **Add the persistence seam and forward-only schema**
   - add a pure executor-aware Job repository/store and keep orchestration in
     JobRunner;
   - add job version, last disposition/reason, claim token, creation mode/key/
     state, window start/high-water and release fields;
   - add separate partial uniqueness for `ONCE_PER_CAUSE` and one HELD
     reservation; do not repurpose legacy active dedupe;
   - define existing-row defaults and rollback/forward-fix behavior.
4. **Implement creation operations**
   - ordinary one-shot scheduling and terminal-safe one-per-cause creation;
   - atomic create-or-coalesce with monotonic high-water;
   - covering ACK release and next-generation reopen;
   - ACK pending/retry through durable cancellation rather than physical delete;
   - add a transaction-bound writer for named integration adapters and protect
     HELD rows from future retention.
5. **Move execution to structured dispositions**
   - preserve claim transaction and handler-outside-transaction topology;
   - issue a unique token per claim and fence every result update;
   - map the four dispositions to generic retry/terminal control;
   - persist explicit `SKIPPED` and pre-invocation `CANCELED` outcomes;
   - keep timing/missed and lease recovery semantics explicit.
6. **Keep the attempt-observability boundary honest**
   - retain durable generic execution facts on Job;
   - add no console/stdout sink and no `job_attempts` table;
   - defer correlated attempt signals to a real observability phase.
7. **Preserve built-in registrations through the compatibility boundary**
   - retain the nine legacy job-type handlers through the explicit v1
     return/throw adapter while their Notification owner surface is built;
   - keep registration assembly in the backend composition root and verify
     health/maintenance diagnostics still describe registered work;
   - do not falsely label a legacy handler as structured merely because the
     core can consume structured dispositions. Per-template typed cutover is
     owned by `6-2` / `6-3`.
8. **Validate and update packet evidence**
   - run the narrow gate first, then backend static/unit/scenario gates;
   - record schema, concurrency and compatibility results before opening `6-2`.

## Stop Conditions

- A migration cannot preserve current pending/retry rows.
- A live Job type/payload has no decoder, drain or verified migration.
- The reservation needs business-specific columns or Job reason inspection.
- Completion can mutate a row without a current lease-token CAS.
- A cursor can become externally ACKable before its reservation high-water
  commits.
- A handler retry would repeat an external effect without owner/idempotency
  proof.
- O11y availability starts controlling task state.
- Postgres concurrency tests cannot reproduce the intended serialization.

Any stop condition returns the slice to design/diagnose; it is not permission
to add a generic outbox, business Job state, public transaction executor or a
second attempt ledger.

## Implementation Record — 2026-07-22

1. Batches 1–6 are implemented and corrected. The singleton now composes an
   injectable runner and Postgres store; the generic runner imports no
   business owner and emits no console telemetry.
2. Migration `0089_jobrunner_execution_foundation.sql` adds version, lease
   token, generic disposition/reason and creation-reservation fields plus the
   two separate partial uniqueness rules. It is additive; legacy rows read as
   v1 `ONCE` rows.
3. `ONCE_PER_CAUSE`, `UNTIL_ACKNOWLEDGED`, covering ACK, durable cancellation,
   per-claim CAS and transaction-bound writer behavior are proven locally
   against the isolated Postgres scenario database.
4. At the Batch 7 boundary, all nine entry-snapshot registrations remained
   executable through v1 adapter semantics. `6-3` later retired the eight
   concrete Notification types; the official-account Job still uses its
   current non-Notification adapter.
5. Batch 8 local gates are recorded in `verification-log.md`. Sir's explicit
   forward cut-off waives active-old-Job/old-runner inventory as a Phase 6 gate.
