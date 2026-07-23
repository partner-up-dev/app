# `6-2` Verification Log

> Historical `6-2` evidence. The Phase 6 exit subsequently passed the complete
> static/unit/backend/system matrix, closed the exemplar handoff and retired
> every concrete Notification registration.

## Focused Evidence — 2026-07-22

| Command | Result | What it establishes |
| --- | --- | --- |
| `pnpm exec vitest --project backend-unit run apps/backend/src/domains/notification/owner/notification-owner.service.test.ts apps/backend/src/infra/notifications/channels/wechat-subscription.adapter.test.ts apps/backend/src/infra/notifications/wechat-pr-message.test.ts` | pass, 3 files / 11 tests | typed command/policy, dispatch disposition matrix, injectible real adapter outcome contract and retained legacy PR-message behavior |
| `pnpm exec vitest --project backend-scenario run apps/backend/tests/pr/pr-waitlist.scenario.test.ts` | pass, 1 file / 8 tests | real promotion creates/coalesces generic Job; no opportunity row; handoff failure is visible; real option transitions and owner dispatch work |
| `git diff --check` | pass | no whitespace error in the current shared worktree diff |

`pnpm check:type:backend` and `pnpm check:lint:backend` also passed after the
injectable channel/runtime composition seam was added.

## Full Local Evidence — 2026-07-22

| Command | Result |
| --- | --- |
| `DATABASE_URL=postgres://localhost:5432/partnerup pnpm test:unit:backend` | pass, 92 files / 415 tests |
| `pnpm test:scenario:backend` | pass, 26 files / 85 tests |
| `pnpm check:build:backend` | pass, including backend bundle and FC DB-migrate bundle |
| `pnpm check:config:backend` | pass, migration lint and Drizzle check |
| `pnpm check:dead-code` | report completed (non-blocking baseline findings) |
| `pnpm check:security` | report completed with exit 0 |
| owned-file `oxfmt --check` plus `git diff --check` | pass |

`pnpm check:static` cannot reach later subchecks because its repository-wide
format first step finds 29 unrelated pre-existing paths. The first run found
one owned path (`notification-owner-runtime.ts`); it was formatted, and the
repeat inventory contains no `6-2` path. No unrelated file was reformatted.

## Phase 6 Exit Compatibility Result

- `apps/backend/src/index.ts` registers the generic Notification runtime and no
  concrete Notification Job family.
- The concrete promoted scheduler, `domains/notification/legacy` surface and
  all other per-kind handlers/decoders are absent.
- `notification.send.v1` is the only Notification Job type created by current
  business callers.
