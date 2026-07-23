# `6-3.2b-3.3` — Admin Tombstone And Root Delete

## Status

**Implementation complete; awaiting the shared final lifecycle matrix.**
Participant release and the executor-facing Notification facade are locally
complete. This child shares no source mutation with terminal fencing; both
feed the final matrix.

## Objective

Convert admin message deletion to tombstone plus semantic window release in a
single transaction, and make admin PR deletion capture/invalidate affected
recipients before cascade.

## Exit

No admin destructive mutation can commit source-state disappearance while its
corresponding generic held window remains valid.

## Delivered

- A named serializable admin lifecycle transaction locks the PR and active
  roster before either tombstoning a visible message or deleting the PR root.
- Message deletion preserves the b1 cursor through tombstoning and retains the
  existing repeated-delete `404` contract.
- The transaction asks Notification to release only semantic
  `(recipient, PR)` windows, then root cascade occurs only after that release
  succeeds.
- The operation logs remain post-commit effects.

See `verification-log.md` for the real-Postgres proof and rollback injection.
