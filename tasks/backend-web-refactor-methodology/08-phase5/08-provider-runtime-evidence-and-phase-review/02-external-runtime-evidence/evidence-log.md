# 5-7a External Evidence Log

## Run Metadata

- Started: `2026-07-21T02:13:28Z`
- Operator authority: Sir authorized external runtime evidence on 2026-07-21.
- Probe class: read-only public DNS/TLS/HTTP route observation; no provider
  credential, body, signed callback, payment, or order request.

## Safe Public-Probe Transcript

Run window: `2026-07-21T02:13:28Z`–`2026-07-21T02:18:29Z`.

### DNS Observation

The current resolver returned an IPv4 answer for:

- `app.partner-up.cn`, `test.app.partner-up.cn`;
- `api-app.partner-up.cn`, `test.api-app.partner-up.cn`; and
- `ec1.sz.partner-up.host` (the host named by the callback-edge deployment
  document).

It returned no IPv4 answer for the Sir-supplied `app-api.partner-up.cn` and
`test.app-api.partner-up.cn` names. This is only an observation through the
current resolver, not an authoritative DNS-zone conclusion or evidence that a
deployment is unhealthy.

### HTTPS Observation

All requests were bodyless `GET`s with a dedicated, non-sensitive request id;
no callback form, payment JSON, signature, provider id, cookie, or credential
was sent. Normal and explicitly direct IPv4 requests (`--noproxy '*'`) both
timed out during connection setup after seven seconds:

| Target set | Result | Interpretation |
| --- | --- | --- |
| `https://test.api-app.partner-up.cn/{health,api/meta/build}` | `curl (28)`, HTTP `000` | no remote HTTP/TLS response observed |
| `https://api-app.partner-up.cn/{health,api/meta/build}` | `curl (28)`, HTTP `000` | no remote HTTP/TLS response observed |
| staging backend target and `ec1.sz.partner-up.host` fixed CaoCao callback path | `curl (28)`, HTTP `000` | no route/method admission result observed |
| `https://{app,test.app}.partner-up.cn/` | `curl (28)`, HTTP `000` | no public Web response observed |
| independent `https://example.com` control | `curl (28)`, HTTP `000` | the current executor's general public-HTTPS path is unavailable |

No standard `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, or `NO_PROXY` environment
variable was present. The control timeout means these results must be classified
as an **observer-path limitation**, not as a PartnerUp deployment failure.

## Result Ledger

| Fact | Result | Evidence | Limits |
| --- | --- | --- | --- |
| Candidate origin name resolution | observed, resolver-scoped | DNS observation above | not authoritative DNS or HTTPS liveness proof |
| Candidate-origin HTTPS reachability | not established | all bodyless probes and independent control timed out before TLS/HTTP | current executor has no usable public-HTTPS path |
| CaoCao callback-edge method admission | not established | no remote response to bodyless `GET` on fixed path | cannot establish routing/body/header/signature behavior |
| CaoCao signed staging callback receipt | not established | requires provider/operator safe smoke | no safe external `POST` was sent by this task |
| WeChatPay notify base URL / signed receipt | not established | requires provider/operator safe smoke or operator-controlled receipt | public liveness is insufficient |

## Redaction Rule

Do not add provider keys, callback bodies, signatures, merchant references,
order IDs, cookies, authorization headers, or personally identifying data.
