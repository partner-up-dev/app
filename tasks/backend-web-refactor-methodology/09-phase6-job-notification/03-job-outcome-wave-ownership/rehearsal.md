# D6-J-01 Superseded Rehearsal

The original rehearsal depended on a SQL `job_attempts` ledger and PR inbox
read markers. D6-J-02 withdrew both placements; no source slice may execute the
old migration order.

## Replacement Proof Obligations

1. Prove generic Job disposition and control transitions without adding
   business `UNKNOWN` or reconciliation states.
2. Emit one bounded, correlated O11y signal for each handler attempt; telemetry
   failure must not change Job control.
3. Prove `UNTIL_ACKNOWLEDGED` insertion, coalesced high-water, terminal-held
   reservation, stale ACK rejection, covering ACK release and next-generation
   reopen under concurrency.
4. Prove PR message behavior without `pr_message_inbox_states` or a
   `notification_waves` lifecycle.
5. Keep `notification_deliveries` as compatibility evidence until deployed
   O11y queryability, retention and alert/recovery parity are verified.
6. Migrate/archive/drop opportunity, wave, inbox and delivery persistence only
   under their explicit data-retention and rollback gates.

The executable rehearsal is
[`../04-job-observability-window-policy/rehearsal.md`](../04-job-observability-window-policy/rehearsal.md).
