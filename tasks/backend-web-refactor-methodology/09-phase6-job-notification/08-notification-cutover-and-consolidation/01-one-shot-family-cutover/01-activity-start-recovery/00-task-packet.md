# `6-3.1a` — Activity-Start Recoverable Vertical

## Status

**Locally complete.** Generic owner/runtime capability, Job replacement,
PR caller cutover and recipient-subscription reconciliation are proven through
real backend scenarios. While old `wechat.notification.activity-start-reminder`
rows drain, the controller retains only the legacy **cancellation** bridge on a
subscription change to suppress those pending rows; it never creates or
rebuilds legacy activity work. Legacy registration stays until the drain gate
in `6-3.3`/`6-5` closes.

## Objective

Make `pr.activity-start-reminder` the first complete generic one-shot vertical.
It owns only the current-participant/PR-time reconciliation, semantic
schedule/cancel policy and dispatch-time revalidation for the activity-start
reminder; it does not alter confirmation, join fan-out or PR-message behavior.

## Preconditions And Boundary

- Current source has one run time (start minus 20 minutes), one recipient/PR
  schedule identity and a named user-level rebuild/cancel path.
- Because a current participant plus PR time reconstructs the work, it is
  recoverable—not atomic-required.
- Generic Notification needs an owner-private active-key cancellation/rebuild
  capability for this mutable time-based task. The business caller still cannot
  select a Job type, key or timing.
- A subscription change has a user-wide recovery boundary: Notification exposes
  a semantic recipient-scope invalidation (not a Job-prefix API), while a
  PR-owned pure reconciler enumerates current active PR participation and
  re-requests each current activity reminder through Notification. This is how
  opt-out purges stale generic work and renewed credit rebuilds it without the
  legacy scheduler.

## Implementation Outcome

- `notification.send.v1` owns the typed activity task and private mutable
  replacement identity. Its owner derives the fixed 20-minute lead and
  serializes recipient and aggregate invalidation through one recipient
  coordination identity.
- PR owns current participant/time reconstruction. Join, repeated join,
  promotion and persisted time changes reconcile; exit, automatic/manual
  release and time-conflict release cancel by aggregate semantic identity.
- The subscription route now uses recipient-scope generic invalidation/rebuild.
  It only cancels old activity rows during the compatibility drain; a focused
  HTTP scenario proves `ADD_ONE` creates generic work and `CLEAR` cancels it
  without creating a legacy row.
- Notification runtime composition consumes the dedicated
  `domains/pr/notification-contexts` query entrypoint. This replaces a broad
  PR-query barrel that could form an initialization cycle through legacy
  Notification wiring.

## Local Evidence

- focused owner/reconciler/adapter/Job unit suites: 31 tests passed;
- activity-start backend scenario: 2 tests passed, including the authenticated
  subscription route;
- serialized Job replacement scenario passed;
- `pnpm check:type:backend`, `pnpm check:lint:backend`, and `git diff --check`
  passed after the complete batch.

## Exit

One reconciler can be called repeatedly without duplicates, time/participation
changes remove or replace active work, subscription opt-out invalidates all
recipient work, and stale dispatch skips without channel I/O. Old
activity-start Job registration stays live for pending rows.
