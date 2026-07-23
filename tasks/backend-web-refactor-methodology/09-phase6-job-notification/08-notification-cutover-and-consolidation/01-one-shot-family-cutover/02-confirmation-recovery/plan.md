# `6-3.1b` Plan

1. **Complete:** add `pr.confirmation-reminder` to Notification's private binding registry:
   derive each trigger's current `runAt`, timing tolerance, recipient shared
   coordination key and trigger-specific active replacement prefix. Extend the
   semantic cancellation contract for recipient, PR aggregate, and optionally
   one trigger; do not expose Job keys to PR.
2. **Complete:** extend generic Job execution with its owner-private scheduled
   instant. The confirmation dispatch projection returns current confirmation
   anchors plus render facts; Notification derives the current trigger instant
   and compares it to `JobHandlerContext.runAt` before channel I/O. Keep the
   public request/task business payload free of `runAt`.
3. **Complete:** add a pure PR participant/policy reconciler. It reads current
   PR facts once per participant to derive zero, one, or two business requests;
   a missing trigger performs
   trigger-scoped cancellation, while a missing eligibility condition performs
   aggregate cancellation. Recipient rebuild first invalidates semantically,
   then enumerates current active PR participation and invokes the same
   reconciler.
4. **Complete:** move join/repeated join, waitlist promotion, exit/release, successful PR
   time changes, and post-`updatePartnerRules` admin reconciliation to that
   service. Migrate the confirmation subscription side-effect to generic
   recipient cancel/rebuild with legacy cancellation-only drain bridge.
5. **Complete:** preserve the established WeChat template rendering and conservative generic
   outcome classification. Add confirmation-specific option/credit mapping;
   no generic path creates legacy opportunity/delivery state.

## File Ownership For The Implementation Batch

- Notification-core worker: `domains/notification/{contracts.ts,owner/**}` and
  `infra/notifications/{notification-owner-runtime.ts,channels/**}`, plus its
  focused owner/adapter tests. It does not edit PR callers or the controller.
- PR-cutover worker: `domains/pr/notification-contexts.ts`, confirmation query
  projections/reconciler and direct PR/admin caller edges. It does not edit
  Notification owner/core or the controller.
- Integrator: controller subscription bridge, backend scenario proof, packet
  updates, durable-doc promotion and final cross-cutting validation.

## Cheapest Verification

- fixed-clock owner matrix for both trigger run-at/resolution/tolerance;
- idempotent 0/1/2 reconciler matrix plus one-trigger cancellation;
- claimed stale Job whose `runAt` no longer matches current policy skips before
  channel I/O and does not consume credit;
- generic adapter rendering/outcome matrix, including `43101` permission
  revocation;
- backend scenario coverage for join/repeat, time replacement, release,
  subscription rebuild/clear, and zero new legacy Jobs/opportunities.

All five checks passed in the local evidence recorded in `00-task-packet.md`.
