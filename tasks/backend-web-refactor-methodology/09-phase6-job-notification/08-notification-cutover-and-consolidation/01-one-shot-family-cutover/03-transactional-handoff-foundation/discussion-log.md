# `6-3.1c` Transaction-Bound Handoff Discussion Log

## 2026-07-22 — Read-only topology and atomicity boundary

### Evidence

- Waitlist promotion currently changes the slot first and performs reliability,
  PR-status, generic waitlist Job and other side effects afterward.
- The current failure scenario deliberately shows the resulting debt: a failed
  global `scheduleOncePerCause` leaves the candidate promoted.
- The generic Job layer already has a transaction-bound writer with its own
  creation-key advisory lock. The Notification runtime adapter is what currently
  selects the global, self-transactional JobRunner path.
- The three sources that trigger promotion (exit, temporal release and admin
  release) have already committed the mutation that freed capacity before they
  enter the shared waitlist service.

### Chosen shape

Use one short transaction for one candidate, not one transaction for each
entire caller flow. It encloses the candidate transition and its generic Job,
and it takes a PR-row lock before recomputing capacity/FIFO facts. Post-commit
effects retain their separate lifecycle and will be migrated in their own
slices.

### Rejected shapes

- Wrapping exit/temporal/admin end-to-end would widen a recovery slice into
  unrelated state transitions without evidence that users require all-or-nothing
  behavior there.
- A public `requestNotification(..., transaction)` or raw Job writer would make
  callers choose infrastructure mechanics.
- A direct-SQL waitlist transaction adapter would duplicate authoritative slot,
  reliability and PR-status behavior instead of reusing named repositories.

## 2026-07-22 — Post-implementation review: admission and event-identity gaps

### Evidence

- Direct join reads capacity and writes/re-activates an active slot without the
  PR-row lock used by the promoted-candidate transaction. A direct join and a
  promotion can therefore both observe the final free place.
- `PartnerRepository.findReusableInactiveByPrIdAndUserId` deliberately reuses
  historical slots. The initial generic waitlist Job key used only
  recipient/PR/partner ids, so a second waitlist promotion of that same slot
  coalesces permanently with the first causal Job.
- Generic waitlist dispatch revalidates only that the slot is currently active.
  Without a cycle identity, an old delayed Job can also look valid after a
  leave → re-waitlist → re-promotion loop.
- The root-exported transaction-bound Notification factory accepted an optional
  clock. That let an integration caller indirectly choose a Job's run time;
  the factory is narrowed to a writer-only public input.

### Resulting slice boundary

The first atomic handoff stays narrow and proven. Two P1 successors own the
new facts instead of broadening it silently:

1. `6-3.1c-1` gives each waitlist entry a durable cycle identity, carries it in
   new generic task payloads and fences stale dispatch.
2. `6-3.1c-2` serializes every PR path that creates an active slot and makes
   direct admission respect an eligible pending queue.

The liveness gap between a capacity release and a later candidate-promotion
attempt remains a separately named recovery design question; no claim of an
end-to-end release/outbox guarantee is made by this handoff slice.
