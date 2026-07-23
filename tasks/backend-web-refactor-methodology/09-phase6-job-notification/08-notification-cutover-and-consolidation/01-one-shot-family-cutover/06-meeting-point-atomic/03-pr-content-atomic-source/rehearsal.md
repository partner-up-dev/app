# `6-3.1f-03` Rehearsal

- Updating only a title makes no effective-point delta and emits no task.
- Updating location may switch between type/location, type and POI fallback;
  the bridge compares transaction-local before/after effective values.
- A combined time-and-meeting-point edit with preflighted conflicts marks the
  relevant slots released inside the same transaction before it freezes the
  recipient roster. A handoff failure therefore restores both the old time and
  the old active slots; a success does not schedule a task for a released
  participant.
- A slot that ceased to be active after preflight is conditionally skipped by
  the transaction instead of being overwritten as `RELEASED`; only actual
  release writes receive post-commit reminder cancellation and promotion work.
- A writer failure on an otherwise simple explicit-meeting-point edit rolls
  back the PR field and every task. This avoids claiming atomicity through a
  mock alone.
- Temporal refresh is not a fourth meeting-point source. If it creates a
  PR-ready effect, it remains governed by its own already-migrated bridge.
- Reminder cancellation/reconciliation, waitlist promotion, PR messages and
  alternative reminders execute only after the source transaction commits;
  this slice does not claim that their legacy/global writes roll back with the
  core mutation.
