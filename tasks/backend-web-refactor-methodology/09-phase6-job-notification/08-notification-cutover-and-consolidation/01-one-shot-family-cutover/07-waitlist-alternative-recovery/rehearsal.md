# `6-3.1g` Rehearsal

- Calling temporal refresh from an eligibility query can promote/release a slot
  while merely trying to send a notification; stop on any such call chain.
- A source slot that is no longer pending must skip, not recreate historical
  opportunity state.
- A provider ambiguity remains terminal on the generic path even though the
  legacy alternate handler retried it.
- A source Partner row can be cancelled and then re-enter PENDING with a new
  cycle. A task that only carries the row ID would wrongly become valid again;
  require and compare the current `waitlistCycleId` before channel I/O.
- A raw `OPEN` candidate can be temporally stale. The pure query must use only
  pure join-boundary predicates to veto it; it must never write READY/ACTIVE,
  release unconfirmed slots or promote waiters to make an eligibility answer.
- The legacy scheduler's active-only dedupe allows a later explicit current
  reconciliation after a terminal task. Preserve that with a private
  REPLACE_ACTIVE pair policy; do not switch to terminal-persistent
  ONCE_PER_CAUSE without an availability-generation fact.
