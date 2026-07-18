# 4-3 Evidence Index

| Evidence | Source | What It Establishes | Limit |
| --- | --- | --- |
| OAuth Unit TDD | docs/30-unit-tdd/wechat-oauth-handoff.md | Nonce-only navigation, cookie scope, retry/visitor intent, direct compatibility boundary | Does not observe deployed provider/edge state |
| Backend controller trace | apps/backend/src/controllers/wechat.controller.ts | Current callback split, one-shot handoff clearing, issuer exception path, bind marker ordering | Source behavior only until tests run |
| Web process trace | apps/web/src/processes/wechat | Current boolean result/gate retry and legacy callback behavior | Source behavior only until tests run |
| Phase 4-2 exit | 03-session-identity-authority | Public identity issuance rejects operator/anonymous identities | Does not prescribe handoff failure UX |
| System harness inspection | tests/scenario infrastructure and Vite config | Existing proxy model cannot prove distinct-origin cookies | Does not block local semantic proof |
| Public-origin report | Sir's stated origins and Phase 4 docs | Domain naming disagreement and unobserved console state must remain external gaps | Not an authoritative topology measurement |
| Focused Backend scenario | `apps/backend/tests/auth/wechat-oauth-handoff.scenario.test.ts` | Navigation handoff/no-token/replay, direct JSON compatibility, and bind-marker failure behavior | Uses mock OAuth and an app request cookie jar; not a distinct-origin browser proof |
| Focused Web tests | `apps/web/src/processes/wechat/*.test.ts`, `apps/web/src/pages/WeChatOAuthCallbackPage.test.ts` | Typed terminal/retryable state, gate recovery, returnTo/URL sanitization, and direct-page cleanup | Mocked RPC/browser seams; not a provider or edge observation |
| Static/build checks | `pnpm check:type`, `pnpm check:lint`, `pnpm check:build` | Changed Backend/Web source compiles, lints, and builds | Does not establish runtime topology |
