# `6-3.1f-06` Plan

1. Run the focused owner, channel and source scenarios together; repair only
   evidence gaps found at their real boundaries.
2. Static-search all concrete legacy creation symbols, Opportunity/Delivery
   writes and source imports. Keep an explicit drain inventory.
3. Run full backend unit/scenario/type/lint/build checks and inspect the
   changed-file diff.
4. Promote the final ownership, causal identity, immutable payload and POI
   controller boundary to durable docs; record exact commands/results in a
   verification log.

## Implementation Preflight

- Static inventory finds no remaining caller of the concrete scheduler or the
  old PR scheduling helper. The only concrete scheduler references are its own
  declaration, its infra barrel export and the helper that invokes it.
- The legacy module still has three required pending-row capabilities:
  handler registration from backend startup, old-payload decoding/dispatch
  (including legacy Opportunity/Delivery accounting), and user credit-exhaustion
  cancellation from the WeChat controller. Those are not source creation
  paths and must remain.
- The smallest safe deletion is therefore: remove the source helper's concrete
  scheduler function and obsolete global affected-request readers; remove the
  infra scheduler declaration and barrel export; retain the legacy handler and
  cancellation APIs. Typecheck plus a static absence search verifies the
  public/source edge is closed.
- The POI cutover uncovered a separate runtime circular dependency caused by
  importing the POI aggregate barrel from the PR meeting-point rule. That rule
  now imports POI's low-dependency query surface directly; full scenario proof
  is required because this is an initialization-order failure, not a unit-only
  type error.

## Outcome

- The concrete scheduler creation API, source helper, affected-request
  collectors, dedupe-key builder and creation schedule policy are deleted.
  No PR-content, PR-type or POI source has a concrete scheduler,
  Opportunity, or Delivery creation edge.
- The retained legacy boundary is intentionally narrow: startup job-handler
  registration, historical-payload decoding/dispatch (including its existing
  Delivery accounting), and recipient-prefix cancellation for pre-cutover
  rows. A scenario runs a manually persisted old row through the real handler.
- PR effective-point resolution now imports POI and PR-type facts through
  their low-dependency query entrypoints. This removes the aggregate-barrel
  initialization cycle exposed by the POI cutover.
- All focused and full backend gates pass. Exact evidence is recorded in
  `verification-log.md`.
