# 4-4.4 System-Harness Canonical-Host Limitation

## Attempt

```text
pnpm vitest run --project system-scenario tests/scenario/pr/pr-detail-anonymous-oauth-join.scenario.test.ts
```

The browser reached the real anonymous PR join command. The real Backend OAuth login endpoint then returned the
mock-authorize redirect, with backend trace events `backend_login_received` and
`backend_login_redirect_prepared (branch=mock)`.

## Observed Stop

The browser then navigated to:

```text
http://localhost:<frontend-port>/api/wechat/oauth/callback?state=...&code=mock-oauth-code
```

The System harness initially served the frontend at `http://127.0.0.1:<frontend-port>`. The Vite-proxied backend
generated `localhost` as the mock callback host. Because the OAuth state and handoff cookies are host-scoped, the
browser did not return to the PR URL with `wechatOAuthHandoff`, and no callback/handoff completion trace occurred.

A temporary request-host rewrite did not intercept the browser navigation and was removed. No cookie was injected,
copied, or forged, and no origin was collapsed merely to make the test pass.

## Honest Lower Proof

- `apps/backend/tests/auth/wechat-oauth-handoff.scenario.test.ts` passes and proves local mock login -> navigation
  callback -> one-shot handoff-cookie consumption.
- `apps/web/src/domains/pr/use-cases/usePRPendingWeChatReplay.test.ts` and the adjacent 4-4 focused suite prove
  pending-intent consumption and command ordering.
- The existing browser replay scenario
  `pr_detail_pending_wechat_join_replay_opens_join_gate` currently fails before its continuation assertion at
  `pr-detail.join.confirm` timeout, so it is not treated as passing evidence.

## Re-entry Condition

To add the missing browser proof, make the System harness use one canonical hostname for both its frontend page and
the Vite-proxied OAuth callback, or expose a supported same-origin callback base. Reintroduce this exact journey
only after that test-topology precondition exists. This condition does not settle 4-3.4 provider, edge, or
production cross-origin evidence.
