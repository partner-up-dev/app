# `6-3.2c-1` — Semantic Acknowledgement Contract

## Status

**Locally complete.** See [`verification-log.md`](./verification-log.md) for
the owner, real-Postgres HTTP and changed-surface checks.

## Objective

Expose one PR-message attention acknowledgement without widening Job mechanics
outside Notification.

## Scope

- Notification contracts, owner command and private `UNTIL_ACKNOWLEDGED`
  adapter for semantic acknowledgement;
- PR use case that rechecks current participant access and validates an
  all-row PRMessage cursor, including a tombstone;
- typed controller schema and `POST /api/pr/:id/messages/acknowledgement`;
- focused real-Postgres HTTP proof.

## Non-Goals

- no inbox/read-marker mutation or removal;
- no PR access to a Job type, creation key, status or provider result;
- no durable per-viewer read receipt or acknowledgement watermark;
- no new source/lifecycle scheduling behavior.

## Exit

A current participant can submit the cursor returned by a visible thread;
Notification releases only its matching covered window. A raw GET, legacy
marker, invalid cursor, former participant, stale cursor and tombstoned high
water each preserve their declared boundary.
