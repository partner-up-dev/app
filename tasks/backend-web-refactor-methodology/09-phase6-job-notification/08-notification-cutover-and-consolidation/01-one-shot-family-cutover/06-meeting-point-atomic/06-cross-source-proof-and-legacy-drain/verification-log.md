# `6-3.1f-06` Verification Log

## Result

`6-3.1f` is locally complete. Each of PR-content, PR-type coordination and
admin POI mutation commits its source write and generic
`pr.meeting-point-updated` fan-out together. New source code cannot create a
concrete meeting-point Job, Opportunity or Delivery row. Historical concrete
rows remain executable through their compatibility handler.

## Cross-Source And Drain Proof

- The three real-Postgres source scenarios prove the named PR-content,
  PR-type and POI source transactions. They cover PR-specific causation,
  immutable source facts, no-effective-delta suppression, multi-PR fan-out,
  POI old/new-name behavior and injected rollback.
- The PR-content scenario retains the rapid-update proof: two committed source
  UUIDs create distinct generic tasks even when their source clock is equal;
  queued payload facts do not get replaced by later resolution.
- The legacy drain scenario manually persists an old
  `wechat.notification.meeting-point-updated` row, claims it through the
  registered JobRunner handler, and observes successful terminal processing.
  Its deliberately OpenID-less recipient produces the old handler's
  `USER_OPENID_MISSING` Delivery evidence without provider I/O.

## Static Boundary Inventory

- An expected-empty search for
  `scheduleWeChatMeetingPointUpdatedNotifications`,
  `scheduleMeetingPointNotificationsForChangedRequests`,
  `collectMeetingPointUpdatedNotificationRecipients`,
  `buildMeetingPointUpdatedDedupeKey`, and
  `meetingPointUpdatedSchedulePolicy` returns no source reference.
- PR, PR-type-config and POI source directories contain no concrete
  meeting-point scheduler or Opportunity writer. Intentional legacy references
  are limited to startup registration, handler/decoder/Delivery accounting and
  cancellation for historical rows.

## Commands And Results

| Command | Result |
| --- | --- |
| focused three source scenario files | passed: 3 files / 11 tests |
| focused legacy JobRunner drain scenario | passed: 1 file / 2 tests |
| `pnpm test:scenario:backend` | passed: 34 files / 117 tests |
| `pnpm test:unit:backend` | passed: 103 files / 468 tests |
| `pnpm check:type:backend` | passed |
| `pnpm check:lint:backend` | passed |
| `pnpm check:build:backend` | passed |
| scoped `oxfmt --check` and `git diff --check` | passed |

## Compatibility Boundary Still Open

This is a creation cutover, not permission to remove old rows or their
compatibility handler. The retained decoder, handler, Delivery accounting and
recipient-prefix cancellation may leave only with a later archive/drain and
runtime-proof decision.
