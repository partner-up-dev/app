# `6-3.1f-05` Plan

1. Add only the missing executor-aware repository primitive: lock a normalized
   old/new location-name union in deterministic PR ID order. Reuse the existing
   executor-aware POI repository and transaction-bound effective resolver.
2. Define a POI-owned update use case/port that accepts the controller's
   normalized PUT fields and returns a persisted `Poi`; retain controller-side
   HTTP response conversion unchanged.
3. Inside a serializable retry loop, lock the POI then affected PRs, capture
   transaction-local before snapshots, preserve the controller's optional
   availability/meeting-point fallback semantics, write the POI and compare
   after snapshots before generic fan-out.
4. Generate a shared operation UUID/timestamp inside the successful callback;
   for every real delta freeze its active roster and hand it to Notification.
   Do not introduce a generic transaction callback or a removal-notification
   intent.
5. Replace controller orchestration; add route success/no-delta/rename tests
   and a direct named-port failure after a first real Job write, then run
   focused and full backend regression.

## Outcome

- Completed: `updateAdminPoi` delegates to a named POI serializable source
  transaction. The transaction locks the POI, locks the normalized old/new
  location union in deterministic PR ID order, observes effective points with
  its transaction-local reader, updates the POI and writes generic task fan-out
  before commit.
- Completed: the HTTP controller now owns only authentication, input mapping,
  validation and its pre-existing `Poi` response projection. It no longer
  captures snapshots or invokes concrete scheduling.
- Completed: route and direct-port real-Postgres proof covers POI-only
  fallback, non-point no-delta persistence, rename old/new reach with removal
  suppression, and rollback after the second handoff fails.
- Completed: exposing the POI mutation use case revealed a barrel cycle into
  PR's effective-point rule. That rule now imports POI's deliberately
  low-dependency `queries` surface rather than POI's aggregate public barrel;
  a full scenario regression verifies the runtime binding.
