# `6-3.1d` Verification Log

## Focused Behavioral Proof

- `pnpm exec vitest run --config vitest.backend.config.ts --project
  backend-scenario apps/backend/tests/pr/pr-new-partner-notification.scenario.test.ts`
  — passed, 1 file / 4 tests. Real Postgres proof covers exact source fan-out,
  no Opportunity write, once-per-cycle coalescing, reused-slot cycle fence,
  direct and promotion writer-failure rollback, and later dispatch skips for
  revoked recipient eligibility.
- `pnpm exec vitest run --config vitest.backend.config.ts --project
  backend-unit apps/backend/src/infra/notifications/channels/wechat-subscription.adapter.test.ts`
  — passed, 1 file / 8 tests. The existing WeChat New Partner template binding
  receives the generic prepared message.

## Broader Backend Gates

- `pnpm test:scenario:backend` — passed, 30 files / 101 tests.
- `pnpm test:unit:backend` (with backend environment loaded) — passed, 99
  files / 451 tests.
- `pnpm check:type:backend` — passed.
- `pnpm check:lint:backend` — passed.
- `pnpm check:build:backend` — passed.
- `pnpm db:lint` — passed.
- `pnpm db:check` — passed.
- Targeted `oxfmt --check` and `git diff --check` — passed.

## Compatibility Inventory

- Static source search returns no reference to
  `scheduleWeChatNewPartnerNotificationsForJoin`, legacy New Partner creation
  keys, recipient collector, or its old schedule policy.
- `wechat.notification.new-partner` registration and recipient-prefix
  cancellation remain only for pre-cutover pending-row drain.
- The ordinary pnpm commands emit the repository's known committed `.npmrc`
  interpolation warning; it did not affect any exit status above.
