# `6-3.2c` — Visible ACK And Overlap Compatibility

## Status

**Locally complete.** The cursor/tombstone, generic invalidation and lifecycle
fences are locally complete. This slice closes the missing target path: a
rendered, visible PR messages route can acknowledge an attention window without
touching the legacy inbox/read-marker projection. Its focused backend, Web and
real-system proofs plus changed-surface static/build gates pass. The full system
suite has one separately reproducible Auth session-bootstrap failure; it is
recorded in [`verification-log.md`](./verification-log.md) and is not a
PR-message ACK path failure.

## Objective

Expose the semantic attention acknowledgment through PR HTTP/Web and remove new
path read-marker behavior. The mounted messages page, after render commit while
visible, is the sole normal ACK initiator; legacy read-marker remains only for
old Job/inbox compatibility during drain.

## Ratified HTTP And Owner Boundary

- The public semantic route is `POST /api/pr/:id/messages/acknowledgement`
  with `{ acknowledgementCursor: positive integer }`. The noun deliberately
  distinguishes attention-window control from the legacy `/read-marker`
  read-projection route.
- PR owns active-participant authorization and validation that the supplied
  cursor belongs to that PR, including a tombstoned message. Notification owns
  the template/aggregate/recipient-to-private-Job mapping and the generic
  covered/stale reservation transition. Neither the HTTP route nor PR accepts
  a Job type, key, reservation state, provider code, or inbox fact.
- A successful HTTP response is intentionally `{ ok: true }`: stale versus
  covered is Notification/Job control state rather than a browser decision.
  A stale rendered cursor is still a successful semantic ACK attempt; a later
  response cursor is the only valid reason to close a newer generation.
- New Web code no longer posts `/read-marker`. Deployed older clients retain
  that compatibility call for historical concrete rows until `6-3.3`; it can
  never release a generic reservation.

## Child Packets

1. [`01-semantic-ack-contract/`](./01-semantic-ack-contract/) — owner-surface,
   PR validation and HTTP contract.
2. [`02-visible-route-web/`](./02-visible-route-web/) — page-scoped visible
   render acknowledgement and same-cursor retry.
3. [`03-cross-unit-proof-and-promotion/`](./03-cross-unit-proof-and-promotion/)
   — backend/Web/system proof and durable contract promotion.

Aggregate evidence: [`verification-log.md`](./verification-log.md).

## Exit

Raw data fetch, hidden document and pre-render cannot release a generic window.
The visible route ACKs its latest response cursor, retries the same cursor once
after failure, and a focused real Web → backend → Postgres scenario proves it.
The remaining `6-3.3` gate is legacy runtime/data retirement, not a missing
replacement-path behavior.
