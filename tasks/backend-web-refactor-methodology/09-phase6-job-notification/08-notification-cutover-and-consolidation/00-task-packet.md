# `6-3` — Notification Cutover And Redundant-State Consolidation

## Status

**Locally complete on 2026-07-23.** `6-2`, `6-3.1a` activity-start, `6-3.1b` confirmation
recovery, `6-3.1c` core, `6-3.1c-1`, `6-3.1c-2`, `6-3.1d`, `6-3.1e`, and
`6-3.1f` meeting-point and `6-3.1g` waitlist-alternative have completed their
focused source proof. All `6-3.2a` owner/window, atomic-persistence and
producer/drain children are locally complete; all `6-3.2b`
cursor/tombstone, generic invalidation, and lifecycle-wiring children are now
locally complete. A review-found
[`6-3.1h` transaction-owner-surface closure](./00-transaction-owner-surface-closure/00-task-packet.md)
ensures no source domain keeps a direct Job-writer edge. `6-3.2c` visible ACK
and overlap proof are locally complete. `6-3.3` applied Sir's explicit forward
cut-off: old Job/client inventory, decoder drain, archive and sunset proof did
not gate source/schema retirement. Opportunity/wave/inbox state, all concrete
per-kind handlers/decoders, and the remaining no-cycle generic compatibility
shape are retired; `notification_deliveries` alone is retained for Phase 7.

## Objective And Hypothesis

Migrate every remaining Notification family onto the owner surface proven in
`6-2`, then retire the persistence and cross-domain edges whose behavior is now
owned by Job creation control, Notification semantics or O11y.

This is split into three ordered sub-tasks, each with its own folder:

1. [`01-one-shot-family-cutover/`](./01-one-shot-family-cutover/)
2. [`02-pr-message-window-cutover/`](./02-pr-message-window-cutover/)
3. [`03-legacy-state-retirement/`](./03-legacy-state-retirement/)

## Scope Boundary

- all remaining one-shot Notification callers/handlers;
- per-template atomic-or-recoverable task handoff classification;
- atomic PR-message commit + `UNTIL_ACKNOWLEDGED` coalesce/ACK behavior;
- Web mounted/rendered/visible-thread semantic ACK with same-cursor retry and
  removal of read-marker coupling;
- opportunity/wave/inbox retirement;
- concrete legacy Job/scheduler retirement under the accepted cut-off;
- explicit retention of `notification_deliveries` for future O11y replacement.

`notification_deliveries` is deliberately not dropped in `6-3`. Its final
retirement is deferred beyond Phase 6 until real observability infrastructure
proves queryability, retention, correlation, alert and recovery coverage.

## Packet Files

- `spec.md`
- `plan.md`
- `rehearsal.md`
- `verification-plan.md`
- `entry-evidence.md`
- `decision-log.md`
- `slice-map.md`
- `implementation-rehearsal.md`

Each sub-task folder owns its own `00-task-packet.md`, `plan.md` and
`rehearsal.md`; parent files hold only the shared contract and cross-sub-task
order.

## Exit Shape

Business callers import only Notification's public surface; all current kinds
execute through the generic handler; PR-message frequency control uses Job
reservation/ACK without inbox/wave state; old opportunity/wave/inbox models and
their dead lifecycle code are removed; delivery attempts remain an explicitly
bounded compatibility ledger for a later observability phase.
