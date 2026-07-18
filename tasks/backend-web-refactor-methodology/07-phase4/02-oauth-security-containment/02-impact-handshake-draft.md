# 4-1 Impact Handshake Draft

This is a checkpoint for a future authorized mutation, not an implementation plan or a durable contract change.

## Address And Object

- Backend CORS policy: `apps/backend/src/index.ts`.
- OAuth return-target authority: `apps/backend/src/controllers/wechat.controller.ts`.
- Deployment input authority: `FRONTEND_URL` from the selected GitHub Environment; Sir confirms no FC-side override.
- Backend/Web callback, cookie, handoff and compatibility pages are explicit preserved boundaries, not edit targets.

## Proposed State Diff

| From | To |
| --- | --- |
| CORS reflects an arbitrary request origin while permitting credentials. | CORS accepts an explicit environment-owned set only: Production Web origin to Production API; Staging Web origin to Staging API; local/test rules remain separately explicit. |
| `returnTo` origin accepts request-derived `Origin` / `Referer` candidates. | `returnTo` accepts only the explicit, environment-owned public Web return origin(s), independently of caller-supplied headers. |
| Callback, cookie, handoff body and frontend callback compatibility are present. | Unchanged by `4-1`; their topology is verified and evolved only in `4-3`. |

The implementation must not add a broad “origin service” or move user-domain decisions into transport code. It must
use one narrow configuration-derived predicate for both CORS and `returnTo` decisions.

## Blast Radius Forecast

- Credentialed browser-to-API RPC, including OAuth login/bind callers and the legacy callback page.
- OAuth return navigation destination, without changing callback selection or handoff mechanics.
- Local development, System scenarios and deployment Environment variables.
- CORS-facing operational/debug flows that currently use direct browser API access.

## Invariants

1. Long-lived frontend or provider tokens never enter route query/hash or redirect `Location`.
2. Navigation handoff query carries only a short-lived nonce; the cookie is HttpOnly, short-lived and path-scoped.
3. Web-to-API flows that require cookies retain `credentials: "include"` only for the explicit trusted origins.
4. No cross-environment return path is implicitly allowed.
5. API callback selection, cookies, handoff response and the legacy frontend callback route stay byte-for-byte
   behaviorally unchanged by this slice.
6. Anonymous/authenticated product behavior and PR create no-replay remain unchanged.

## Verification Contract

- Unit/API proof that paired origin is allowed and arbitrary/other-environment origin is rejected, for both normal and
  preflight requests.
- API proof that hostile `returnTo`, `Origin` and `Referer` cannot select a return origin.
- Existing focused OAuth/login units demonstrate that the unchanged caller shape still compiles and routes correctly.
- Focused production read-only recheck of response headers after deployment; no real OAuth exchange required for the
  CORS assertion.

## Stop Conditions

- A required consumer needs cross-environment return navigation or an undisclosed alias.
- The proposed change cannot retain cookie/nonce and no-token-in-URL invariants.
