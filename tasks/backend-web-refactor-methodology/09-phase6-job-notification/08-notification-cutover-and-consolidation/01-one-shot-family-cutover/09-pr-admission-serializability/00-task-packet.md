# `6-3.1c-2` — PR Active-Admission Serializability

## Status

**Locally complete (2026-07-22).** `6-3.1c-1` final focused verification is
recorded, and all covered active-admission writes now use the named PR-owned
serializable adapter. The focused real-Postgres matrix, backend type/lint and
the concurrent PR-type creation regression pass. `6-3.1d` may now begin; this
does not close the remaining atomic Notification-family work.

## Objective

Make the PR row the local serialization point for every transition that changes
active capacity or its waitlist priority. Concurrent direct joins, waitlist
promotions and publish-time creator admission must not exceed `maxPartners`,
and a direct join must not leapfrog a currently eligible waitlisted
participant. The admission transaction must observe its own covered
eligibility facts rather than trusting a precomputed list from outside the
transaction.

## Source Facts

- The promoted-candidate transaction locks its PR row before capacity checks.
- Direct join currently counts then creates/reactivates a slot outside that
  lock; two paths can both observe the final free place.
- Publishing changes a DRAFT to OPEN before its creator slot is persisted,
  exposing a brief externally joinable state without the intended first active
  participant.
- The product rule promotes waitlisted users by earliest entry subject to
  current eligibility, so merely blocking on every pending row would change
  behavior when all pending candidates are currently ineligible.
- A PENDING insertion can currently race a direct join's unlocked queue read;
  a capacity release followed by such an insertion can let direct admission
  miss and bypass the new queue member.
- `UserReliabilityRepository.applyDelta` uses read-compute-write and can lose
  deltas from concurrent admissions on different PRs. Promotion also omitted
  the normal PR-type participation-frequency eligibility check.
- `update-pr-content` can release active slots without invoking the existing
  waitlist-promotion trigger. That is a separate capacity-release liveness
  gap which a direct join must not paper over by bypassing the queue.

## Target Boundary

- One named PR-owned, bounded-retry `SERIALIZABLE` admission adapter locks the
  PR row before every direct active admission, promotion, waitlist entry and
  publish-time creator admission. It atomically writes only the relevant slot,
  reliability delta and derived PR status; it never runs provider, Job,
  expansion or operation-log work in the transaction.
- Direct admission and promotion re-read the current pending sequence under
  that lock and evaluate queue eligibility from the transaction's own facts.
  The first eligible pending participant wins priority. An ineligible head may
  be skipped; an unknown or newly visible candidate cannot be treated as stale
  caller evidence.
- The user who is about to become active is read `FOR UPDATE` before the
  transaction rechecks active-user status and cross-PR participation facts.
  Every covered active-admission path follows that order, so a disable or
  concurrent covered admission cannot slip between the final check and slot
  write. Queue candidates that are not selected are evaluated as a
  serializable observation, not locked in arbitrary queue order.
- Publish persists `createdBy` when needed, DRAFT → OPEN, the creator's active
  slot and the same reliability delta in one PR-owned transaction. System
  `create-open` paths without a creator remain intentionally creatorless and
  do not fabricate one.
- Reliability deltas become one atomic SQL update. Capacity-release callers
  retain their post-commit promotion shape; the content-edit release path is
  added to that trigger family, but process death between a release and later
  promotion remains a separately tracked recovery problem.

## Exit

Real Postgres concurrency tests leave active count at or below capacity for
parallel direct joins and direct-join/promotion races. A pending eligible
candidate wins priority; an ineligible head does not block the next eligible
candidate or an otherwise valid direct admission. Publish has no observable
OPEN-without-creator-slot state, repeated direct admission produces no duplicate
slot, and concurrent reliability deltas are retained.

## Non-Goals

- no whole exit/temporal/admin transaction;
- no generic outbox or automatic capacity-release recovery claim;
- no change to provider/channel behavior.
- no claim that unrelated PR-type-config edits or cross-PR expansion-location
  quotas are serialized by this PR admission protocol.
