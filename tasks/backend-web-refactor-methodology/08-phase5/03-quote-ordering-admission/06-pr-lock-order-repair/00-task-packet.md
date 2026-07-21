# 5-2.6 PR Lock-Order Repair

## Status

**Complete.** The full-backend scenario exposed a database deadlock even though
two different idempotency keys for the same PR/Offer issued only one provider
create. `CreateOrderAttempt.pr_id` had taken a parent-row key-share lock before
`attachOrderToPr` requested `FOR UPDATE` on the same PR. The repaired sequence
now yields the owner-level `409` loser rather than a database error.

## Objective

Restore the PR-owned serialized admission result without weakening at-most-once
provider dispatch or same-key replay.

## Decision

Within the foundation transaction, create the local Trade/Ride rows first,
then call the PR-owned attachment command (which locks and checks the PR), and
only then insert `CreateOrderAttempt`. On the loser path, re-read the attempt
after the PR conflict: the same key replays its durable result; a different
key preserves the PR-owned conflict. This keeps provider I/O after commit.
`PR_ACTIVE_ORDER_EXISTS_CODE` is exported from PR Contracts, so Trade does not
depend on a private PR error-message/string implementation.

## Verification

1. Different keys / same PR+Offer: one `CREATED`, one typed `409`, one
   provider create, no orphan Order/Attempt.
2. Same key / same command: both responses name the same durable attempt/order
   and cause one provider create. A concurrent loser may correctly observe
   `PROCESSING` before the winner stores its terminal result; a later replay
   must return that terminal result.
3. Same key / different command: typed idempotency conflict, never a provider
   retry.
4. Run the focused scenario, then the backend scenario suite.

All four focused CreateOrderAttempt scenarios and the complete backend scenario
suite pass after the repair.
