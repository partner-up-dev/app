# 4-5 Verification Log

> The initial implementation had an untested stale-navigation case. The 2026-07-20 completion review repaired it;
> see [the repair evidence](../07-completion-review/01-route-guard-cancellation/exit-evidence.md) for the Phase-close
> branch that supplements this historical log.

## Route-Entry Process

- `pnpm exec vitest run --project frontend-unit apps/web/src/processes/wechat/route-wechat-auto-login.test.ts`
  passed: 1 file / 6 tests. It proves bootstrap ordering, anonymous WeChat redirect with the target route URL,
  stopped navigation, pending-handoff deferral, non-opt-in/non-WeChat/already-attempted pass-through, concurrent
  redirect sharing, and registration on the router entry lifecycle.
- `pnpm test:unit:web` passed: 57 files / 193 tests at this slice's initial exit. The completion review's route
  guard repair later reran the suite at 57 files / 194 tests; see
  [`../07-completion-review/verification-log.md`](../07-completion-review/verification-log.md).
- `pnpm check:type`, `pnpm check:lint:web`, and `pnpm check:build:web` passed.

The new guard is registered by app bootstrap immediately before `app.use(router)`. It is not a page mount watcher:
the opted-in component cannot mount and issue its protected first read until the guard allows its navigation.

## Legacy Facade Closure

- Before deletion, the current source/script/test/CI/package inventory found zero consumers of
  `WeChatAuthSessionService` and `WeChatLoginService`; post-deletion search remains clear. The package is private
  and exports only type surfaces; its Backend build entries are `src/index.ts` and the independent Caocao callback
  router.
- FC packaging copies `apps/backend/dist`; the deployed start path is `node dist/index.js`. The deploy workflow
  triggers from `develop` and `master`, so historical worktree refs are not deployment entries.
- `pnpm exec knip --no-exit-code --reporter compact --max-show-issues 100` reports 28 unused files, down from
  the pre-deletion 30; the two removed facades are absent. The remaining report is baseline-only and not treated as
  a clean dead-code gate.
- `pnpm check:type:backend`, `pnpm build:backend`,
  `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/controllers/wechat-oauth-return-to.test.ts`
  (1 file / 4 tests), and
  `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/auth/wechat-oauth-handoff.scenario.test.ts`
  (1 file / 3 tests) passed.

Historical refs still contain old source snapshots, and an external manually retained artifact cannot be inspected
from this repository. Neither is claimed as a live consumer; no deployed production-retirement assertion is made.

## Hygiene And Known Boundaries

- `pnpm check:lint:backend`, scoped `oxfmt --check`, and `git diff --check` passed.
- Full `pnpm check:format` reports 22 existing unrelated files outside this slice. The touched source passes
  scoped formatting, and durable docs/task-packet changes pass diff-whitespace hygiene.
- No System scenario is promoted as a route-entry/provider proof. The existing 4-4 `127.0.0.1` versus
  `localhost` cookie-host limitation remains recorded; 4-1 rollout header observation and 4-3.4 provider/topology
  evidence remain externally open.
