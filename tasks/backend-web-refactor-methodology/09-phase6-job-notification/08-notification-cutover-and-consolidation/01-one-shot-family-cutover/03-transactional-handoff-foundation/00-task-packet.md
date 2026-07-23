# `6-3.1c` — Transaction-Bound Notification Handoff Foundation

## Status

**Core source implementation and local proof are complete (2026-07-22), with
two P1 successor slices now explicitly gated before direct-join/new-partner
work.** Read-only topology evidence, the transaction boundary and the failure
proof are frozen below. This slice closes only the waitlist-promotion →
`pr.waitlist-promoted` handoff debt; it does not make later new-partner or
reminder side effects atomic.

The implementation review established that a correct candidate handoff alone
does not prove whole-admission correctness: reusable slots need a fresh
waitlist-cycle cause, and every active-admission path must honor the same PR
row lock. Those are tracked in the sibling packets `08-…cycle-causation` and
`09-…admission-serializability`, rather than being hidden as follow-up notes.

## Objective

Introduce the narrow integration used only by atomic-required owner mutations:
a caller-owned PR transaction can ask Notification to apply its private policy
through a transaction-bound Job writer. Close the existing waitlist-promotion
handoff debt as the proof vertical.

## Guardrail

The public Notification request remains semantic-only. This child does not add
a raw transaction, Job type, key, provider field or generic callback to that
public contract; it creates one named PR/Notification integration seam.

## Frozen Boundary Decisions

- Each promoted candidate gets one short, caller-internal transaction. It
  atomically contains the conditional pending-slot promotion, its reliability
  delta, derived PR status update and the generic `ONCE_PER_CAUSE` Job write.
  It does not wrap the already-committed exit, temporal-release or admin-release
  mutation that discovered capacity.
- The transaction takes a PR-scoped row lock before it re-reads capacity and
  FIFO eligibility. This serializes competing promotion attempts for that PR;
  the existing Job creation-key advisory lock remains responsible for the
  per-cause Job reservation.
- Notification receives only the ordinary semantic waitlist-promoted request
  through a named transaction-bound integration port. Public Notification
  contracts expose neither a database transaction nor Job mechanics.
- Named executor-aware repository seams carry the transaction through PR slot,
  reliability and PR-status operations. This reuses their existing authority
  rather than duplicating direct SQL in a new waitlist adapter.
- Provider I/O and post-commit business effects remain outside this transaction:
  legacy new-partner scheduling, recoverable activity/confirmation rebuilding
  and operation logging are not evidence for this atomic handoff.

## Local Evidence

- An injected transaction-bound Notification write failure leaves the candidate
  `PENDING`, leaves reliability unchanged and inserts no generic Job.
- A successful real Postgres path writes one `notification.send.v1` Job in the
  same transaction as the candidate promotion; a repeated same-cause request
  coalesces.
- The lock-bound FIFO revalidation preserves the established behavior that a
  candidate already checked as ineligible does not block the next eligible
  candidate.
- Backend type/lint checks and the backend scenario project passed after the
  implementation batch. Final durable promotion is deliberately held until
  the cycle-causation and admission-serializability P1 successors close.

## Current Topology Evidence

- `promoteWaitlistedPartners` currently conditionally promotes a slot and then
  calls reliability/status/task/other effects in separate operations.
- The generic waitlist policy is already correct (`notification.send.v1`, v1,
  `ONCE_PER_CAUSE`, private creation key), but its runtime scheduler opens its
  own Job transaction.
- `JobTransactionWriter` already provides a caller-transaction-bound
  `scheduleOncePerCause` with a creation-key advisory lock; the missing link is
  the narrow Notification adapter plus a PR transaction repository seam.
- The existing failure scenario intentionally proves the old debt: after a
  global scheduler failure, the candidate is still `JOINED`. This slice must
  invert that proof for the named transaction writer.

## Exit

An injected Job-write failure rolls the promoted candidate transition back to
its pre-promotion state; success commits the promoted slot and exactly one
generic causal Job together.

## Non-Goals

- no whole-command transaction around exit, temporal refresh or admin release;
- no generic cross-domain transaction helper, outbox or public raw writer;
- no provider/channel call inside a database transaction;
- no change to legacy pending Job registration/drain behavior.
