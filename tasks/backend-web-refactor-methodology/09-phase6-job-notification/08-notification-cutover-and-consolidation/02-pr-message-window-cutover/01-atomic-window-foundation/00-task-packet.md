# `6-3.2a` — PR-Message Atomic Window Foundation

## Status

**Complete.** All three ordered children are locally complete: the private
owner/window contract, real-Postgres atomic persistence source, and producer
cutover/legacy-row drain. The next ordered slice is `6-3.2b`, which owns
cursor/tombstone and lifecycle invalidation rather than another source path.

## Objective

Bind `pr.message-summary` to the generic Notification owner and Job
`UNTIL_ACKNOWLEDGED` reservation. A PR-owned transaction must persist a message
and all currently eligible recipient HELD/high-water writes together.

## Boundary

- Preserve the current five-minute debounce.
- No inbox/wave/opportunity/delivery write belongs to the new path.
- The old message Job and its inbox dependency remain registered for pending
  legacy rows.

## Exit

First message opens one held window per eligible recipient; later messages
raise high-water even after execution terminality. An injected reservation
write failure rolls back the message itself. Current producers create neither
new legacy state nor concrete PR-message Jobs, while a historical row remains
drainable.

## Child Order

1. [`01-owner-window-contract/`](./01-owner-window-contract/) (`6-3.2a-1`)
   adds the private Notification/Job window policy, source-time eligibility
   seam and generic dispatch recheck.
2. [`02-atomic-persistence-source/`](./02-atomic-persistence-source/)
   (`6-3.2a-2`) has made and real-Postgres-proven the internal named PR
   transaction for a message and every eligible reservation.
3. [`03-producer-cutover-legacy-drain/`](./03-producer-cutover-legacy-drain/)
   (`6-3.2a-3`) moves participant, admin and content-generated producers to
   that path, proves the database matrix, and leaves the old concrete handler
   as pending-row-only drain.

The split is intentional: policy/runtime, source atomicity and producer
replacement have different failure proofs. No child borrows another's result.
