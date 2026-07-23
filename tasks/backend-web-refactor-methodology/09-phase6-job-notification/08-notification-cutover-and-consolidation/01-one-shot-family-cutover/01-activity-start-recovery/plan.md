# `6-3.1a` Plan

1. **Complete locally.** Freeze current run-at/tolerance, participant
   eligibility, option and cancellation/rebuild behavior in focused tests.
2. **Complete locally.** Generic owner-private active schedule/cancel policy
   keeps Job mechanics private. Its replacement and aggregate/recipient
   invalidation serialize on the stable recipient coordination identity; a
   separate cancel-prefix then schedule sequence is not sufficient under
   concurrent reconciliation.
3. **Complete locally.** Implement a pure PR-owned current participant + materialized PR-time
   reconciler; it derives semantic causation and invokes Notification, not
   legacy infra. Give it a recipient-level rebuild form that first asks
   Notification for semantic recipient invalidation, then enumerates active
   current PR facts and reuses the per-participant reconciler.
4. **Complete locally.** Bind the template to its current WeChat renderer and
   dispatch context; keep non-`43101` ambiguity conservative.
5. **Complete locally.** Cut over join/promotion/rebuild/cancel callers only after the generic path
   has fixed-clock unit proof. A PR time change must reconcile every remaining
   active participant after persistence, including the non-conflict path;
   retain the legacy definition for pending jobs. During that drain, a
   subscription opt-out may cancel old activity jobs as a narrow compatibility
   bridge, but no production edge may rebuild/create a legacy activity job.

The runtime-composition repair discovered during scenario integration is part
of this child: Notification imports a narrowly named PR revalidation entrypoint
rather than a broad PR barrel, preserving both the owner boundary and safe
module initialization.

## Cheapest Verification

- reconcile twice at a fixed clock → one active generic task;
- exit/time invalidation → no pending generic task;
- stale slot / no credit at dispatch → `SKIPPED`, no channel call;
- existing activity renderer test plus focused backend scenario.
