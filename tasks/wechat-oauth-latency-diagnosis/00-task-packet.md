# WeChat OAuth Latency Diagnosis

## Objective & Hypothesis

- Objective: Check whether the current WeChat OAuth implementation adds avoidable latency beyond network fluctuation and serverless cold starts.
- Hypothesis: The frontend callback handoff may add an extra page load and API round trip compared with a backend-owned OAuth callback redirect.
- Issue 217 continuation: after moving WeChat profile refresh behind the 302, observed login still takes about 5-8s while the target is 2-3s. The next slice is full front-to-back instrumentation rather than another latency guess.

## Guardrails Touched

- Root `AGENTS.md`: Reality/Diagnose mode, keep volatile diagnosis under `tasks/`.
- `docs/20-product-tdd/cross-unit-contracts.md`: session contract requires `credentials: "include"` on WeChat OAuth and bind paths.
- `docs/40-deployment/environments.md`: backend depends on `FRONTEND_URL` for share links and can use `WECHAT_OAUTH_CALLBACK_URL` for exact OAuth callback registration.
- `docs/30-unit-tdd/wechat-oauth-handoff.md`: hard-unit invariants for the backend callback plus frontend handoff gate.
- `apps/frontend/src/processes/wechat/AGENTS.md`: nearest-code maintenance tripwires for WeChat process changes.
- `apps/backend/src/controllers/AGENTS.md`: backend controller reminder to read the handoff unit TDD before changing callback/cookie behavior.
- Backend controller boundary: OAuth HTTP flow is in `apps/backend/src/controllers/wechat.controller.ts`.
- Frontend flow boundary: callback page and redirect helpers live under `apps/frontend/src`.

## Verification

- Compared implementation with WeChat service-account web authorization docs and OAuth2 RFC guidance.
- Inspected backend OAuth login/bind/callback routes and frontend callback handling.
- Implemented the backend callback handoff and frontend telemetry scrub, then verified with backend typecheck and frontend build.
- After switching to a top-level handoff gate, reran `pnpm --filter @partner-up-dev/frontend build` successfully.
- `pnpm --filter @partner-up-dev/backend typecheck` passed. `pnpm --filter @partner-up-dev/frontend lint:tokens` exited 0 while reporting existing style-governance findings outside the touched files.
- Added a hard-unit TDD page plus local frontend/backend AGENTS reminders because the handoff protocol now has non-obvious safety and UX invariants.
- New issue-217 instrumentation slice should be verified with backend typecheck plus focused frontend WeChat OAuth unit tests. Runtime proof should inspect `wechat_oauth_trace` backend events/logs and `wechat.oauth.trace` frontend user telemetry by shared `traceId`.

## Findings Snapshot

- Current login uses `snsapi_userinfo` for all OAuth starts.
- Anchor PR route auto-login can start OAuth on page load without a user click.
- WeChat redirects back to the frontend callback route when `FRONTEND_URL` is configured; the frontend then calls the backend callback API and redirects to `returnTo`.
- Login callback fetches `sns/userinfo` before checking whether the `openid` already exists locally, so returning users still pay the extra WeChat API call.
- Bind start returns JSON `{ authorizeUrl }` to frontend and relies on frontend JavaScript to navigate, while login start uses backend 302.
- The full frontend app runs on the OAuth callback route; router telemetry records `to.fullPath`, so callback query parameters can enter page-view telemetry unless explicitly filtered.

## Implementation Update

- Replaced the preferred callback target with backend `/api/wechat/oauth/callback`, with optional `WECHAT_OAUTH_CALLBACK_URL` override for the exact WeChat-registered public URL.
- Navigation callbacks now redirect to `returnTo` directly.
- Access tokens are not placed in `returnTo` query parameters or the handoff cookie; authenticated callback results use a short-lived signed handoff cookie with user id plus a non-secret `wechatOAuthHandoff` nonce, then the backend issues the frontend auth payload during handoff exchange.
- The frontend app now mounts immediately. A top-level WeChat OAuth handoff gate consumes the nonce, exchanges it with `credentials: "include"`, applies the session, and removes the nonce from the address bar before rendering route content.
- Auth bootstrap defers while a handoff nonce is pending, so it does not race the gate by registering or refreshing an anonymous session first.
- If handoff exchange is slow, the gate shows an explicit pending state instead of a blank pre-mount screen; users can keep waiting or continue as a visitor.
- Route share orchestration skips while handoff is pending and sanitizes route paths before building share targets, so the handoff nonce does not leak into share metadata after the app starts immediately.
- Route auto-login skips while a handoff nonce is pending to avoid a redirect race on `/apr/:id`.
- Telemetry page paths now strip OAuth-sensitive query/hash values such as `code`, `state`, `access_token`, and `wechatOAuthHandoff`.

## Issue 217 Instrumentation Plan

- Frontend login start creates a non-secret `traceId` and a start timestamp, stores them in `sessionStorage`, and sends them to `/api/wechat/oauth/login`.
- Backend stores the `traceId` only in signed OAuth state and signed handoff cookie payloads. The public frontend return URL still carries only the `wechatOAuthHandoff` nonce.
- Backend records route-level stages for login redirect preparation, callback state validation, WeChat code exchange, local user resolution, callback redirect, handoff receipt, and handoff completion.
- Frontend records handoff start, slow threshold, completion, failure, and visitor-abandon events with durations from the original frontend start.
- Trace data must not include OAuth `code`, `state`, WeChat access tokens, frontend access tokens, openid, or raw return URLs.
