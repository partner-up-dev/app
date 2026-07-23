# `6-3.2b-1` Rehearsal

- `PRMessage.id` is already the ordering source used by held Job windows. A
  nullable tombstone preserves that identity without changing the key format.
- `latestVisibleMessageId` may become lower than `acknowledgementCursor` after
  deleting the highest visible item; this is expected and must be represented
  rather than coalesced away.
- The existing read-marker endpoint currently validates a visible message. It
  stays a compatibility endpoint in this child. Future semantic ACK validation
  must use an all-row PR-owned cursor lookup and is intentionally deferred.
- At this preflight point, admin delete remained physical until `6-3.2b-3`
  could replace it with a transaction that also invalidates held work; that
  lifecycle child is now complete. The retained lesson is that an isolated
  storage-route switch would otherwise preserve the leak under a different
  form.
