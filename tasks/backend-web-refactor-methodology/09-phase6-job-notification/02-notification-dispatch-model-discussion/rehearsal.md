# D6-N-01 Rehearsal And Entry Gates

## Before Any Source Slice

| Needed decision/evidence | Why it blocks source changes | Cheapest proof |
| --- | --- | --- |
| business template vocabulary and binding owner | keeps provider IDs/field names out of callers while preserving typed payloads | one confirmation and one PR-message compile-time fixture using a fake binding |
| Job-as-Notification-Task representation | proves handler/payload/schedule metadata can replace opportunity without moving Notification policy into JobRunner | decode/registration tests plus a field/use-case ledger |
| task/business-transition atomicity | prevents a committed business transition with no required Notification Job | transaction failure-injection test |
| disposition/control/O11y split | aligns provider outcome with JobRunner transitions without making telemetry authoritative | focused disposition table tests with telemetry disabled |
| preference + nullable-credit invariant | prevents `null` from meaning both unlimited and unknown, and prevents credit exhaustion from accidentally erasing durable preference | option state-transition table tests |
| opportunity/wave/inbox migration boundary | moves redundant lifecycle state into Job task/control while retiring the general read/unread contract | repository read/write inventory plus migration fixture and cross-unit attention-window scenario |
| pending legacy job rollout | protects existing `wechat.*` PENDING/RETRY rows | fixture with old payload/job type against new registration |
| provider ambiguity policy | prevents false exactly-once claims after accepted/lost response | fake adapter “accepted then response lost” characterization |

## Migration Rehearsal

1. Freeze the target vocabulary: business template IDs, typed payload versions,
   channel binding registry, and `notification.send.v1`.
2. Characterize current JobRunner scheduling, active dedupe, cancel/delete,
   lease-expiry and unknown-handler behavior.
3. Add the generic handler and template definitions behind existing behavior;
   retain legacy handlers while pending jobs drain or decode them into v1.
4. Move one notification kind to the generic path and prove identical timing,
   revalidation, credit and provider-result behavior.
5. Make required Job insertion transaction-aware for that business transition.
6. Classify `notification_opportunities` data:

   - task identity/link only → migrate required correlation to Job/O11y and
     retire it;
   - genuinely queried product lifecycle → preserve that fact under an accurate
     name rather than calling it a task/intent by default.

7. Ratified D6-J-02 supplies the separate proof that `notification_waves` is
   behaviorally redundant, models coalescing as a Job reservation with an
   atomic high-water cursor, and retires PR inbox/read-state semantics.
8. Remove legacy per-kind scheduling/handler glue only after pending job and
   rollback evidence closes.

## No-Regression Simulation

For one PR message and one waitlist promotion, simulate:

1. duplicate scheduling call while a matching Job is active;
2. repeat of the same causation after a Job reached a terminal state;
3. transaction abort before/after Job insertion;
4. user preference disabled after schedule but before dispatch;
5. limited credit exhausted after schedule; unlimited credit (`null`) path;
6. provider refusal `43101`;
7. provider accepts but response is lost;
8. old pending job reaches a new deployment;
9. a message-attention window is acknowledged before its Job becomes due;
10. a stale ACK below a coalesced high-water races with message scheduling in
    both commit orders.

The target is rejected if any branch has no durable owner, leaks a provider
template to business code, loses required work, or silently turns a retryable /
ambiguous provider failure into JobRunner `SUCCEEDED`.

## Explicit Current-To-Target Caveat

Current `jobs` cannot be declared a complete replacement merely by deleting
the opportunity table. The target is valid only after proving:

- versioned Notification task decoding;
- the required dedupe lifetime (current Job uniqueness is active-state only,
  while opportunity dedupe is currently all-lifetime);
- cancel/skip audit placement;
- transaction-aware insertion; and
- correlation from Job to every attempt-O11y signal, with no telemetry
  dependency in generic Job retry or owner-specific reconciliation control.

These are migration obligations, not reasons to preserve a second task concept
without an independent use case.
