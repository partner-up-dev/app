# D6-J-02 Rehearsal

## Behavioral Scenarios

1. The first eligible new message inserts one held-window Job.
2. More messages before due time dedupe into the same Job; execution recomputes
   content from persisted messages.
3. More messages after Job success but before acknowledgment still do not
   create another Job because reservation remains held.
4. Explicit acknowledgment covering the current `highWaterCursor` releases the
   window; the next message creates a new generation.
5. Message 10 opens a window, message 11 coalesces and raises high-water, and an
   ACK through 10 cannot release the window. An ACK through 11 can.
6. If ACK through 10 commits before the atomic message-11/source+reservation
   transaction, message 11 creates a new generation when that transaction
   commits. A committed/visible message 11 can never be waiting on a separate
   delayed coalesce. If the message-11 transaction commits first, ACK through 10
   sees raised high-water and leaves the generation held.
7. Acknowledgment before due time marks pending/retry work `CANCELED`; a running
   handler revalidates immediately before provider I/O and may return
   `SKIPPED`.
8. Provider retry produces multiple telemetry attempts but only one current Job
   control state.
9. Provider-ambiguous outcome persists `UNKNOWN` only when the semantic owner
   has independently valuable reconciliation state, as RideHailing does. Pure
   Notification attempt uncertainty remains O11y. Job reaches a generic
   non-retrying terminal state; losing the trace must not cause replay.
10. Terminal-Job retention cannot delete a still-held reservation; PR/recipient
   invalidation explicitly releases or cancels it.

## Proof Gates

| Gate | Cheapest credible proof |
| --- | --- |
| execution state and reservation are independent | pure state-machine table tests |
| held-key scheduling is concurrency-safe | isolated Postgres concurrent insert/coalesce/ACK tests with partial uniqueness and both commit orders |
| no persisted inbox row is required | cross-unit PR-message scenario covering open, coalesce, stale ACK below high-water, covering ACK, and reopen |
| no promised read/unread behavior is silently lost | contract diff for thread response/read-marker API plus explicit Sir decision |
| hidden fetch does not acknowledge | web unit/component test proving only visible-thread effect sends acknowledgment |
| telemetry replaces SQL diagnosis | fake handler emits correlated attempt events; operator query fixture covers retry/failure and correlates any owner-local unknown state |
| telemetry loss cannot change control | handler/provider ambiguity test with telemetry sink disabled, proving owner state blocks replay |
| migration preserves target windows | new atomic cutover establishes held/released reservations; inconsistent old opportunity/wave/inbox data is explicitly archived rather than reconstructed from current Job state |

## Important Race

Acknowledgment and provider send cannot be made globally atomic. The target can
reduce the window by revalidating the held reservation immediately before the
provider call, just as current code revalidates the read marker. The product
contract must tolerate a notification already in flight when the user opens the
thread.

## Closed PR Read-State Decision

- **Ratified:** retire the current read/unread contract. Job stores/releases its
  creation reservation; remove the inbox table, response fields and general
  read-marker semantics. Keep an explicit semantic notification-window ACK.
- **Rejected:** retain a backend-authoritative thread cursor. It is not required
  by the current product, and a future bounded per-message viewed set would be a
  message-owned fact rather than a thread-level `lastRead` relation.
