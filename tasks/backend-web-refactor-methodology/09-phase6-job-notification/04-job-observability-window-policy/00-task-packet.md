# D6-J-02 — Job Observability And Windowed-Creation Policy

## Status

**Ratified by Sir on 2026-07-22; durable-doc promotion complete.** This packet
incorporates Sir's corrections that pure attempt history belongs in
observability, a notification wave is a Job creation/scheduling strategy, and
the current backend-authoritative PR read/unread state should be retired.

It does not authorize application, schema, migration, telemetry-backend, or
runtime changes.

## Questions

1. What attempt state must remain durable for control/recovery, and what can be
   emitted only as observability?
2. Can “one notification per unread wave” become a Job creation mode whose
   dedupe reservation outlives Job execution until explicit acknowledgment?
3. Does any independently useful PR read/unread product state remain after that
   move, or can `pr_message_inbox_states` be removed entirely?

## Working Conclusion

- Per-attempt **history** is observability, not a new `job_attempts` table.
- Job retains only state needed to control or recover execution: attempt count,
  lease, current/terminal status and a bounded generic execution error/reason.
  It does not own provider-effect uncertainty or another business
  reconciliation state.
- PR-message wave becomes `UNTIL_ACKNOWLEDGED` Job creation mode. Its dedupe
  reservation remains held after `SUCCEEDED/FAILED` until an explicit semantic
  acknowledgment releases it. Coalesced messages atomically raise the window's
  high-water cursor; an ACK releases only when it covers that high-water.
- The current web has no visible consumer of persisted `hasUnread`; its read
  marker mainly drives notification-wave gating. The target removes the whole
  `pr_message_inbox_states` table, not merely its `lastNotifiedMessageId`
  column, and explicitly retires the current durable read-marker/unread-summary
  contract. This is a product-contract migration, not a schema-only cleanup.
- If a future PR-message product needs bounded per-message viewing membership,
  the default representation is a message-owned `viewedByUserIds` set. A new
  relation must first prove independent identity/lifecycle, unbounded scale,
  query, concurrency, retention, or integrity needs.

## Artifacts

- `evidence.md`: current attempt observability and inbox-state use inventory.
- `target-model.md`: Job control/O11y split and windowed creation API.
- `decision-log.md`: ratified decisions and representation rule.
- `discussion-log.md`: corrections, counterexamples, and final owner model.
- `durable-promotion-log.md`: promoted durable truths and compatibility notes.
- `rehearsal.md`: races, migration obligations, and low-cost proofs.
