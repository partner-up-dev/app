# Safe Public-Edge Probe Plan

## Rehearsal

```text
resolve candidate host
  -> make a bodyless HTTPS GET to /health
  -> make a bodyless HTTPS GET to /api/meta/build
  -> on backend-edge candidates only, bodyless GET to the fixed CaoCao path
  -> record status, selected response headers, TLS success, and correlation id
  -> compare with source-derived expected method handling
```

The callback-edge request uses a distinct `X-Request-ID` and a descriptive
user-agent. It has no form body and uses GET, so the edge must reject before it
can parse, route, or forward a provider callback.

## Candidate Matrix

| Candidate | Why probe it | Safe paths |
| --- | --- | --- |
| `https://test.app-api.partner-up.cn` | Sir-named staging API origin | `/health`, `/api/meta/build`, fixed callback path |
| `https://app-api.partner-up.cn` | Sir-named production API origin | `/health`, `/api/meta/build`, fixed callback path |
| `https://test.api-app.partner-up.cn` | repository-named staging CaoCao target | `/health`, `/api/meta/build`, fixed callback path |
| `https://api-app.partner-up.cn` | repository-named production CaoCao target | `/health`, `/api/meta/build`, fixed callback path |
| `https://test.app.partner-up.cn` | staging Web origin sanity check | `/` only |
| `https://app.partner-up.cn` | production Web origin sanity check | `/` only |

## Interpretation Rules

- A DNS/TLS failure is a result about this observer's path at this timestamp;
  it is not enough to declare the deployment broken.
- `200` on `/health` is liveness evidence, not callback routing evidence.
- `405` plus `Allow: POST` on the fixed callback path is compatible with the
  repo-owned router. `404`, `401`, redirect, or `5xx` is a discrepancy or an
  inconclusive host mapping; do not infer routing from it.
- `OPTIONS` and CORS are deliberately out of the provider-proof critical path:
  provider callbacks are server-to-server and must not rely on browser CORS.
- A response body is stored only when it is a small public health/build payload;
  provider or error payloads are summarized, not copied.
