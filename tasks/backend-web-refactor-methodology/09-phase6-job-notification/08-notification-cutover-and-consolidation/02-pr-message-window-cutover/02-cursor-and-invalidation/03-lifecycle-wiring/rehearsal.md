# `6-3.2b-3` Rehearsal

- Every PR lifecycle mutation takes `PR FOR UPDATE` first. A recipient/slot
  snapshot is then locked deterministically, Notification maps it to opaque
  keys, and Job serializes each exact key. A subscription mutation starts from
  the option-row lock instead; neither path may acquire the other's source
  facts after an incompatible order.
- Participant release must precede terminal/root-delete current-roster fan-out.
  Otherwise an already removed recipient has no source identity from which PR
  can request Notification invalidation. The b3.1 test must therefore cover
  rejoin: it may create a fresh later window, never revive the old one.
- Tombstone plus release must share a transaction. If the row becomes hidden
  first and release fails later, dispatch can observe no eligible visible
  context while the reservation remains held.
- A terminal source fence alone is insufficient because a previously created
  job can run later; a dispatch-time `PR_TERMINAL` disposition is also needed.
  It must suppress attention, not alter existing posting/visibility rules.
- An option re-enable is not a catch-up process. A test that sees a new Job
  before a subsequent message is a failure, even if the user now has credit.
- Historical concrete `wechat.notification.pr-message` jobs remain a drain
  compatibility path until `6-3.3`; lifecycle wiring must not delete their
  handler merely to make a source audit easier.
- A pre-b3 generic held window for a *former* participant is a finite
  compatibility case. Do not smuggle a PR payload scan into Job to make it
  disappear. The Notification-owned choice is explicitly captured before the
  admin-root-delete exit is marked complete.
