# `7-4` Planning Verification Log

Date: 2026-07-23
Baseline: `537a9b4f`
Scope: read-only implementation planning plus task-packet mutation.

## Independent Read-Only Reviews

Two bounded reviews inspected the Backend projection/API boundary and the Web
Analytics/router boundary independently. Neither edited source or ran broad
tests. Their integration used source citations and a small root sample rather
than rereading every file.

## Root-Sampled Anchors

- `apps/backend/src/infra/analytics/pr-discovery-funnel.ts` confirms the
  production raw `user_telemetry_events.payload` read.
- `apps/backend/src/entities/analytics-fact.ts` confirms no Discovery fact
  entity exists.
- `apps/backend/src/infra/analytics/fact-event-references.ts` and its test
  confirm the current guard checks TypeScript-declared names, not SQL.
- `apps/backend/drizzle/0067_bi_fact_views.sql` and
  `0087_drop_anchor_events.sql` establish deterministic nearest-prior
  route/auth context and the forward-migration precedent.
- `apps/backend/src/controllers/analytics.controller.ts` confirms inconsistent
  range validation.
- `apps/web/src/app/router.ts` confirms three routes share one page and the
  analytics role guard.
- `apps/web/src/pages/AdminAnalyticsPage.vue` confirms the thirty-day default,
  route switch, four query hooks and combined UI responsibilities.
- `apps/web/src/shared/telemetry/spm-attribution.ts` and `track.ts` confirm SPM
  belongs to route attributes rather than Discovery payload.

## Packet Checks

- every `7-4A`–`7-4E` subtask has its own folder, packet and rehearsal;
- root spec, topology, decision, source-map, sequence and verification files
  are present;
- `git diff --check` passes;
- scoped stale-status searches find no remaining active claim that
  `notification_deliveries` retires in Phase 7 or that `operation_logs`
  remains undecided; and
- no application, deployment, migration or durable-doc source was changed in
  this planning pass.

## Implementation Proof

The planning-only statement above describes the packet pass at its baseline.
The implementation pass subsequently established:

| Boundary | Result |
| --- | --- |
| Backend Discovery model/range characterization | 2 files / 5 tests passed |
| Registry/fact intent | all six Discovery v1 contracts are declared fact consumers |
| Real PostgreSQL fact/API proof | guarded malformed/overflow casts, exact event set, deterministic context, unknown context, typed dimensions, half-open range and four-endpoint boundary matrix passed |
| Database migrations | `pnpm db:lint` and `pnpm db:check` passed with `0096_pr_discovery_funnel_fact_view.sql` |
| Backend static boundary | Backend Oxlint and type checks passed |
| Web Analytics contract | 8 focused files / 26 tests passed |
| Web static boundary | Web Oxlint and type checks passed |
| Cross-unit proof | focused System project passed 1 file / 2 scenarios |
| Structural owner audit | no production Discovery raw-payload read, old Admin BI query owner, or monolithic `AdminAnalyticsPage.vue` remains |
| Stable UI contract | pre/post semantic `data-testid` sets are identical |
| Patch hygiene | scoped `git diff --check` passed |

The System journey uses a real browser, real Web collector/transport, Backend
HTTP ingest, isolated PostgreSQL accepted ledger and typed fact, the Analytics
API, and the rendered Discovery dashboard. It asserts SPM/source carry at the
fact boundary without inventing an attribution formula.

Canonical whole-repository static, unit, Backend scenario, and System scenario
results are recorded by `7-5` on the final integrated revision.

## Full-Gate Findings

The first full System pass exposed that the Web's minute-resolution default
end instant was floored to the current minute. All three browser Discovery
events existed in the accepted ledger and typed fact, but the dashboard's
half-open range excluded same-minute events. The end instant now rounds up to
the next minute while preserving an exact 30-day Web window; its focused test
and final System proof pass.

The same run also exposed a test-harness race in the existing public-session
scenario: its replacement wait accepted any anonymous local-storage state and
could return the pre-reload UUID. The wait now names equality for restoration
and inequality for replacement. This changes only the proof condition, not
session behavior.
