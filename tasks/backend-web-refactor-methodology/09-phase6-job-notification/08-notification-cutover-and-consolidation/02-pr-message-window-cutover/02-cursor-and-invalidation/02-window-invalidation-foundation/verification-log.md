# `6-3.2b-2` Verification Log

## Focused Proofs

| Proof | Result |
| --- | --- |
| Job exact release across pending, retry, running and terminal-held rows; stable prefix enumeration and reopen after release | passed: `apps/backend/tests/jobs/job-reservation-release.scenario.test.ts` (2 tests) |
| Existing Job creation/acknowledgement/runner behavior after the new primitive | passed: `apps/backend/tests/jobs/job-runner.scenario.test.ts` (3 tests in the focused run) |
| Notification owner semantic aggregate/recipient mapping and transaction-bound private Job mapping | passed: 14 focused unit tests across `notification-owner-runtime.test.ts` and `pr-message-summary-notification-owner.test.ts` |
| Clear, zero-to-positive no-history-replay, and later-source reopen | passed: first real-Postgres scenario in `pr-message-window-invalidation-foundation.scenario.test.ts` |
| Source option lock vs concurrent clear | passed: second real-Postgres scenario in `pr-message-window-invalidation-foundation.scenario.test.ts`; clear remained blocked while source held the option row, then committed with the source's held Job `CANCELED` and `RELEASED` |

## Commands

- `pnpm check:type:backend` — passed.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/infra/notifications/notification-owner-runtime.test.ts apps/backend/src/domains/notification/owner/pr-message-summary-notification-owner.test.ts` — passed: 2 files / 14 tests.
- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/pr/pr-message-window-invalidation-foundation.scenario.test.ts apps/backend/tests/jobs/job-reservation-release.scenario.test.ts apps/backend/tests/jobs/job-runner.scenario.test.ts` — passed: 3 files / 7 tests.
- Targeted `oxfmt --check` — passed after formatting the changed files.

## Deliberate Limits

- The proof does not claim a prefix lock blocks a future key. The shared option
  row serializes source creation with subscription/provider mutation; Job still
  exact-locks every enumerated key before release.
- The authenticated subscription controller, PR lifecycle mutations and admin
  tombstone transaction are deliberately left to `6-3.2b-3`.
