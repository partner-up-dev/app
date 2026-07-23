# `6-3.1f-04` Verification Log

## Focused source proof

- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit
  …update-slices.test.ts …meeting-point-change-notifier.service.test.ts
  …meeting-point.service.test.ts` passed: 3 files / 10 tests.
- The real-Postgres scenario file
  `apps/backend/tests/pr-discovery/pr-type-meeting-point-notification.scenario.test.ts`
  proves:
  - the admin route fans out only for changed effective points across explicit
    override, type/location, type fallback and POI fallback precedence;
  - all changed PRs from one coordination mutation share the UUID/correlation
    but have PR-distinct causation and recipient-private ONCE_PER_CAUSE jobs;
  - a persisted unused map-entry change creates neither generic nor legacy
    work; and
  - a second handoff failure rolls back both the config and a first PR's
    already-written generic task, without legacy Job/Opportunity rows.

## Full backend regression

- `pnpm check:type:backend` passed.
- `pnpm check:lint:backend` passed.
- `pnpm test:unit:backend` passed: 103 files / 468 tests.
- `pnpm test:scenario:backend` passed: 33 files / 112 tests.
- Scoped `oxfmt` and `git diff --check` passed.

## Static boundary inventory

- The admin PR-type coordination use case contains no reference to
  `scheduleMeetingPointNotificationsForChangedRequests` or
  `scheduleWeChatMeetingPointUpdatedNotifications`.
- The generic PR-type-config barrel no longer exposes the old bare
  `updatePRTypeConfigCoordination` command. The concrete legacy scheduler is
  still intentionally reachable by the not-yet-cut-over POI source and the
  pending-row drain only.
