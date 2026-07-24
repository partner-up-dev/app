# Phase 7 Corrected Evidence Index

Baseline: `537a9b4f`.

| ID | Kind | Finding | Primary anchors |
| --- | --- | --- | --- |
| P7-E001 | Durable | Business facts, user telemetry and program behavior are separate signal families; none of the evidence planes may control semantic or Job state | `docs/20-product-tdd/analytics-and-telemetry-contracts.md:5-22`; `docs/40-deployment/observability.md:42-82` |
| P7-E002 | Source/deployment | Repository FC/SLS coupling consists of FC variables and `logConfig`, deploy-workflow variables, environment validation and deployment documentation | `apps/backend/s.yaml:8-12,51-58`; `.github/workflows/backend-fc-deploy.yml:42-43`; `scripts/ci/fc/validate_backend_env.sh:104-105`; `docs/40-deployment/backend-runtime.md:50-51` |
| P7-E003 | Search/external boundary | No checked-in SLS query/dashboard/alert definition was found outside task evidence; Sir later confirmed no configured SLS saved query/dashboard exists and closed further platform inventory | source-wide SLS/logstore/query artifact search excluding `tasks/`, dependencies and generated output; D7-04 operator evidence/decision |
| P7-E004 | Source | CaoCao callback routing defines a structured log-event contract and defaults to `console.info(JSON.stringify(event))` | `apps/backend/src/infra/edge/caocao-callback-router.ts:35-54,108-110` |
| P7-E005 | Source/count | Current runtime/debug console search finds 70 calls across Backend source/FC trigger and Web source; the set mixes production diagnostics with user-facing fallback/dev output and needs classification, not bulk deletion | scoped `rg` command below |
| P7-E006 | Source/count | Commerce debug crosses browser storage/headers, Backend CORS, runtime readers and console output; 248 baseline semantic references justify one coherent retirement ledger | `apps/web/src/domains/commerce/use-cases/order-detail-debug.ts`; `apps/backend/src/index.ts:87-101`; `apps/backend/src/lib/commerce-order-detail-debug.ts` |
| P7-E007 | Durable/conflict | Deployment truth already says FC capture/console JSON is not governed observability, while earlier sections still list configured SLS logs as an available runtime signal | `docs/40-deployment/observability.md:17-25,53-82` |
| P7-E008 | Source/count | `operationLogService` has 25 production writers, no external query caller, fire-and-forget writes and swallowed failure; it is separate from SLS cleanup | `apps/backend/src/infra/operation-log/operation-log.service.ts:23-45`; `operation-log.repository.ts:9-44` |
| P7-E009 | Compatibility | `notification_deliveries` is historical compatibility and cannot be retired without the future professional replacement/data decision | `docs/20-product-tdd/notification-contracts.md:319-332,421-442`; `apps/backend/src/entities/notification-delivery.ts` |
| P7-E010 | Source/SSoT | Web owns snake_case event/payload contracts and mapping separately from the Backend Event Registry | `apps/web/src/shared/telemetry/events.ts`; `apps/web/src/shared/telemetry/track.ts:39-52`; `apps/backend/src/infra/telemetry/user-event-registry.ts` |
| P7-E011 | Source/non-authority | Successful PR commands await telemetry ingest after business persistence, allowing telemetry failure to change the HTTP result | `apps/backend/src/controllers/partner-request.controller.ts:126-166,333-345,373-413`; `apps/backend/src/infra/telemetry/request-event-recorder.ts:25-47` |
| P7-E012 | Source/fact boundary | Create/join/retention use fact views; PR Discovery selects raw telemetry payload and parses it in TypeScript | `apps/backend/src/infra/analytics/pr-create-funnel.ts`; `pr-join-funnel.ts`; `bi-overview.ts`; `pr-discovery-funnel.ts:13-35`; `pr-discovery-funnel.model.ts` |
| P7-E013 | Source/complexity | `AdminAnalyticsPage.vue` is 1,206 lines, `track.ts` 455 lines and the Backend registry 355 lines at the baseline | baseline `git show ... | wc -l` commands |
| P7-E014 | Metric gap | PR primary-action impression/click is gated by reminder support while Join capability is not; current population cannot be generalized without a formula | `apps/web/src/domains/pr/use-cases/usePRPrimaryActionTelemetry.ts:22-58`; `apps/backend/src/domains/pr/services/partner-section-view.service.ts:291-324` |
| P7-E015 | Verification gap | Current System Analytics coverage proves access only; it does not prove source attribution or backend-confirmed telemetry failure isolation | `tests/scenario/admin/admin-analytics-access.scenario.test.ts:28-50` |
| P7-E016 | Registry/fact gap | All six PR Discovery events have strict Registry payloads and `pr_discovery_funnel` BI usage, but the fact-reference guard currently declares only Create/Join groups and verifies TypeScript-declared names rather than the migrated SQL view definition | `apps/backend/src/infra/telemetry/user-event-registry.ts:90-115,190-222`; `apps/backend/src/infra/analytics/fact-event-references.ts:1-46`; `fact-event-references.test.ts:7-22` |
| P7-E017 | Context topology | Web captures incoming SPM before route telemetry, persists it for the browser session and places it in route-event attributes; PR Discovery payload intentionally remains raw/strict without SPM | `apps/web/src/app/router.ts:456-465`; `apps/web/src/shared/telemetry/spm-attribution.ts:29-62`; `apps/web/src/shared/telemetry/track.ts:364-402` |
| P7-E018 | API inconsistency | Discovery validates `startAt < endAt` at the controller, while the other Analytics endpoints defer invalid order to model exceptions; all Backend models default to seven days while Web defaults to thirty | `apps/backend/src/controllers/analytics.controller.ts:14-47`; `apps/web/src/pages/AdminAnalyticsPage.vue:519-570` |
| P7-E019 | Time-boundary risk | BI lifecycle SQL reinterprets an ISO PR time value using `::timestamp`, conflicting with the durable timezone-aware `timestamptz` boundary | `apps/backend/src/infra/analytics/bi-overview.ts:123-151`; `docs/20-product-tdd/bi-domain-contracts.md:34-50` |
| P7-E020 | Web ownership | Three role-protected Analytics routes share one 1,206-line page that owns route switching, four queries, filters, presentation and panels; Analytics hooks live under Admin and have no focused Web tests | `apps/web/src/app/router.ts:223-256`; `apps/web/src/pages/AdminAnalyticsPage.vue`; `apps/web/src/domains/admin/queries/useAdminAnalytics.ts`; `tests/scenario/admin/admin-analytics-access.scenario.test.ts` |
| P7-E021 | Local retirement proof | Repository SLS coupling, selected runtime diagnostics, RideHailing structured stdout, and the `operation_logs` graph are absent; `0095` owns forward table retirement | `03-clean-baseline-retirement/reference-ledger.md`; `03-clean-baseline-retirement/verification-log.md` |
| P7-E022 | Telemetry convergence proof | Backend Registry projection owns active contracts; Web collector/queue/transport are separate; deterministic rejection/idempotency and post-commit failure containment have unit/real-Postgres proof | `04-user-telemetry-owner-convergence/verification-log.md` |
| P7-E023 | Analytics convergence proof | `0096` typed fact, shared API range, Web Analytics owner, and the browser-to-dashboard journey pass focused and canonical gates | `05-bi-projection-web-convergence/verification-log.md`; `06-phase-review-and-o11y-handoff/verification-log.md` |
| P7-E024 | External closure | Sir confirms no configured SLS saved query/dashboard exists and closes further platform-artifact inventory for Phase 7; no SLS access, deletion or deployed-revision audit by Codex is claimed | `03-clean-baseline-retirement/verification-log.md`; `06-phase-review-and-o11y-handoff/verification-log.md` |

