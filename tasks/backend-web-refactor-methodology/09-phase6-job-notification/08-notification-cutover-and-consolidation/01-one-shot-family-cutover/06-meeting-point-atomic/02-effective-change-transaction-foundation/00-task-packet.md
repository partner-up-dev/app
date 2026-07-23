# `6-3.1f-02` — Effective-Change Transaction Foundation

## Status

**Locally complete.** No product source route changed in this sub-task. The
transaction-local read and narrow handoff proof is recorded in
[verification-log.md](./verification-log.md).

## Objective

Make the effective meeting-point detector and the named Notification handoff
usable inside a caller-owned transaction. This is the shared foundation for
three explicit source-owned transactions, not a generic transaction framework.

## Scope

- Add executor-aware access for the minimal PR-type and POI reads/writes needed
  by an effective before/after observation.
- Provide a transaction-local effective resolver/snapshot helper without
  exposing repository internals as a cross-domain API.
- Add `createTransactionBoundMeetingPointUpdatedNotificationPort`, which
  filters a supplied transaction-local candidate roster and schedules generic
  semantic tasks through the caller's Job writer.
- Remove the shared helper's direct dependency on the concrete legacy
  scheduler once all source sub-tasks use the replacement.

## Exit

An in-transaction source can calculate the preserved effective delta, hand one
immutable per-PR event to Notification, and have a writer failure abort the
caller transaction. The shared helper contains no new domain-to-infra
concrete-scheduler creation edge.
