# `6-3.1f-04` — PR-Type Coordination Atomic Source

## Status

**Locally complete.** `6-3.1f-01` through `6-3.1f-04` are locally complete
and uncommitted. The old global capture/update/concrete-schedule flow has been
replaced by the named source transaction, with focused and full backend
unit/scenario/type/lint proof recorded in `verification-log.md`.

## Objective

Replace PR-type coordination’s capture-update-schedule sequence with an
admin-PR-type-owned serializable transaction that handles every actually
changed affected PR.

## Scope

- A type-config key is immutable in the current product: this source affects
  every PR whose current `type` exactly matches the locked key. It does not
  invent a config-rename union policy.
- Lock/reread the type configuration, then lock every affected PR in ascending
  ID order inside one serializable retry transaction. Observe effective points
  through the transaction-bound resolver before and after the coordination
  write; do not add a visibility or status filter that changes the old impact
  set.
- For each changed effective point, freeze its active roster and invoke the
  transaction-bound generic Notification port in the same transaction. PR
  overrides, type/location rules, type fallback and POI fallback retain the
  existing resolver/equality/no-description semantics.
- Generate one operation UUID and one source timestamp inside each committing
  retry attempt. All changed PRs in that one coordination operation share the
  UUID in `meetingPointUpdateId` and correlation; Notification derives a
  distinct `prId + UUID` causation and recipient-private creation key.
- The source may not call the concrete WeChat scheduler or create an
  Opportunity/Delivery row. Channel configuration remains a dispatch concern.
- The generic PR-type-config package no longer exposes a bare coordination
  write command: every coordination mutation must enter through this atomic
  source protocol rather than silently bypassing its event responsibility.

## Exit

One coordination mutation commits its config row and all resulting generic
per-PR fan-outs together, or exposes neither. No effective change produces no
task even when the type configuration itself changed.
