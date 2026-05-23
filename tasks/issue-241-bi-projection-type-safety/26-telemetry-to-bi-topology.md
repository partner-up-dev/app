# Telemetry To BI Projection Topology

## Purpose

This note clarifies the topology between raw telemetry events and BI / analytics consumers. The topology is derived from the BI requirements inventory in `27-bi-requirements-inventory.md`.

Current decision: use fact-specific projections as the primary BI boundary. Do not introduce DB-level `dim_event` or a shared `user_context_base` / wide `event_enriched` view in the first implementation stage.

## Source Families

BI reads from three families:

1. Business fact tables.
2. User telemetry event ledger.
3. Program behavior / observability signals.

This packet focuses on replacing query-level user telemetry projections while preserving the rule that business facts such as PR lifecycle status and per-user PR counts remain business-table based.

## Current Topology

```text
TypeScript Event Registry
  | runtime map
  v
query-level dim_event values CTE

user_telemetry_events
  | query-level CTE/lateral SQL in application code
  v
query-level event_enriched
  | application model builders
  v
BI responses / dashboard panels
```

Problems:

- `event_enriched` is not a DB object.
- Application raw SQL owns stable projection semantics.
- Drizzle cannot model the projection as a typed relation.
- Dashboard / funnel facts are derived directly from broad enrichment logic.
- `dim_event` is only needed because the query-level enrichment tries to carry generic dictionary metadata.

## Target Topology

```text
TypeScript Event Registry
  |
  | compile-time / test-time event reference verification
  v
fact projection event-name sets

user_telemetry_events
  |            |             |              |
  v            v             v              v
fact_retention fact_pr_join  fact_pr_create fact_anchor_event_transition ...
  |            |             |              |
  +------------+-------------+--------------+
                       |
                       v
                 BI query services
                       |
                       v
              API responses / dashboard panels

business tables
  |                    |
  v                    v
fact_user_pr_counts    fact_pr_lifecycle_status
```

Layer responsibilities:

- `user_telemetry_events`: immutable raw user behavior ledger.
- TypeScript Event Registry: producer / ingest / verification authority for event semantics.
- Fact projections: metric-specific DB views or tables with narrow grain and explicit source ownership.
- BI query services: request filtering, authorization, response shaping, and dashboard contract adaptation.
- BI dashboards: multiple route-level surfaces grouped by BI question or fact family, not one catch-all conversion dashboard.

## Removed First-Stage Layers

### No DB-Level `dim_event`

First-stage fact projections do not join a DB-readable event dictionary. They use explicit event-name lists that are verified against the TypeScript registry.

Effect:

- Fact SQL stays self-contained and easier to review.
- Registry BI metadata remains useful for producer, ingest, documentation, and verification.
- Runtime BI queries do not depend on a second event dictionary surface.
- If a future BI consumer needs ad hoc event dictionary browsing or SQL-level event metadata joins, introduce a generated dictionary then.

Trigger to reintroduce:

- multiple DB facts need the same event metadata fields at query time;
- external SQL consumers need a durable event dictionary;
- event-family / BI-usage joins become more maintainable than explicit fact event sets.

### No Shared `user_context_base`

First-stage fact projections own their required context reconstruction directly.

Effect:

- Each fact encodes only the context it needs.
- Retention can focus on identity/day.
- PR funnels can focus on journey-step and context-completeness diagnostics.
- Anchor Event facts can focus on rendered mode, source, event id, and sequence.
- The implementation may duplicate nearest-prior auth/session logic across facts.

Trigger to reintroduce:

- at least three fact projections repeat the same identity or route reconstruction logic;
- a bug fix must be applied to repeated context SQL in multiple places;
- query plans show repeated context reconstruction is a clear performance bottleneck.

If reintroduced, the helper should be narrow, for example `event_identity_context`, not a wide `event_enriched` god-object.

## Projection Object Choices

### PostgreSQL View

Default first-stage choice for stable facts.

Use when:

- projection is deterministic from current tables;
- read-time computation is acceptable;
- no refresh semantics are needed;
- DB-level contract and typed Drizzle access are valuable.

### Materialized View

Use only when:

- projection is expensive;
- dashboard latency requires precomputation;
- stale-but-controlled refresh is acceptable.

### Projection Table

Use only when:

- facts need append/update lifecycle;
- historical snapshots must be preserved independent of current raw event interpretation;
- incremental backfill and repair workflows are needed.

## First Fact Candidates

User telemetry facts:

- `fact_user_retention_daily`
- `fact_pr_join_funnel_event`
- `fact_pr_create_funnel_event`
- `fact_anchor_event_transition`
- `fact_view_other_activities_conversion`
- `fact_official_account_follow_nudge`
- existing Anchor Event funnel fact projection, if we split it from the legacy compatibility reader.

Business facts:

- `fact_user_pr_counts`
- `fact_pr_lifecycle_status`

Naming can change during implementation, but each fact must state:

- source family;
- grain;
- event names or business tables read;
- context reconstruction rule;
- dimensions;
- measures.

## Guardrails

- Do not rebuild a broad `event_enriched` view as the primary BI API.
- Do not create a hand-maintained SQL event dictionary.
- Do not use production dashboard readers as owners of stable raw SQL projection semantics.
- Fact event-name references must be checked against the Event Registry.

## Dashboard And API Topology

Implemented frontend route state:

- `/admin/analytics` redirects to `/admin/analytics/overview`.
- `/admin/analytics/overview` renders BI health / overview panels.
- `/admin/analytics/pr-funnels` renders PR create and PR join funnel panels.
- `/admin/analytics/anchor-events` renders Anchor Event mode, funnel, transition, conversion, outcome, source, and failure panels.
- `/admin/analytics/official-account` renders official-account follow nudge panels.
- Backend APIs are already partially split:
  - `/api/analytics/overview`
  - `/api/analytics/pr-create-funnel`
  - `/api/analytics/pr-join-funnel`
  - `/api/analytics/anchor-event-funnel`

Target direction:

- continue splitting dashboard internals by BI question or fact family as new facts are added;
- keep shared date-range filter behavior where useful, but avoid forcing Anchor Event-specific filters onto unrelated dashboards;
- align API boundaries with fact ownership and dashboard consumption.

Candidate dashboards:

- BI overview / health:
  - retention;
  - per-user PR counts;
  - PR lifecycle status.
- PR funnel dashboard:
  - PR create funnel;
  - PR join funnel;
  - future backend-confirmed failure taxonomy.
- Anchor Event dashboard:
  - landing mode funnel;
  - mode comparison;
  - natural extension between Anchor Event types;
  - "view other Anchor Events" conversion;
  - outcomes;
  - sources;
  - failures;
  - natural-path filters that exclude paid / ad entry when answering cross-Anchor-Event extension questions.
- Official account dashboard:
  - follow nudge shown / follow-click / dismiss by source.

API implications:

- existing split endpoints are directionally correct;
- `/overview` may need to shrink into a true overview endpoint instead of carrying unrelated fact families;
- fact-specific endpoints can share common query schemas only when the filter semantics are actually shared;
- Anchor Event filters such as `eventId`, `spm`, `sourceQr`, `assignmentRevision`, and `renderedMode` should stay on Anchor Event dashboards / APIs, not global analytics filters.
