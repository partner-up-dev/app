# 4-0C — Cross-Unit Identity Journey Map

## Current Journey Table

| Journey | Observed sequence | Current proof | Gap that must not be mistaken for proof |
| --- | --- | --- | --- |
| Anonymous visit / restoration | Web bootstrap uses stored UUID and token; first use can register anonymous then request `/auth/session`; Backend checks active anonymous candidate and issues session | Selected Backend anonymous restoration scenario passed | No real-browser revisit or stale-UUID recovery proof. A stale UUID session failure currently clears browser state without proving fresh registration in that same bootstrap run. |
| Authenticated bootstrap / rotation | Web sends bearer credential; Backend resolves claims and emits `x-access-token`; Web transport persists rotation and bootstrap projects session | Focused RPC/auth-policy unit tests passed | No proof with an actually near-expiry token or a persisted user whose status/role changed after issuance. |
| OAuth callback / nonce handoff | Provider callback -> Backend state/cookie/nonce -> return URL contains nonce -> Web gate exchanges nonce with credentials -> Browser applies session/cleans URL | Source trace and durable contract agree on intended nonce-only navigation path | No executable backend/web/system handoff test exists; direct callback page is a separate compatibility path. |
| Protected PR command / continuation | A protected command records command-owned pending intent, triggers login, and post-auth replay opens its relevant UI; create uses a pre-command gate and has no replay | Selected System create gate and join-replay tests passed | Join test injects post-auth session/pending state; it does not prove the full escalation journey. Waitlist lacks an equivalent System path. |

## Cross-Unit Contract Comparison

| Contract claim | Source reading | Classification |
| --- | --- | --- |
| JWT is bearer transport and `x-access-token` carries rotation | Backend middleware and Web RPC agree | Current, local proof only. |
| Handoff navigation carries a short-lived nonce rather than bearer credentials in the URL | Navigation callback / handoff gate agree | Current source shape; lacks executable cross-unit proof. |
| Backend is authoritative for user/role state | Durable contract says so; generic token/session resolution is claims-first | Tension to resolve in `4-2`; do not rewrite the contract from source alone. |
| `AUTHENTICATED_REQUIRED` enters a shared OAuth policy | Web policy/RPC/local units agree | Current local behavior; full browser order remains unproven. |
| PR create is never auto-replayed | Browser pending-action union, negative migration test and selected System create gate agree | Current intentional invariant. |

## Security Stop Branch — Return Path, CORS And Handoff

The CORS component is now a confirmed live defect: state-free public preflights against both deployed API origins
echoed an arbitrary `Origin` while allowing credentials. The broader OAuth exposure chain remains a high-impact
**inference**, not a confirmed production incident. Current source also shows that the OAuth return-target allowlist
accepts request `Origin` / `Referer` values in `wechat.controller.ts`, while navigation handoff relies on a
credentialed cookie/nonce exchange that returns auth data. Browser cookie behavior and the deployed callback topology
are not yet demonstrated, so the complete effect cannot be asserted from source alone.

Nevertheless, this combination is too security-sensitive to leave as an incidental refactor concern. `4-1` is now
solidified to contain only the confirmed CORS/return-target authority defect using the established per-environment Web
origin, while explicitly preserving callback/cookie topology. `4-3` owns any future callback or handoff change and
must obtain provider-console evidence first. Neither slice may “fix” the issue by dynamically trusting a local
allowlist derived from request headers.

GitHub Environment variables establish the production/staging Web/API pairs, and Sir confirms FC has no manual
callback override. The actual WeChat-console authorized domain remains unobserved; it is an explicit `4-3`
compatibility/topology input, not a `4-1` blocker.

## Test Infrastructure Opportunity

The System scenario harness includes local WeChat ability mocking. A future handoff test can therefore verify callback,
nonce, cookie, URL cleanup and replay behavior without invoking an external provider.
