# 4-4 Verification Log

| Command | Result | Scope / note |
| --- | --- | --- |
| `pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts apps/web/src/shared/api/auth-required-policy.test.ts apps/web/src/processes/auth/authenticated-escalation.test.ts apps/web/src/processes/wechat/auth-error.test.ts apps/web/src/processes/wechat/pending-wechat-action.test.ts apps/web/src/domains/pr/use-cases/usePRPendingWeChatReplay.test.ts apps/web/src/domains/pr/queries/usePRActions.test.ts` | Pass: 7 files, 20 tests | response identity, fallback/claim timing, typed storage, waitlist preference, clear-before-handler, and persist-before-claim |
| `pnpm test:unit:web` | Pass: 57 files, 189 tests | full Web unit suite |
| `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario apps/backend/tests/auth/wechat-oauth-handoff.scenario.test.ts` | Pass: 1 file, 3 tests | real local mock login -> navigation callback -> one-shot handoff-cookie consumption |
| `pnpm check:type` | Pass | root type gate |
| `pnpm check:lint` | Pass | root lint gate; existing report-only Commerce naming findings remain non-blocking |
| `pnpm check:build` | Pass | root Backend/Web build gate |
| `pnpm exec oxfmt --check <4-4 source, packet, and durable paths>` | Pass | all matched 4-4 paths formatted |
| `pnpm check:format` | Baseline failure outside 4-4 | 22 pre-existing unrelated paths are reported; no 4-4 path appears. No broad formatter rewrite was made. |
| `git diff --check` | Pass | no whitespace errors |

The focused System scenario attempt is recorded separately in
[the 4-4.4 harness limitation](./04-escalation-journey-proof/harness-blocker.md). It is not counted as a passing
browser journey and does not make a provider or cross-origin production claim.
