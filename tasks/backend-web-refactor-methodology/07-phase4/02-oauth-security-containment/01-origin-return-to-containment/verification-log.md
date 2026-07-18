# 4-1A Verification Log

All checks ran from the repository root without provider credentials, user cookies, OAuth codes or production writes.

| Check | Result | What it proves / does not prove |
| --- | --- | --- |
| `pnpm exec vitest run --project backend-unit apps/backend/src/lib/frontend-origin.test.ts apps/backend/src/index.cors.test.ts apps/backend/src/controllers/wechat-oauth-return-to.test.ts apps/backend/src/controllers/application-auth.test.ts` | Pass: 4 files / 16 tests | Configuration-derived CORS and return-target decisions, including `/oauth/login` and `/oauth/bind`; it does not exercise a real callback. |
| `pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts apps/web/src/shared/api/auth-required-policy.test.ts apps/web/src/processes/wechat/oauth-login.test.ts apps/web/src/processes/wechat/useRouteWeChatAutoLogin.test.ts` | Pass: 4 files / 5 tests | Existing Web OAuth/RPC caller boundary remains green; it does not prove a provider exchange. |
| `pnpm check:type:backend`, `pnpm check:lint:backend`, `pnpm check:build:backend` | Pass | Backend source is type-correct, lint-clean and buildable. |
| Selected `pr_create_form_requires_authentication_before_create` and `pr_detail_pending_wechat_join_replay_opens_join_gate` system cases | Pass: one selected case in each file | The normal login entry and pending auth-escalation seams remain green; they do not traverse real WeChat OAuth. |
| Changed-file `oxfmt --check` and `git diff --check` | Pass | Formatting and patch whitespace are clean. |

## Pending External Observation

After the change reaches each normal public deployment, send cookie-free `OPTIONS` requests with the paired Web
`Origin` and an arbitrary origin. The paired response must emit that exact `Access-Control-Allow-Origin` plus
`Access-Control-Allow-Credentials: true`; the arbitrary response must omit `Access-Control-Allow-Origin`.

This is a state-free header observation only. It deliberately does not use a real OAuth flow, user cookie, handoff
nonce, or provider console access.
