# `6-3.2b` — PR-Message Cursor And Window Invalidation

## Status

**`6-3.2b-1` cursor/tombstone and `6-3.2b-2` generic
Job/Notification invalidation and `6-3.2b-3` lifecycle wiring are locally
complete.** The work is deliberately split so each child changes one
authoritative boundary and has a cheap proof.

1. [`01-cursor-tombstone/`](./01-cursor-tombstone/) — **complete**: preserve a
   monotonic PR-message cursor when an otherwise visible message is removed.
2. [`02-window-invalidation-foundation/`](./02-window-invalidation-foundation/)
   — **complete**: exposes neutral held-reservation release from Job, semantic
   PR-message invalidation from Notification, and the shared option-row
   serialization proof.
3. [`03-lifecycle-wiring/`](./03-lifecycle-wiring/) — make the named PR and
   preference/provider lifecycle mutations use those primitives atomically or
   through an explicit serialized boundary (**complete**). Its ordered
   participant-removal, terminal-fencing, admin-destruction,
   subscription/provider-conversion and matrix/promotion children are all
   locally proven; see its [packet](./03-lifecycle-wiring/00-task-packet.md).

## Objective

Make every held window safely acknowledgeable and releasable under ordinary PR
life-cycle changes. Replace physical high-water deletion with a PRMessage-owned
tombstone/cursor contract and give Notification a semantic invalidation path.
It also owns the explicit policy for an already-terminal HELD window when a
recipient opts out, later re-enables, or grants fresh WeChat credit: no path
silently replays history.

## Ratified Boundaries

- `PRMessage` owns durable message identity and the cursor that spans visible
  and tombstoned rows. `acknowledgementCursor` is the greatest message ID in
  the PR, including a tombstone; it is not an unread/read aggregate.
- Job owns only neutral reservation control: find a held
  `UNTIL_ACKNOWLEDGED` creation reservation under its own key lock, cancel a
  pre-invocation pending/retry execution if applicable, then release it. Job
  never accepts PR status, user preference, delete, or provider semantics.
- Notification owns the public semantic invalidation command, template-to-key
  mapping, recipient/aggregate scope, and preference/provider consequences.
  PR never constructs a generic Job key.
- A `CLOSED` or `EXPIRED` PR may retain its current compatibility visibility
  and message-posting behavior, but it cannot open or dispatch a new
  `pr.message-summary` attention window. Existing held windows are invalidated.
- A clear/opt-out releases current held work. A later `0 → positive` credit or
  re-enable clears any obsolete terminal generation but does not replay an
  absence-period message; a subsequent new message is the only rearm source.
- Legacy `GET` and `POST /read-marker` still read/write
  `pr_message_inbox_states` in the current compatibility surface. They are not
  semantic acknowledgement and are not retired here. `6-3.2c` completed the
  current Web semantic-ACK migration; `6-3.3` owns compatibility removal.

## Exit

The response returns a monotonic acknowledgement cursor independent of visible
message deletion. Tombstoning, opt-out, participant exit, PR terminal state,
provider permission loss and root PR deletion leave no invalid held reservation
through Notification's semantic path. The compatibility inbox/read-marker state
is neither consulted for this release nor claimed retired.

## Shared Evidence And Design Files

- [`decision-log.md`](./decision-log.md)
- [`implementation-topology.md`](./implementation-topology.md)
- [`verification-plan.md`](./verification-plan.md)
- [`plan.md`](./plan.md)
- [`rehearsal.md`](./rehearsal.md)
