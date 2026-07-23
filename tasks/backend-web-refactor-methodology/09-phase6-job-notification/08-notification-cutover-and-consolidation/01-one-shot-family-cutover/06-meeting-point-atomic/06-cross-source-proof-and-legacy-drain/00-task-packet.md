# `6-3.1f-06` — Cross-Source Proof And Legacy Drain

## Status

**Locally complete.** Source sub-tasks `03` through `05` are locally complete,
their cross-source proof passes, and new-source creation can no longer reach
the concrete scheduler, Opportunity, or Delivery writers. The retained old
handler/decoder/cancellation path is proven to execute a persisted historical
row and remains pending-row drain only. The passing owner/temporal contract is
promoted to durable truth.

## Objective

Close the vertical only after every actual source family uses the same generic
Notification policy, all new legacy creation edges are gone, and both durable
architecture truth and bounded compatibility behavior are documented.

## Scope

- Consolidate/complete source-specific real-Postgres scenarios.
- Prove rapid distinct events, later recipient ineligibility, source rollback
  and the three source families.
- Remove concrete creation imports/calls/exports made obsolete by the cutover.
- Retain handler registration, decoder and cancellation only where necessary
  for pending legacy drain.
- Update durable Notification, PR, POI/admin-topology and runtime documents
  only from passing proof.

## Exit

All three source families create only generic meeting-point work; no new
Opportunity/Delivery/concrete job creation exists. Legacy pending rows remain
executable, and full backend gates demonstrate the vertical is ready for the
next family.
