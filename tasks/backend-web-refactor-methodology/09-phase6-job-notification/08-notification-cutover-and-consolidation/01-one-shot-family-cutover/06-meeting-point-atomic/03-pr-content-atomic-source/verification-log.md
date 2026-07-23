# `6-3.1f-03` Verification Log

## Focused source proof

- `pnpm exec vitest run --project backend-unit …meeting-point-updated-notification-owner.test.ts …transaction-meeting-point-updated.test.ts …meeting-point.service.test.ts …meeting-point-change-notifier.service.test.ts …wechat-subscription.adapter.test.ts`
  passed: 5 files / 24 tests.
- `pnpm exec vitest run --project backend-scenario …pr-content-meeting-point-notification.scenario.test.ts …pr-admission.scenario.test.ts`
  passed: 2 files / 10 tests.
- The PR-content scenario proves user and admin entrances, source-time
  active/OpenID/credit filtering, no effective delta, rapid UUID-distinct
  updates, no legacy concrete Job/Opportunity creation, atomic core rollback,
  and atomic preflighted-release rollback.

## Full backend regression

- `pnpm check:type:backend` passed.
- `pnpm check:lint:backend` passed.
- `pnpm test:unit:backend` passed: 103 files / 468 tests.
- `pnpm test:scenario:backend` passed: 32 files / 109 tests.

## Command routing note

Do not mix backend-unit and backend-scenario files in one raw `vitest run`
command: the projects deliberately have different worker settings and Vitest
rejects a shared group order. Run the two project-scoped commands above (or the
root canonical unit/scenario scripts) separately.
