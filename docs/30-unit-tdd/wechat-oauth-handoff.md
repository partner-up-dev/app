# WeChat OAuth Handoff Unit TDD

## Role

The WeChat OAuth handoff unit preserves a safe browser return path after WeChat redirects back to the backend OAuth callback.

It exists because the product currently uses frontend-held application access tokens, while OAuth callback completion must not expose long-lived bearer credentials in URL query parameters.

## Durable Inputs

- Product TDD session contract: `docs/20-product-tdd/cross-unit-contracts.md`
- Backend callback and handoff route: `apps/backend/src/controllers/wechat.controller.ts`
- Frontend app gate and exchange flow: `apps/web/src/processes/wechat/*`
- Frontend auth bootstrap: `apps/web/src/processes/auth/useAuthSessionBootstrap.ts`
- Route share orchestration: `apps/web/src/domains/share/use-cases/useRouteShareOrchestrator.ts`

## Local Invariants

- The backend OAuth navigation callback must not put the frontend access token, WeChat OAuth access token, code, or state into `returnTo`.
- OAuth login and bind resolve `returnTo` only against the deployment-owned `FRONTEND_URL`: absent values use that URL,
  relative values stay under its origin, and absolute HTTP(S) values must have exactly that origin. `Origin`,
  `Referer`, request host, and forwarded-host headers cannot broaden the return authority.
- The `wechatOAuthHandoff` query value is a nonce only. Treat it as non-secret but sensitive enough to remove from browser-visible URLs and telemetry.
- The signed handoff cookie is short-lived, HttpOnly, path-scoped to the handoff endpoint, and must not contain the frontend access token.
- Handoff exchange must use `credentials: "include"` so the path-scoped signed cookie reaches the backend.
- Handoff exchange is single-use from the frontend perspective: success removes the nonce from the address bar and applies the returned auth session.
- An expected handoff or callback rejection is never an implicit anonymous-auth response: it must not carry an
  access-token body or `x-access-token` header. The error response policy must remain explicit even when the
  application-wide error serializer is used.
- The direct JSON callback is a compatibility contract separate from navigation handoff. Keep its
  `{ ok, returnTo, auth? | error }` shape until its producers and consumers are observed; apply its auth projection
  only on an explicit successful payload.
- Auth bootstrap must defer while a handoff nonce is pending. It must not register or refresh an anonymous session before the handoff gate resolves.
- Route auto-login must not redirect to WeChat while a handoff nonce is pending.
- Route auto-login must wait for auth bootstrap before deciding whether the current PR route needs WeChat OAuth.
- OAuth login redirects are single-flight in the frontend runtime. Route auto-login, RPC auth-required handling, and compatibility auth-error handling share the same login redirect policy.
- Route share orchestration must not build share targets or revisions from a route that still contains the handoff nonce.
- The frontend RPC auth policy starts this OAuth login flow when an API response is `401` with problem code `AUTHENTICATED_REQUIRED`.
- `AUTHENTICATED_REQUIRED` means the command requires the product `authenticated` role. In the current product, that role is obtained through WeChat OAuth login or anonymous-user WeChat upgrade.

## UX Semantics

- The app should mount immediately; handoff must not create a blank pre-mount wait.
- The route content remains gated while handoff is pending, so page-level queries and route auto-login do not run under the wrong anonymous identity.
- Slow network is a UI state, not immediate failure. After the slow threshold, show an explicit pending state while the original exchange continues.
- A user may choose to continue as a visitor. That action cancels the local wait, removes the nonce from the URL, and lets normal auth bootstrap proceed.
- A received terminal result (a 4xx handoff response or unusable successful payload) consumes the current handoff
  attempt: remove the nonce, keep the recovery surface visible, and offer a fresh login or visitor continuation.
- A thrown transport error or 5xx response is consumption uncertainty. Retain the nonce and offer retry; a later
  received terminal response closes that same attempt.
- API-command initiated OAuth returns to the current browser URL. Command owners remain responsible for any domain-specific pending-action replay state they need after handoff.

## Failure Semantics

- Missing, mismatched, expired, already-consumed, or public-identity-rejected handoff data is a terminal failed
  handoff, not an anonymous success.
- Retrying is valid only for transport uncertainty while the URL still contains the nonce. Clearing the nonce is the
  boundary after which the app must stop trying to complete that handoff.
- The direct callback page reads its code/state once, then removes OAuth-sensitive query values and hash data from
  the address bar before it presents a result. It must not expose provider details or bearer credentials to the
  route.

## Verification Expectations

For code changes in this unit:

- Run backend typecheck when backend callback, cookie, route, or payload code changes.
- Run frontend build when frontend gate, auth bootstrap, router, or share orchestration code changes.
- Confirm sensitive route cleaning still covers `code`, `state`, `access_token`, `token`, and `wechatOAuthHandoff`.
- Characterize both callback contracts when changing this unit: navigation success uses nonce plus scoped cookie;
  direct JSON success retains its legacy body, and direct failure does not project or rotate auth.
- Review the redirect sequence manually when changing callback URLs or cookie options:
  1. WeChat redirects to backend callback.
  2. Backend validates state and identifies/upgrades the user.
  3. Backend sets short-lived handoff cookie and redirects to `returnTo` with nonce.
  4. Frontend gate exchanges nonce with credentials included.
  5. Frontend applies auth session and removes nonce before rendering route content.
