# `6-1` — JobRunner Execution And Creation-Reservation Foundation

## Status

**Locally complete.** The Job contract, additive schema and concurrency
behavior passed their focused and Phase 6 exit proof. Sir's forward cut-off
waived active-old-Job/old-runner inventory as an implementation gate. The
briefly added Job-attempt console sink was removed before Phase 6 exit.

## Objective And Hypothesis

Establish one business-semantic-free Job contract before Notification and
RideHailing migrate onto it. The Job module should be deep: producers provide a
validated/versioned task and receive scheduling/acknowledgment behavior;
JobRunner hides persistence, timing buckets, claim, lease, retry and terminal
control.

The hypothesis is that structured generic dispositions plus an orthogonal
creation reservation remove current return/throw ambiguity and PR-message wave
state without making Job own provider or product semantics.

## Owned Scope

- generic Job definition, payload validation and composition-root registration;
- additive Job persistence evolution and forward migration;
- claim-token-fenced lease/retry/missed/terminal control with generic
  `SKIPPED`/`CANCELED`;
- ordinary `ONCE`, terminal-safe `ONCE_PER_CAUSE`, and
  `UNTIL_ACKNOWLEDGED` HELD/RELEASED creation;
- insert/coalesce/high-water/covering-ACK concurrency;
- transaction-bound writer for named integration adapters;
- temporary entry compatibility for the then-current `wechat.*` and
  official-account Jobs; `6-3` later retired every concrete Notification Job
  while retaining the non-Notification adapter where still needed.

Primary source surfaces are `apps/backend/src/infra/jobs/`,
`apps/backend/src/entities/job.ts`, the Job repository/schema/migration path,
backend composition root and focused Job tests.

## Explicit Non-Goals

- no Notification template registry or caller cutover;
- no RideHailing fee-confirmation state;
- no `job_attempts` table;
- no Job `UNKNOWN`, `RECONCILIATION_REQUIRED` or provider-delivery state;
- no generic outbox, event bus or cross-domain transaction helper;
- no legacy Notification-table deletion.

## Packet Files

- `spec.md`: contract and acceptance invariants.
- `plan.md`: ordered mutation batches and compatibility order.
- `rehearsal.md`: failure/race pre-mortem.
- `verification-plan.md`: cheapest credible proof and widening gates.
- `compatibility-inventory.md`: historical static registration map; its
  proposed live-row gate was superseded by Sir's forward cut-off.
- `verification-log.md`: local result record, known environment limitation and
  remaining deployment gate.

## Exit Shape

`6-2` and later slices may use the stable Job surface. Job execution state stays
in the database; real attempt telemetry belongs to a future observability
phase.
