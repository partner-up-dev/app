# `7-4` Target Specification

## 1. Authority Model

| Question | Authoritative source | Dashboard read boundary |
| --- | --- | --- |
| PR lifecycle/count/state | PR business tables/read models | Backend Analytics query |
| observed user behavior/funnels | accepted Registry-governed telemetry | fact-specific PostgreSQL projection |
| runtime health/attempt/provider behavior | future professional program observability | outside Phase 7 |

Raw telemetry is an append-only input ledger. A fact view is the typed,
question-specific BI contract. A Web panel consumes an Analytics API response,
never the ledger or a generic enriched-event response.

## 2. PR Discovery Fact Contract

The forward view `fact_pr_discovery_funnel_event` projects only the six
Registry-owned v1 events:

1. `pr.discovery.surface.viewed`
2. `pr.discovery.criteria.submitted`
3. `pr.discovery.recommendation.returned`
4. `pr.discovery.candidate.impression`
5. `pr.discovery.candidate.action`
6. `pr.discovery.authoring.handoff`

Required columns:

| Family | Columns |
| --- | --- |
| event identity | `event_id`, `event_name`, `event_version`, `journey_id`, `trace_id`, `occurred_at`, `step_key` |
| Discovery dimensions | `pr_type`, `view_mode`, `origin` |
| event-specific fields | `pr_id`, `rank`, `action`, `outcome`, `handoff_reason` |
| route source context | `route_path`, `route_name`, `spm`, `source_qr`, `route_context_status` |
| identity context | `anonymous_id`, `authenticated_user_hash`, `auth_context_status` |

Rules:

- no raw `payload` column is exposed;
- JSON text/numeric extraction is guarded so malformed historical data becomes
  `NULL`, never a view-wide cast failure;
- missing/invalid optional dimensions stay `NULL`;
- route/auth context is nearest prior context in the same journey, ordered by
  `occurred_at DESC, event_id DESC`;
- context is explicitly complete/unknown;
- `step_key` is derived only from the Registry event-name/version allowlist;
- the projection does not reinterpret `journey_id` as PR/command identity.

The TypeScript fact-reference guard proves that the intended six names remain
active and carry the required BI usage. A real-Postgres migration scenario
must also insert the Registry event set and prove the migrated view selects
exactly those six names. The TypeScript guard alone does not inspect SQL and
must not be described as full Registry-to-SQL proof.

## 3. Reader Compatibility Contract

The cut-over preserves:

- half-open `[startAt, endAt)` filtering;
- current six-step order;
- distinct-journey and event-count definitions;
- current `prType`, `viewMode` and `origin` dimension behavior;
- current conversion formula, including values above 100%;
- response keys and event dictionary; and
- default behavior until the date-window decision is applied.

Production code stops parsing arbitrary payload after the typed fact reader is
proven equivalent. There is no production dual-read flag.

## 4. Analytics API Time Contract

All Analytics endpoints use one controller-boundary contract:

- both instants carry an explicit offset;
- `startAt < endAt`;
- SQL comparisons use `timestamptz`;
- intervals are half-open;
- missing values use one documented default policy;
- invalid/reversed/over-limit ranges are 4xx Problem Details; and
- business-date bucketing names its timezone rather than using server-local
  casts.

The maximum interactive span is 31 days.

## 5. Backend Owner Contract

Backend Analytics remains in `src/infra/analytics`, as explicitly owned by
`apps/backend/AGENTS.md`.

Its public behavior is:

```text
controller
  -> Analytics query function
    -> authoritative business query or typed fact view
      -> response composer
```

The controller owns HTTP validation/auth conversion. Analytics query code
owns BI read composition. Entities describe database boundaries. Telemetry
ingest and the raw ledger do not become callable dashboard repositories.

## 6. Web Owner Contract

The target Web module is:

```text
src/domains/analytics/
├── model/
│   ├── filters.ts
│   └── presentation.ts
├── queries/
│   ├── useBIOverviewAnalytics.ts
│   ├── usePRFunnelAnalytics.ts
│   └── usePRDiscoveryAnalytics.ts
├── use-cases/
│   └── useAnalyticsFilters.ts
└── ui/
    ├── sections/
    │   └── AnalyticsFilterRail.vue
    └── surfaces/
        ├── BIOverviewSurface.vue
        ├── PRFunnelsSurface.vue
        └── PRDiscoverySurface.vue

src/pages/
├── AdminAnalyticsOverviewPage.vue
├── AdminPRFunnelAnalyticsPage.vue
└── AdminPRDiscoveryAnalyticsPage.vue
```

Exact helper extraction follows evidence: a shared table/metric component is
created only when at least two surfaces truly share behavior. `domains/admin`
keeps authentication shell and navigation; it does not own BI semantics.

Pages:

- are route entrypoints only;
- compose the Admin scaffold/navigation and one Analytics surface;
- do not own query construction, filter state machines, formatting rules or
  reusable panel logic.

## 7. Compatibility Contract

The implementation preserves:

- route names and paths;
- `analytics` role guards and global guard behavior;
- TanStack query keys and invalidation identity unless an explicit migration
  test proves compatibility;
- enabled conditions so inactive dashboards do not fetch;
- loading, refresh, error and empty states;
- current filter apply/reset semantics;
- stable `data-testid` values used by scenarios; and
- `/bi?code=...` successful login, redirect and code scrubbing.

## 8. Explicit Non-Goals

- Defining first-touch, last-touch or journey-level SPM attribution.
- Adding a source/failure panel before its formula is approved.
- Fixing disputed Create/Join/Retention metric populations under a refactor.
- Implementing PR-type transition or view-other-PR-types metrics.
- Replacing the program-observability system.
- Extracting a broad `event_enriched` view.
- Rewriting historical migrations or telemetry ledger rows.
- Adding a long-lived production dual-read or feature flag.
