# 4-3 Verification Log

## Entry

- 2026-07-18: Read OAuth Unit TDD, Phase 4 durable/session contract, controller/web source path, callback page,
  scenario harness, and existing focused tests.
- 2026-07-18: Established that the generic operator navigation-handoff 500 is a recovery-contract defect, while
  operator rejection from a public session is the intended security invariant.
- 2026-07-18: No source/test/runtime command has yet been counted as 4-3 exit proof. This log is deliberately
  separate from the completed 4-2 proof.

## Local Execution Results

- 2026-07-18: `pnpm exec vitest run --config vitest.backend.config.ts --project backend-scenario
  apps/backend/tests/auth/wechat-oauth-handoff.scenario.test.ts` passed (3 scenarios). It proves healthy navigation
  handoff, 403 Problem Details/no token/no-store/replay behavior after an identity becomes non-public, direct JSON
  callback success plus legacy error compatibility, and bind-failed rather than bind-success feedback.
- 2026-07-18: `pnpm exec vitest run --project frontend-unit
  apps/web/src/processes/wechat/oauth-login.test.ts apps/web/src/processes/wechat/oauth-handoff.test.ts
  apps/web/src/processes/wechat/WeChatOAuthHandoffGate.test.ts
  apps/web/src/pages/WeChatOAuthCallbackPage.test.ts` passed (4 files, 15 tests). It covers terminal versus
  retryable outcomes, malformed success body, fresh-login recovery, thrown transport failure, return-target
  normalization, and legacy callback URL/session cleanup.
- 2026-07-18: `pnpm check:type`, `pnpm check:lint`, and `pnpm check:build` passed. The UI naming audit remains a
  report-only baseline with two unrelated Commerce findings; no 4-3 finding was reported.
- 2026-07-18: `git diff --check` passed for the working tree. Targeted formatting checks passed for every 4-3
  source/test file. Markdown durable docs and task packets are intentionally excluded by the repository formatter,
  so their whitespace is covered by the diff check and manual packet audit.
- 2026-07-18: full `pnpm check:format` was also attempted. It reports 23 existing files outside 4-3 (for example,
  Partner Request, PR discovery, and Commerce scenario paths); no 4-3 file appears in that report. It is a
  repository-format baseline item, not a reason to make unrelated formatting mutations in this slice.

## Bounded Remaining Evidence

- No distinct-origin browser journey was added: the existing System harness routes API calls through the Web-origin
  proxy and cannot prove API-host cookie isolation. The focused contract proof is deliberately not labelled as a
  production-cookie proof.
- Provider-console, FC forwarded host/proto, deployed redirect chain, and direct callback consumer inventory remain
  open under 4-3.4. They are not inferred from source, test, or naming convention.
