# D6-J-01 Superseded Target Model

This file preserves the disposition of the intermediate D6-J-01 model; it is
not an executable target or acceptance contract.

## Withdrawn Placements

D6-J-01 originally proposed:

- a durable `job_attempts` table for every handler attempt; and
- PR inbox/read markers as the unread-wave source of truth.

Sir's D6-J-02 correction superseded both. Pure attempt history is diagnostic
O11y, and PR-message frequency control is a Job creation reservation rather
than read/unread state.

## Active Target

1. Job owns current execution/recovery facts only: schedule, claim, lease,
   attempt count, retry, terminal state, bounded generic reason and creation
   reservation.
2. A handler returns only `SUCCEEDED`, `SKIPPED`, `RETRYABLE_FAILURE` or
   `PERMANENT_FAILURE`. Job has no provider `UNKNOWN`, `INTERRUPTED` business
   interpretation or `RECONCILIATION_REQUIRED` state.
3. Attempt-by-attempt history is emitted through a correlated O11y contract.
   The first source sink is a bounded structured log; traces/metrics are claimed
   only when real sinks exist.
4. Provider-effect uncertainty is first persisted on Notification,
   RideHailing or another semantic owner, then mapped to a generic non-retrying
   Job result.
5. `PR_MESSAGE` uses `UNTIL_ACKNOWLEDGED`: execution terminality and a HELD
   creation reservation are orthogonal; coalesced messages advance high-water,
   and only a covering semantic ACK releases it.
6. `notification_opportunities`, `notification_deliveries`,
   `notification_waves` and `pr_message_inbox_states` are compatibility stores
   to retire after their individual migration/proof gates close.

The authoritative target and rehearsal are
[`../04-job-observability-window-policy/target-model.md`](../04-job-observability-window-policy/target-model.md)
and
[`../04-job-observability-window-policy/rehearsal.md`](../04-job-observability-window-policy/rehearsal.md).
