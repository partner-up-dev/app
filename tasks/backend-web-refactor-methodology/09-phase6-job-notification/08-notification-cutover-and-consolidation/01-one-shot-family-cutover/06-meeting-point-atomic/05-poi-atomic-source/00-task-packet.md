# `6-3.1f-05` — POI Atomic Source

## Status

**Locally complete.** `6-3.1f-01` through `6-3.1f-05` now have focused and
full backend proof. POI mutation is source-owned and atomic; cross-source
consolidation and legacy drain remain in `06`.

## Objective

Move the admin POI update’s meeting-point business behavior from the controller
into a POI-owned use case, then make the POI write and generic per-PR fan-out
one source transaction.

## Scope

- Controller remains authentication, input validation and response conversion.
- POI use case locks/rereads the POI and performs its update in a serializable
  source transaction.
- It locks the deduplicated union of every PR whose exact location is the old
  or normalized new name, in ascending ID order and without a status filter.
  This preserves current name-based rename reach even though an old-name PR
  that falls from a POI point to no point deliberately receives no removal
  message under the existing no-description rule.
- It resolves before/after effective points and invokes the narrow
  transaction-bound Notification port only for real deltas.
- One UUID/timestamp is generated inside the successful retry attempt and is
  shared by all changed PRs in the POI operation; Notification derives the
  PR-specific causation and recipient-private Job identity.
- The generic POI package returns the persisted `Poi`; the controller retains
  its exact response projection. The source does not call the concrete WeChat
  scheduler or write Opportunity/Delivery rows.

## Exit

The POI update/rename and generic fan-out commit or roll back together. An
injected writer failure leaves both POI values and Jobs unchanged; the
controller owns none of the effective-change or scheduling rule.
