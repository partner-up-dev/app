# `6-3.1b` Rehearsal

- Treating both triggers as one task loses their timing precision; each has a
  distinct active prefix and schedule key, while all recipient/template/channel
  operations serialize through one coordination key.
- At request time, Notification reloads option plus the pure current scheduling
  projection. A disabled policy, missing trigger, stale slot, or past run time
  cancels the selected obsolete trigger instead of creating a Job.
- A PR time/policy edit can claim an old Job just before replacement. Dispatch
  receives the Job's private `runAt`, reloads current PR-owned anchors and
  derives the current trigger instant, then skips on mismatch before rendering,
  provider I/O, or credit consumption.
- A policy change may remove only `CONFIRM_END_MINUS_30M` while retaining
  `CONFIRM_START`; trigger-scoped cancellation must leave the other active
  task intact. Aggregate cancellation removes both for a participant/PR;
  recipient cancellation removes all such generic confirmation work.
- A user exits/releases after reconciliation but before dispatch: current slot
  lookup skips safely. A user renews credit after opt-out: recipient rebuild
  invalidates stale work first, enumerates current participation, then calls
  the ordinary reconciler rather than a legacy scheduler.
- A user successfully confirms a slot: current legacy behavior still considers
  that slot active and permits the reminder. This slice preserves it rather
  than making an unstated product decision; no `confirmSlot` cancellation is
  added.
- A legacy pending confirmation row still runs under its old handler. Source
  cutover never manufactures legacy work; its only temporary compatibility
  action is cancellation of old recipient rows on subscription changes.
- If a current scheduling/dispatch projection would need `refreshTemporalStatus`
  or another mutation to answer, stop: Notification may use only pure PR facts.
