# `6-3.2b` Verification Plan

## `6-3.2b-1` — Cursor / Tombstone

- migration/database test: `deleted_at` defaults null and the current indexes
  retain PR-visible message ordering;
- repository/thread test: visible list excludes a tombstone while an all-row
  cursor remains the deleted high-water;
- route-compatible scenario: existing `lastReadMessageId` and `hasUnread`
  behavior is not repurposed as acknowledgement.

## `6-3.2b-2` — Generic Release / Owner Mapping

- Job unit and real-Postgres test: release a held pending, running and terminal
  row; pending/retry is cancelled and each released row can be replaced by a
  later source generation;
- concurrent-key test: release and schedule serialize on the same private key;
- Notification owner test: semantic aggregate/recipient scopes produce only
  Notification-private key requests and no PR type leaks into Job contracts.

## `6-3.2b-3` — Lifecycle Matrix

Use one real-Postgres scenario family, with a fresh isolated database, to
prove:

1. tombstoning a held high-water leaves the visible thread lower but the cursor
   covering, and releases the window;
2. participant exit or administrative/content-driven release releases only the
   affected recipient; rejoin does not replay old work;
3. manual and temporal `CLOSED`/`EXPIRED`, and admin root deletion, release all
   affected windows; a later operator/system message cannot create a terminal
   window and a stale dispatch skips it;
4. opt-out and WeChat `43101` clear held recipient work; restoring positive
   credit produces no historical notification; a later message opens exactly
   one fresh window;
5. no change reintroduces a new inbox, opportunity, wave, delivery or legacy
   concrete PR-message job write.

## Gates

- focused backend unit/scenario suites for each child;
- full `pnpm test:scenario:backend` after lifecycle wiring;
- `pnpm test:unit:backend`, `pnpm check:type:backend`,
  `pnpm check:lint:backend`, and `pnpm check:build:backend` after the vertical;
- targeted source reverse-edge and `git diff --check` audit;
- a later `6-3.2c` Web/system scenario remains an explicit dependency, not an
  exit claim of this backend slice.
