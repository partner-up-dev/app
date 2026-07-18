# 4-1A Evidence Index

## Source And Runtime Evidence

| ID | Evidence | Supports |
| --- | --- | --- |
| E-1 | Parent [topology and live evidence](../01-topology-and-live-evidence.md) | The pre-change public APIs reflected arbitrary origins with credentials; the selected environment owns one paired Web/API origin. |
| E-2 | `apps/backend/src/lib/frontend-origin.ts` | One HTTP(S), `FRONTEND_URL`-derived authority for CORS and OAuth return targets. |
| E-3 | `apps/backend/src/index.ts` and `apps/backend/src/controllers/wechat.controller.ts` | CORS and both OAuth entry routes consume the shared authority; callback, cookie and handoff code are outside the diff. |
| E-4 | `apps/backend/src/{index.cors.test.ts,lib/frontend-origin.test.ts,controllers/wechat-oauth-return-to.test.ts}` | Positive and hostile-origin behavior at helper, app and route seams. |
| E-5 | `docs/20-product-tdd/cross-unit-contracts.md`, `docs/30-unit-tdd/wechat-oauth-handoff.md`, `docs/40-deployment/backend-runtime.md` | Durable, generative owner rules created from the proven source behavior. |

## Verification Evidence

| ID | Method | Result |
| --- | --- | --- |
| V-1 | Focused Backend units/controllers plus the existing application-auth guard | Pass: 4 files / 16 tests. |
| V-2 | Focused Web OAuth/RPC units | Pass: 4 files / 5 tests; frozen frontend boundary remains unchanged. |
| V-3 | Backend type, lint and build gates | Pass. |
| V-4 | Selected provider-free System PR-create and PR-join-pending-replay scenarios | Pass: one selected case in each scenario file. |
| V-5 | Changed-file Oxfmt and `git diff --check` | Pass. |
| V-6 | GitHub Actions staging deploy runs for commit `e4a51716` | Pass: Backend FC and Web ESA completed successfully; Backend deploy log records the new commit hash. |
| V-7 | Cookie-free staging paired/arbitrary CORS probe | Blocked before HTTP: this agent environment timed out against every resolved FC IP and the paired ESA Web origin. |

The exact commands, scope caveats and external-observation blocker are in the [verification log](./verification-log.md).
