# `7-4` Source Change Map

The paths below record the completed implementation surface on 2026-07-23.

## `7-4A` Contract And Parity Freeze

| Surface | Implemented action |
| --- | --- |
| `apps/backend/src/infra/analytics/pr-discovery-funnel.model.test.ts` | freezes six-step output, duplicates, missing dimensions, half-open range, filters and conversion above 100% |
| `apps/backend/src/infra/analytics/analytics-range.test.ts` | freezes default, offset-aware, ordering and 31-day boundary behavior |
| `apps/web/src/domains/analytics/**/*.test.ts` | freezes filter, query, route/surface and active-dashboard behavior |
| `apps/web/src/pages/AdminAnalyticsPages.test.ts` | freezes the three route assemblies and the prior semantic test-ID contract |
| `tests/scenario/admin/admin-analytics-access.scenario.test.ts` | preserves BI code scrubbing, access and route behavior in the real browser |

## `7-4B` PR Discovery Fact Cut-Over

| Surface | Implemented action |
| --- | --- |
| `apps/backend/drizzle/0096_pr_discovery_funnel_fact_view.sql` | creates the typed forward-only fact view after `0095_retire_operation_logs.sql` |
| `apps/backend/src/entities/analytics-fact.ts` | add the existing-view Drizzle entity |
| `apps/backend/src/infra/analytics/pr-discovery-funnel.ts` | read the fact entity and push exact filters down |
| `apps/backend/src/infra/analytics/pr-discovery-funnel.model.ts` | replace payload parsing with typed-row response composition |
| `apps/backend/src/infra/analytics/fact-event-references.test.ts` | add all six Discovery names with `pr_discovery_funnel` usage |
| `apps/backend/tests/analytics/pr-discovery-funnel.scenario.test.ts` | proves guarded extraction, context, typed fields and API output on real Postgres |

Historical migrations `0067_bi_fact_views.sql` and
`0087_drop_anchor_events.sql` are references only and must not be edited.

## `7-4C` API And Query Convergence

| Surface | Implemented action |
| --- | --- |
| `apps/backend/src/controllers/analytics.controller.ts` | one shared offset-aware range schema and 4xx mapping |
| `apps/backend/src/infra/analytics/*model.ts` | one filter resolver/default policy where compatible |
| `apps/backend/src/infra/analytics/bi-overview.ts` | remove server-local timestamp reinterpretation and freeze lifecycle output |
| `apps/backend/src/infra/analytics/pr-discovery-funnel.ts` | pushes exact Discovery dimensions and half-open range filters into the fact query |
| `apps/backend/tests/analytics/pr-discovery-funnel.scenario.test.ts` | covers missing/invalid offsets, equal, reversed, over-limit, exact-limit and half-open ranges |

## `7-4D` Web Analytics Owner

| Surface | Implemented action |
| --- | --- |
| deleted `apps/web/src/domains/admin/queries/useAdminAnalytics.ts` | query adapters now live in `domains/analytics/queries` with inferred response contracts |
| existing query-key contract | preserved by the Analytics query-contract test |
| deleted `apps/web/src/pages/AdminAnalyticsPage.vue` | replaced only after all three route owners existed |
| `apps/web/src/domains/analytics/model/*` | owns filter and presentation rules |
| `apps/web/src/domains/analytics/ui/*` | owns the filter rail, shared funnel table and three dashboard surfaces |
| `AdminAnalyticsOverviewPage.vue`, `AdminPRFunnelAnalyticsPage.vue`, `AdminPRDiscoveryAnalyticsPage.vue` | compose the Admin shell/navigation and one Analytics surface each |
| `apps/web/src/app/router.ts` | point existing names/paths/roles to the three pages |
| focused Web tests | assert query contracts, filters, active/inactive query behavior, refresh and semantic test IDs |

## `7-4E` Cross-Unit Proof

| Surface | Implemented action |
| --- | --- |
| `tests/scenario/admin/admin-analytics-access.scenario.test.ts` | retain access/role proof |
| added PR Discovery Analytics System scenario in the same file | emits through the real Web, ingests through real HTTP, reads fact/API and displays current dashboard dimensions |
| scenario Postgres probes | assert route-context SPM/source and no dashboard raw-payload dependency |
| Phase packet/durable docs | record results and promote only stable owner/contract truth |

## Out Of Scope Change Surfaces

- no new program-observability sink;
- no edit to telemetry consent/collection policy;
- no historical migration rewrite;
- no generic `event_enriched` view;
- no new source-attribution panel without a metric decision;
- no changes to business command/state owners.
