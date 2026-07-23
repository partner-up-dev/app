# `6-3` Mental Rehearsal

## One-Shot Branches

1. A business transition commits and its atomic-required task insert fails: the
   transaction rolls back or a named recovery fact remains; no silent task loss.
2. A recoverable-best-effort schedule fails: the caller observes/logs the
   bounded failure and the named reconciliation query deterministically
   recreates it; a log alone is not recovery.
3. Eligibility changes between scheduling and dispatch: handler skips using
   current truth, not stale payload.
4. A provider refusal clears limited credit: only Notification option state
   changes; Job receives a generic non-retrying outcome.
5. Old and new job types overlap during rollout: both route to behaviorally
   equivalent definitions without double-send.
6. WAITLIST_PROMOTED scheduling fails after promotion: until its atomic handoff
   lands, the named debt remains open; the `6-2` facade is not cited as proof.
7. Waitlist-alternative revalidation needs temporal refresh: its curated query
   returns current facts without invoking a PR mutation from Notification.

## Entry-Rehearsal Corrections

- Activity-start is the first cutover because its named reconstruction has one
  schedule and one causal key. Confirmation cannot silently reuse this proof:
  it has two different timing/tolerance contracts.
- New-partner, PR-ready, meeting-point and promoted are not allowed to use the
  recoverable reconciler pattern. Their exact causal facts/fan-out must enter a
  transaction-bound Job write with the business transition.
- A PR-message ACK is a covered attention-window operation, not a rendered
  read marker. A legacy marker during rollout cannot release the generic
  window.
- A hard delete of a high-water message makes a visible-only cursor
  unacknowledgeable; soft delete/tombstone plus an explicit acknowledgement
  cursor is therefore a prerequisite, not post-cleanup.

## PR Message Branches

1. Message 10 opens a window; 11/12 coalesce; one Job exists with high-water
   12.
2. Reservation insert fails while creating message 10: the named transaction
   rolls back the message, so no cursor becomes visible without high-water.
3. Job sends and becomes terminal; message 13 still coalesces because ACK has
   not released the reservation.
4. UI rendered only through 11 ACKs 11: reservation remains HELD at 13.
5. UI renders through 13 and ACKs 13: reservation releases; message 14 creates
   a new generation.
6. ACK happens before due time: pending work is `CANCELED` and later
   messages can reopen.
7. ACK races the provider edge: handler rechecks immediately before send; an
   already-started call is acknowledged as an unavoidable race, not described
   as exactly-once cancellation.
8. Hidden prefetch updates cache: no ACK is emitted.
9. Query data resolves while page is hidden or before render commit: no ACK is
   emitted. Visibility/render later permits the latest rendered cursor.
10. ACK request fails: the same cursor remains eligible for retry.
11. Recipient leaves or PR terminates: Notification releases/cancels without
   fabricating read state; rejoin plus a later new message opens a generation.

## Migration/Operations Branches

1. Existing inbox/wave rows disagree: they are archived as legacy compatibility
   data. Current Job rows are not falsely treated as an old read/notified
   authority, and no new wave entity is invented.
2. A pending legacy PR-message Job exists: compatibility decoder executes or a
   verified migration maps it to a held reservation before old registration is
   removed.
3. O11y misses an attempt during dual evidence: Job control remains correct and
   `notification_deliveries` stays until the observation gap is fixed.
4. Format/dead-code cleanup touches unrelated worktree changes: scope is
   narrowed; unrelated user files are not staged or reverted.

## Likely Traps

- Big-bang replacement of every kind before proving one family at a time.
- Updating only PR domain callers while controller schedule/cancel/rebuild
  side effects still import concrete notification infra.
- Describing ACK as read/viewed and recreating inbox semantics through names.
- Allowing a message to commit before required reservation writes.
- Letting execution terminality release the PR-message creation key.
- Deleting delivery rows because local logs exist, without deployed retention
  or query proof.
- Removing old handlers before pending rows are drained/migrated.
- Moving per-template switches into JobRunner instead of Notification policy.
