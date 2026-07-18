# 4-1 Verification Log

All checks ran from the repository root without provider credentials, user cookies, OAuth codes or production writes.

| Check | Result | What it proves / does not prove |
| --- | --- | --- |
| `pnpm exec vitest run --project backend-unit apps/backend/src/lib/frontend-origin.test.ts apps/backend/src/index.cors.test.ts apps/backend/src/controllers/wechat-oauth-return-to.test.ts apps/backend/src/controllers/application-auth.test.ts` | Pass: 4 files / 16 tests | Configuration-derived CORS and return-target decisions, including `/oauth/login` and `/oauth/bind`; it does not exercise a real callback. |
| `pnpm exec vitest run --project frontend-unit apps/web/src/lib/rpc.test.ts apps/web/src/shared/api/auth-required-policy.test.ts apps/web/src/processes/wechat/oauth-login.test.ts apps/web/src/processes/wechat/useRouteWeChatAutoLogin.test.ts` | Pass: 4 files / 5 tests | Existing Web OAuth/RPC caller boundary remains green; it does not prove a provider exchange. |
| `pnpm check:type:backend`, `pnpm check:lint:backend`, `pnpm check:build:backend` | Pass | Backend source is type-correct, lint-clean and buildable. |
| Selected `pr_create_form_requires_authentication_before_create` and `pr_detail_pending_wechat_join_replay_opens_join_gate` system cases | Pass: one selected case in each file | The normal login entry and pending auth-escalation seams remain green; they do not traverse real WeChat OAuth. |
| Changed-file `oxfmt --check` and `git diff --check` | Pass | Formatting and patch whitespace are clean. |
| Staging Backend FC GitHub Actions [run 29634355980](https://github.com/partner-up-dev/app/actions/runs/29634355980) | Pass | The FC deployment completed; its log records `BACKEND_COMMIT_HASH` changing to `e4a51716`. It is deployment evidence, not a public CORS header observation. |
| Staging Web ESA GitHub Actions [run 29634355990](https://github.com/partner-up-dev/app/actions/runs/29634355990) | Pass | The paired Web deploy completed. No Web source changed in this slice. |
| Cookie-free staging `OPTIONS`/`GET /health` with paired and arbitrary `Origin` headers | Blocked before HTTP | All four requests timed out at TCP connection. DNS resolved `test.api-app.partner-up.cn` to all four FC addresses, and pinning each address also timed out; the paired ESA Web origin timed out too. This is not a CORS result. |

## Pending External Observation

The staging deployment is complete, but this execution environment cannot reach the public China endpoints. From a
China-reachable runner or browser network, send cookie-free `OPTIONS` requests with the paired Web `Origin` and an
arbitrary origin. The paired response must emit that exact `Access-Control-Allow-Origin` plus
`Access-Control-Allow-Credentials: true`; the arbitrary response must omit `Access-Control-Allow-Origin`.

```sh
curl --silent --show-error --dump-header - --output /dev/null --request OPTIONS \
  --header 'Origin: https://test.app.partner-up.cn' \
  --header 'Access-Control-Request-Method: GET' \
  https://test.api-app.partner-up.cn/health
```

Repeat with `Origin: https://topology-probe.invalid`; then repeat both origins with a normal `GET /health` request.
The same procedure remains pending for production after its normal deployment.

This is a state-free header observation only. It deliberately does not use a real OAuth flow, user cookie, handoff
nonce, or provider console access.
