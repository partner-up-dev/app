# `6-3.1f-03` Plan

1. Map all content fields capable of changing the effective meeting point:
   explicit meeting point, location and type compatibility inputs. Keep the
   detector around the full core write, not only the meeting-point column.
2. Create a PR-specific serializable source port that locks/rereads the PR and
   uses transaction-local effective resolution before and after the write.
   Join cache invalidation and, when preflight produced release candidates,
   their slot-state/capacity/status writes before freezing the recipient roster.
3. Integrate it after existing validation without retaining a second
   post-commit scheduler. Keep reminder handling, promotion, messaging and
   alternative notifications explicitly post-commit, and record that boundary.
4. Add a real-Postgres scenario for user and admin success, no effective delta,
   rapid distinct updates and an adapter-injected handoff failure.

## Outcome

- Completed: `pr-content-meeting-point-transaction` is a named serializable
  source port. It owns the core/cache write, optional preflighted slot release,
  capacity/status writes, transaction-local effective observation, frozen
  roster and generic semantic handoff.
- Completed: both HTTP entry families reach the bridge; the old PR-content
  concrete scheduler call and global before snapshot are removed.
- Completed: real-Postgres scenarios cover user/admin fan-out, no effective
  delta, rapid UUID-distinct updates, core rollback and release-slot rollback.
- Deferred by design: reminder maintenance, promotion, message/inbox work and
  alternative notification scheduling retain their explicit post-commit
  protocols; sibling source cutovers remain `04` through `06`.
