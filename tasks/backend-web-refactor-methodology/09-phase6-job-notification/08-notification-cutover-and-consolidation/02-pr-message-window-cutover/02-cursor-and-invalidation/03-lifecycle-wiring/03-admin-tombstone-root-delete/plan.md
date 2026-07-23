# `6-3.2b-3.3` Plan

1. Create a named admin-message transaction: lock PR → active roster, use the
   visible-only message lookup to preserve existing repeated-delete `404`
   semantics, tombstone the row, release each current recipient's exact window,
   then commit/rollback as one unit.
2. Create a named root-delete transaction: lock PR → capture/lock the
   still-active recipient set and total partner count, invalidate through
   Notification, then invoke the destructive cascade. Emit the existing
   operation log only after the commit.
3. Retain D08's one-deployment-unit rule; if live runtime evidence contradicts
   it, stop for a separately approved Notification-owned operational inventory
   rather than adding a PR-payload Job query.
4. Prove tombstone cursor/visibility plus reservation release and injected
   release-failure rollback. Prove root delete leaves no current-recipient held
   window after commit even though its generic job row has no PR foreign key.
