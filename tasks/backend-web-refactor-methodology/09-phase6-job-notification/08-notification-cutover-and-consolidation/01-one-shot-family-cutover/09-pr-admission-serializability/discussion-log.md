# `6-3.1c-2` Discussion Log

## 2026-07-22 — Admission topology review

### Evidence

- Promotion already locks the PR row, but direct join counts and creates an
  active slot outside that lock; publish exposes OPEN before creator admission.
- A precomputed ineligible pending-id set cannot prove fairness: an ineligible
  candidate may become eligible after the outer scan, while a new PENDING row
  may arrive after direct join reads the queue.
- Candidate eligibility spans user state, active participation on other PRs,
  join gates and PR-type frequency. `applyDelta` also loses concurrent deltas
  because it writes absolute values computed from an earlier read.
- Content edit can release a slot without invoking promotion. This creates a
  liveness gap even after direct admission stops bypassing the queue.

### Chosen boundary

Use one named PR-owned serializable admission adapter, not a generic
transaction utility. It owns local capacity/queue ordering and rechecks
eligibility through its transaction executor. The actual entrant's user row is
locked to order disable and covered cross-PR admissions. Every active-add path
and waitlist entry uses the same PR lock protocol; non-admission side effects
remain after commit.

### Deliberate limits

This is not a claim that arbitrary policy-admin edits, location-cap expansion,
or a process crash after a capacity release are atomically reconciled. Those
facts retain their own owner/recovery decisions. The invariant here is that a
covered admission transaction cannot consume a PR capacity slot ahead of a
candidate eligible in its serialized observation.

## 2026-07-22 — Focused implementation review

The first broad scenario run exposed a legitimate serialization pattern rather
than a weakened invariant: several different PR publications for one creator
each lock their own PR first, then serialize through the same user row. Three
immediate attempts were insufficient for the fifth request's fresh snapshot.
The adapter now retains the prescribed lock order and uses at most eight short
backoff retries for PostgreSQL `40001` only. The real PR-type frequency fixture
now publishes all parallel setup PRs successfully; non-serialization failures
remain non-retryable.
