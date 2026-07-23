# `6-3` Implementation Rehearsal

## Shared Change Sequence

1. Extend Notification's private policy/dispatch registries one template at a
   time; do not expose new Job/provider fields from the domain root.
2. For a recoverable family, first implement its pure current-state
   reconciliation and cancellation rule, then cut a single caller and prove it
   before moving to the next family.
3. Before an atomic-required family, add the narrow transaction-bound bridge
   and prove writer failure rolls back owner state. Reuse that bridge only after
   the original owner's causation/recipient facts are explicit.
4. Keep old `wechat.*` definitions registered; no new caller schedules them.
   Record per-type drain/migration rather than deleting a handler during a
   source cutover.
5. For PR-message, make the PR transaction write the message and every
   currently eligible recipient reservation. The message must not commit if a
   required reservation cannot be created/raised.
6. Add message-cursor/tombstone and lifecycle release behavior before enabling
   visible ACK. Then add the Web path as the only new ACK initiator.
7. Do not create a destructive migration until runtime inventory, archive and
   old-runner drain gates are separately evidenced.

## Stop / Replan Conditions

- A recoverable reconciliation needs a PR mutation, source event or guessed
  historic recipient snapshot.
- A transaction bridge lets a caller choose a generic Job field or becomes a
  reusable arbitrary cross-domain callback.
- A PR message can become visible before every required reservation write
  commits.
- A cursor becomes unacknowledgeable after a normal admin operation.
- A legacy Job could still claim after its handler/state dependency is removed.
- A proposed table drop lacks operator inventory, archive retention or old
  runner drain evidence.
