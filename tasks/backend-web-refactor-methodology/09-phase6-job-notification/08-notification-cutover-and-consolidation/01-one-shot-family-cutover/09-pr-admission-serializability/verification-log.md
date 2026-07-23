# `6-3.1c-2` Verification Log

Date: 2026-07-22

## Focused source checks

- `pnpm check:type:backend` — passed.
- `pnpm check:lint:backend` — passed.
- `apps/backend/src/repositories/UserReliabilityRepository.test.ts` — passed;
  proves one post-delta SQL update with no read-compute-write path.

## Real Postgres scenarios

- `apps/backend/tests/pr/pr-admission.scenario.test.ts` — 6 passed:
  parallel final-capacity direct joins, direct versus promotion priority,
  ineligible queue head, parallel publish/creator slot/reliability, concurrent
  reliability deltas, and content-edit release promotion.
- Existing join, waitlist, draft, route, activity-start, confirmation,
  join-gate and frequency scenarios pass under the adapter.
- `apps/backend/tests/pr/pr-participation-frequency-limit.scenario.test.ts` —
  4 passed after the bounded retry regression fix; its parallel PR setup is the
  proof that legitimate shared-creator contention no longer escapes as HTTP
  500.

## Full backend checks

- `pnpm test:scenario:backend` — 29 files, 97 tests passed.
- `pnpm test:unit:backend` with the ordinary `apps/backend/.env` test
  configuration — 99 files, 450 tests passed. Without `DATABASE_URL`, one
  unrelated PR-authoring unit imports the DB environment at module load; that
  is an environment precondition, not an admission regression.
- `pnpm check:build:backend`, `pnpm db:lint`, and `pnpm db:check` — passed.
- Every touched TypeScript file passes targeted `oxfmt --check` and
  `git diff --check`. The repository-wide `pnpm check:format` remains red on
  pre-existing unrelated formatting findings; this slice did not widen that
  baseline.

## Boundaries retained

No provider call, operation log, expansion, or generic Notification policy was
moved into the admission transaction. The content-release to promotion gap is
not presented as crash-safe recovery.
