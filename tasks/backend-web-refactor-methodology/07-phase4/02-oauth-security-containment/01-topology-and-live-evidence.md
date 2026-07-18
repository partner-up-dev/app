# 4-1 Pre-Handshake Topology And Live Evidence

## Environment Pairing

Sir supplied the public Web origins. A read-only GitHub Environment variable inventory on 2026-07-18 establishes the
currently configured pairings:

| Environment | Web origin (`FRONTEND_URL`) | API origin (`VITE_API_URL` / payment base) |
| --- | --- | --- |
| Production | `https://app.partner-up.cn` | `https://api-app.partner-up.cn` |
| Staging | `https://test.app.partner-up.cn` | `https://test.api-app.partner-up.cn` |

`app-api.partner-up.cn` and `test.app-api.partner-up.cn` are not the current configured API hostnames. They did not
resolve from the probe resolver, while current deployment documentation and a historical “verified DNS” correction
use the `api-app` order. This does not rule out a private alias, but it must not enter an allowlist without a named
owner.

The GitHub deployment workflow passes the optional `WECHAT_OAUTH_CALLBACK_URL` from Environment variables. It was
absent from both current Environment inventories, so the normal workflow supplies an empty value. Sir confirmed that
FC has no non-CI variable override. Current source therefore derives the backend callback from the public API request
host/protocol. Sir expects the WeChat OAuth authorized domain to be `api-app.partner-up.cn`; the console itself remains
unobserved, so this is an operational assertion to preserve rather than a console-attested fact.

## Public Read-Only Probe Results

The probes used no cookies, authorization, OAuth code, state or handoff nonce.

| Check | Production | Staging | Interpretation |
| --- | --- | --- | --- |
| Web root `HEAD` | `app.partner-up.cn` returned ESA/OSS edge-delivered HTML | `test.app.partner-up.cn` returned ESA/OSS edge-delivered HTML | ESA is an actual delivery/cache edge. There is no repository evidence of a separate custom CORS layer. |
| API `/health` `HEAD` | `api-app.partner-up.cn` returned `200` with FC request metadata | `test.api-app.partner-up.cn` returned `200` with FC request metadata | The configured API origins are publicly reachable FC surfaces. |
| API `OPTIONS /api/wechat/oauth/handoff` with paired Web origin | `204`, `Access-Control-Allow-Origin: https://app.partner-up.cn`, `Access-Control-Allow-Credentials: true` | Same result for `https://test.app.partner-up.cn` | Expected paired-origin behavior is live. |
| Same preflight with `Origin: https://topology-probe.invalid` | `204`, the response echoed that untrusted origin and allowed credentials | Same result | **Live, confirmed credentialed CORS reflection.** This is not merely a source inference. |

The API result matches `apps/backend/src/index.ts`, which currently reflects `Origin` while enabling credentials. It
does not prove an end-to-end OAuth token leak by itself. The callback/return-target/cookie/browser parts of that chain
are captured as a separate inference in the handshake.

## Callback Topology Facts

Current source and durable contracts describe this intended navigation path:

```text
WeChat
  -> API /api/wechat/oauth/callback
  -> Web returnTo?wechatOAuthHandoff=<nonce> plus short-lived API-host cookie
  -> Web AppRoot handoff gate
  -> credentialed API /api/wechat/oauth/handoff
```

The fallback callback URL is the API public host plus `/api/wechat/oauth/callback`; the optional callback override
can change that. `apps/web/src/pages/WeChatOAuthCallbackPage.vue` is an intentional compatibility window for the old
frontend-callback shape, not removable dead code. No current executable scenario proves either hosted shape.

## Confidence Boundary

| Claim | Confidence | Reason |
| --- | --- | --- |
| Current GitHub deployment input pairs | High | Read directly from the staging/production GitHub Environment variable inventories. |
| API CORS reflects untrusted origin with credentials | High | Reproduced against both public API origins using state-free preflight. |
| Workflow uses inferred backend callback when no override is supplied | High | Environment inventory plus deploy workflow and current source agree. |
| Running FC has no manual override | High | Sir explicitly confirmed it; deployment input also contains no callback override. |
| WeChat console registers the inferred API callback | Operational assertion | Sir expects `api-app.partner-up.cn`, but the console was not inspected. `4-1` preserves topology; `4-3` must verify before changing it. |
| Full browser OAuth/handoff exposure chain is reachable | Inference | Cookie policy, callback registration and browser behavior must still be proven. |