## Reproducible Commands

```bash
rg -n -i --hidden \
  --glob '!tasks/**' \
  --glob '!node_modules/**' \
  --glob '!apps/**/.result/**' \
  --glob '!apps/**/.vitest-attachments/**' \
  'ALIYUN_FC_LOG_(PROJECT|STORE)|logConfig|logstore|\bSLS\b|Log Service|structured (output|stdout|log)|JSON\.stringify\(event\)' \
  .

rg -n \
  --glob '!tasks/**' \
  --glob '!node_modules/**' \
  'console\.(info|log|warn|error)\(' \
  apps/backend/src apps/backend/fc-job-runner-trigger apps/web/src

git grep -n -E \
  'CommerceOrderDetailDebug|x-commerce-order-debug|order-detail-debug' \
  537a9b4f -- apps/backend/src apps/web/src tests | wc -l

git grep -n 'operationLogService\.log' \
  537a9b4f -- apps/backend/src | wc -l

rg -n '\.from\(userTelemetryEvents\)|\.from\(fact' \
  apps/backend/src/infra/analytics

rg -n 'admin-analytics|AdminAnalyticsPage|useAdmin.*Analytics' \
  apps/web/src tests/scenario
```

## Evidence Calibration

- Platform capability does not make a platform path the right architecture.
- Repository search alone does not prove the SLS console is clean; D7-04 closes
  from separately labelled operator evidence/decision.
- `console.*` counts are classification aids, not a bulk-deletion target.
- No external saved-query deletion is claimed or required for Phase 7.
- A clean baseline proves absence of the rejected mechanism, not presence of
  professional observability.
- `P7-E007` is the corrected-entry conflict observed at `537a9b4f`, not an
  active durable conflict. Phase 7 later removed the repository SLS/
  structured-output surfaces and corrected deployment truth; `P7-E021`–
  `P7-E024` plus the Phase 7 exit packet supersede that entry observation.
