# 4-0A — Backend Session And Identity Authority Map

## Current Owner Map

| Concern | Current code owner | Observed boundary | Confidence / implication |
| --- | --- | --- | --- |
| Auth vocabulary and role classification | `apps/backend/src/auth/types.ts` | `anonymous`, `authenticated`, `service`, `analytics`; non-anonymous is the current helper predicate | Fact. This is broader than a public-user-only authorization rule. |
| JWT issue/verify | `apps/backend/src/auth/jwt.ts` | One HMAC JWT format; verified claims/expiry; non-anonymous requires `sub` | Fact. Claim validation is not a current-user lookup. |
| Request auth and token rotation | `apps/backend/src/auth/middleware.ts` | Bearer token becomes context auth; absent/invalid token falls back to anonymous; `x-access-token` is emitted after the response | Fact. Invalid bearer does not currently surface as a 401 at this boundary. |
| Operator context | `apps/backend/src/auth/admin-middleware.ts` | Reuses request auth/roles for admin routes | Separate context. It is not included in public-user convergence. |
| Anonymous cookie | `apps/backend/src/auth/anonymous-session.ts` | Signed HttpOnly cookie supports anonymous continuity in controller/OAuth paths | Fact. `/auth/session` itself is UUID-body based rather than a general cookie restore endpoint. |
| Session/register endpoints | `apps/backend/src/controllers/auth.controller.ts` | Directly composes `UserRepository`, anonymous restore and session issuance | Controller currently contains user/session orchestration that a later slice must either preserve deliberately or move behind a named user owner. |
| User lifecycle and current user | `apps/backend/src/domains/user/` | Anonymous registration, WeChat upgrade, bind/current-user and OpenID resolution are distributed among named use cases/services | Fact. This is the natural candidate owner for user lifecycle decisions, not proof that all HTTP/session concerns belong there. |
| OAuth callback and handoff | `apps/backend/src/controllers/wechat.controller.ts` plus `WeChatOAuthService` | Controller owns provider callback, state, cookies, handoff nonce and some user resolution/upgrade orchestration | Fact. It is a cross-boundary adapter with a compatibility burden, not merely a provider client. |

## Sequence Facts That Shape Later Slices

1. Middleware verifies JWT structure/signature and sets request context before controllers execute; it does not load
   persisted user status/roles. `/auth/session` similarly returns a supplied non-anonymous token without a current
   user recheck.
2. Anonymous restoration checks an active anonymous user before issuing a refreshed anonymous session. This has a
   focused backend scenario proof, but not a browser revisit proof.
3. OAuth navigation callback redirects with a nonce handoff; the non-navigation callback compatibility path can
   return an auth payload. Handoff exchange consumes a short-lived cookie/nonce and returns an auth payload.
4. The callback controller repeats parts of user lookup/create/upgrade orchestration that also exist under
   `domains/user`. This is a candidate authority split, not a safe extraction target until the session and callback
   contracts are selected.

## Pressure Points And Open Questions

| ID | Observation | Why it matters | Next owner |
| --- | --- | --- | --- |
| B-1 | JWT claim validity and persisted active-user validity are distinct; source does not currently join them at generic request/session resolution. | A disabled/deleted user or changed role may remain representable until another boundary checks state. | `4-2` session/identity authority. |
| B-2 | Public user/WeChat guards use a non-anonymous predicate in some places, while PR mutations require the explicit `authenticated` role. | `service`/`analytics` claims may be treated differently across public routes. The intended policy is not yet documented. | Sir decision, then `4-2`; keep admin separate. |
| B-3 | OAuth callback errors use compatibility envelopes in places where the general contract favors Problem Details. | Changing error shape can break callback clients and must not be folded into a structural move. | `4-3` compatibility decision. |
| B-4 | Legacy `WeChatAuthSessionService` / `WeChatLoginService` appear to have no production consumer. | Likely retirement candidates, but absence must be re-proven immediately before deletion. | `4-5` conditional closure. |

## Smallest Useful Proofs

- Existing anonymous UUID restoration scenario: passed and proves active anonymous UUID restoration at the Backend
  boundary.
- Existing `application-auth` unit: passed but only proves an unauthenticated Problem Details seam; it is not OAuth
  or session-lifecycle proof.
- No executable Backend/Web/System handoff proof was found. The scenario harness already has a local WeChat mock, so
  `4-3` can add provider-free proof rather than call a real provider.
