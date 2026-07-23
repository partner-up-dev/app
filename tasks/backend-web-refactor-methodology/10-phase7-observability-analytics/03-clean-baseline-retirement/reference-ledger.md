# `7-2` Reference Ledger

Status: frozen against `537a9b4f` on 2026-07-23; execution dispositions are
updated per batch.

| Reference family | Expected disposition | Source proof | Verification |
| --- | --- | --- | --- |
| FC `logConfig` and SLS variables | **deleted locally** | `apps/backend/s.yaml` variables and `logConfig` | zero config refs + deploy dry-run; real `s deploy` remains external proof |
| CI/env-validator SLS inputs | **deleted locally** | `.github/workflows/backend-fc-deploy.yml`; `scripts/ci/fc/validate_backend_env.sh` | shell syntax + dry-run without SLS variables |
| durable FC/SLS claims | **rewritten** | `docs/40-deployment/backend-runtime.md`; `observability.md` | stale-claim search + link review |
| external saved SLS artifacts | **closed by operator evidence/decision** | repository contains no saved-query artifact; Sir confirms no configured SLS saved query/dashboard exists and no further inventory is required | do not claim platform access/deletion by Codex; deployed-revision proof remains ordinary rollout evidence |
| CaoCao callback structured logger | delete | core logger event/config/log calls plus long-lived router entry stdout and focused tests | routing/status tests + zero refs |
| RideHailing listing structured stdout | **deleted locally** | `offer-listing.ts` emitted route/provider/session/error-stack JSON through `process.stdout.write`; full System execution exposed the missed non-`console.*` path | zero marker/stdout references + full RideHailing System coverage |
| Commerce debug protocol | delete atomically | two debug modules; Backend controller/domain propagation; CORS headers; Web headers/IDs/watches/map output | zero refs + focused Backend/Web tests |
| Hono request logger | delete | `apps/backend/src/index.ts` import/conditional middleware plus obsolete test toggles | index/CORS tests + zero refs |
| OAuth/WeCom diagnostics | delete production diagnostic output | Backend OAuth trace/query/state propagation; WeCom raw/decrypt/cipher/padding helpers/output; preserve Web `wechat_oauth_trace` event | focused Backend/Web auth/WeCom tests |
| runtime fatal/bootstrap output | delete application diagnostics while preserving failure/control behavior; retain local server/CLI UX | bootstrap/global-500/request-tail/job-trigger/marketing output classified separately from DB/provider-registration CLI | owner-focused tests + runtime console audit |
| `operation_logs` | forward-retire table, entity, repository/service, writers, tests and guidance | writer/reader/data audit | migration + zero refs |
| `notification_deliveries` | retain | Phase 6 compatibility evidence | no accidental migration |
| CLI/dev/test and fallback output | retain | DB/migration/seed/static/provider-registration CLI; local server start; dev-only telemetry; browser fallback behavior; test/scenario output | scope audit |

## Dirty-Worktree Boundary

The current worktree contains unrelated formatter/toolchain changes. Runtime
cleanup overlaps only formatter/blank-line changes in:

- `apps/backend/src/controllers/wecom.controller.test.ts`;
- `apps/web/src/domains/commerce/queries/ride-hailing-reconciliation.ts`;
- `apps/web/src/domains/commerce/queries/useCommerce.test.ts`; and
- `apps/web/src/pages/CommerceOrderDetailPage.vue`.

Implementation must preserve those edits and never use whole-file checkout or
reset.
