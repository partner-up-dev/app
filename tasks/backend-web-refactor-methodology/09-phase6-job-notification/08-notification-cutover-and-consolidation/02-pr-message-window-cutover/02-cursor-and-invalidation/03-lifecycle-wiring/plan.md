# `6-3.2b-3` Plan

1. **Complete — participant release:** established one PR-owned,
   transaction-bound recipient invalidation hand-off and use it at self exit,
   admin release, temporal unconfirmed release, and content-conflict release.
   The real-Postgres proof covers recipient precision, rejoin no-replay, and
   rollback on failed hand-off.
2. **Complete — terminal fences:** `CLOSED` / `EXPIRED` transitions
   capture the active roster and release it in the same transaction. Add
   terminal eligibility checks at source and dispatch without changing message
   posting/visibility compatibility. The real-Postgres proof covers manual
   close, temporal closed/expired selection, source-time no-reopen and generic
   plus legacy dispatch fences.
3. **Complete independently of 2 — admin delete:**
   tombstone one message and release its affected windows atomically; capture
   active recipients before a root-delete cascade and invalidate them before
   destructive persistence. The real-Postgres proof also covers tombstone
   cursor/visibility, retained Job release, repeated-delete `404`, and an
   injected rollback failure.
4. **Complete — subscription/provider controller:** replaced the controller's
   PR_MESSAGE repository mutation with the canonical Notification command;
   retained concrete historical job cancellation only as an explicit clear
   drain. Other kinds remain unchanged. `43101` cross-entrance proof remains
   part of b3.5.
5. **Complete — matrix/promotion:** the source-specific real-Postgres matrix,
   generic `43101` proof, full backend scenarios/unit/static/build gates and
   reverse-edge audit passed. Durable docs now distinguish completed lifecycle
   invalidation from the still-pending visible Web ACK/read-marker and legacy
   state-retirement slices.
