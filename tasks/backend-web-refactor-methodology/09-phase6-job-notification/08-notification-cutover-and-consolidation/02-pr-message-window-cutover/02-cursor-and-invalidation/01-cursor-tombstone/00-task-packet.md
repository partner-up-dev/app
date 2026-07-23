# `6-3.2b-1` — PRMessage Cursor / Tombstone Foundation

## Status

**Complete.** `PRMessage.deletedAt`, visible-only repository reads and the
all-row acknowledgement cursor are now in place. The admin delete route still
uses physical deletion intentionally; `6-3.2b-3` must replace it only together
with semantic held-window invalidation. See
[`verification-log.md`](./verification-log.md).

## Objective

Give PRMessage a durable deletion-preserving identity and expose a monotonic
`acknowledgementCursor` without changing the legacy visible-read API into an
acknowledgement API.

## Scope

- allocate the next standard Drizzle migration; never edit pre-existing
  untracked `0089`–`0092` files;
- add nullable `deletedAt` and visible-only vs all-row repository operations;
- add the acknowledgement cursor to the thread response, including the
  immediate create response;
- preserve `latestVisibleMessageId`, legacy `lastReadMessageId` and
  `hasUnread` compatibility semantics;
- create the narrow tombstone persistence primitive needed by the later
  lifecycle wire-up, but do not change admin deletion behavior until that
  wire-up can release its corresponding window atomically.

## Exit

If the current highest message becomes tombstoned, normal listing/context
queries no longer expose it while `acknowledgementCursor` still reports its ID.
No visible-only lookup can accidentally validate a future semantic ACK.

## Non-Goals

- no `POST /acknowledge` endpoint or Web visibility trigger;
- no inbox/read-marker retirement;
- no route switch to tombstone without the invalidation transaction in
  `6-3.2b-3`;
- no physical purge policy.
