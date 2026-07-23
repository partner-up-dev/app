# `7-1` Legacy Surface Inventory

## A. Repository SLS Coupling — Recommend Delete

| Surface | Role |
| --- | --- |
| `apps/backend/s.yaml` | `logProject`, `logStore` variables and FC `logConfig`, including request/instance metrics |
| `.github/workflows/backend-fc-deploy.yml` | passes `ALIYUN_FC_LOG_PROJECT` / `ALIYUN_FC_LOG_STORE` |
| `scripts/ci/fc/validate_backend_env.sh` | requires both variables |
| `docs/40-deployment/backend-runtime.md` | documents both as runtime requirements |
| `docs/40-deployment/observability.md` | describes FC/SLS capture as available runtime signal |

No checked-in SLS query/dashboard/alert artifact was found.

## B. External SLS State — Closed By Operator Evidence/Decision

- saved queries;
- dashboards;
- alerts;
- indexes created solely for the legacy output;
- logstore/project retention or resources, only after confirming whether other
  workloads share them.

Deleting a shared project/logstore is not implied by deleting PartnerUp query
artifacts.

Final disposition on 2026-07-23: Sir confirms no saved SLS
queries/dashboard are configured and closes further platform-artifact
inventory for Phase 7. No SLS access, audit, or deletion by Codex is claimed;
the bullets above remain the entry-time classification rather than open work.

## C. Production Structured/Debug Output — Recommend Delete

| Surface | Classification |
| --- | --- |
| `apps/backend/src/infra/edge/caocao-callback-router.ts` logger event + JSON stdout | explicit structured-output pseudo-observability |
| `apps/backend/src/lib/commerce-order-detail-debug.ts` | Backend Commerce diagnostic output |
| `apps/web/src/domains/commerce/use-cases/order-detail-debug.ts` | browser storage/header/output side of the same debug protocol |
| Commerce debug CORS/header/controller/domain consumers | protocol support, remove as one graph |
| `hono/logger` registration in `apps/backend/src/index.ts` | production request-log convenience captured by SLS |
| WeChat OAuth trace and profile-refresh diagnostic output | production diagnostic path |
| WeCom raw-body/decrypt/cipher/padding diagnostics | production debug path; inspect sensitive-data exposure during removal |
| RideHailing map render output | browser production debug path |
| FC job-runner trigger success output | production operational convenience |

The final ledger must enumerate every exact reference before deletion.

## D. Classify Individually

- fatal process/startup errors;
- request-tail/bootstrap failures;
- provider registration scripts;
- marketing job progress output;
- browser error/fallback warnings;
- `operation_logs` SQL writes/table.

Root recommendation is to remove application-runtime diagnostics while
retaining operator-invoked CLI failure/progress output.

## E. Retain Outside Application Observability Cleanup

- database migration/seed/reset CLI output;
- static-analysis and validation script output;
- dev-server/portless lifecycle output;
- test-runner/scenario diagnostics;
- user-facing browser fallback warnings until their error-UX owner is reviewed.

These surfaces can be improved separately; their presence does not preserve
the rejected FC/SLS architecture.
