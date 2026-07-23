# `6-3.1e` Plan

1. Add `PartnerRequest.readyCycleId` through a forward migration. Backfill
   current `READY`/`ACTIVE` records for the invariant, but create no new work
   for historical rows. The field retains the last entered READY cycle outside
   READY/ACTIVE; status plus exact-cycle comparison decides whether it is
   currently dispatchable.
2. Add a PR-owned named serializable transition port. Each retry locks the PR,
   rechecks its own manual or temporal condition, creates a UUID *inside* the
   winning transaction, writes `READY + readyCycleId`, freezes the active
   recipient roster, and invokes the narrow transaction-bound Notification
   port. A writer error aborts all of those writes.
3. Keep the two source paths together:
   - manual `updatePRStatus` authorizes READY before refresh, lets a temporal
     winner remain idempotent, and otherwise calls the named manual port;
   - temporal refresh calls the named join-lock port and logs `pr.auto_ready`
     only after its commit.
4. Extend the generic Notification owner end-to-end: typed `pr.ready` payload
   with `readyCycleId`, once-per-cause policy, PR-ready dispatch context,
   current preference/credit mapping, prepared WeChat binding and
   preference-preserving limited-credit consumption.
5. Remove the concrete PR-ready creation scheduler and its source-only
   collector/key/opportunity path. Retain only legacy handler registration,
   legacy payload decoding and pending-job cancellation. Mark the controller
   cancellation path as compatibility drain.
6. Promote the resulting owner and causal-state contract to durable docs only
   with the passing source proof; do not call delivery/opportunity retirement
   complete here.

## Cheapest Verification

| Claim | Lowest-cost credible proof |
| --- | --- |
| source atomicity | Real-Postgres named-port failure for manual and temporal modes leaves the PR pre-READY, no cycle, no generic Job and no Opportunity. |
| source correctness | Real-Postgres manual and temporal success each create exactly one `notification.send.v1` task per source-eligible active participant, sharing the persisted cycle and creating no Opportunity. |
| causal fence | READY → OPEN skips before channel/credit; a later READY entry has a different cycle and old work skips, while READY → ACTIVE retains the same valid cycle. |
| generic ownership | Owner unit covers PR-ready key/render/current preference/credit/stale context; prepared-channel unit maps the existing provider template and its error classifier. |
| compatibility | Static inventory proves no new concrete scheduler caller/collector/key remains; the legacy handler registration and legacy cancellation export remain. |
| regression | Focused scenario/unit suites, then backend scenario/unit/type/lint/build plus migration checks. |

## Completion Record

The focused and full proof results are recorded in
[`verification-log.md`](./verification-log.md). Durable promotion reached
Notification contracts, PR lifecycle contracts, unit topology and backend
runtime template configuration; it does not claim legacy state retirement.
