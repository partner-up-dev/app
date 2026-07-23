# `7-4` Current And Target Topology

## Current

```text
Web telemetry emitters
  -> Web duplicated event names/payload mapping
  -> telemetry ingest + Backend Registry
  -> user_telemetry_events
       ├── fact_pr_create_funnel_event -> Create reader
       ├── fact_pr_join_funnel_event   -> Join reader
       ├── fact_user_retention_*       -> Overview reader
       └── raw payload                 -> Discovery TS parser/aggregator
                                             |
                                             v
                                   Analytics controller
                                             |
                                             v
 domains/admin/useAdminAnalytics + AdminAnalyticsPage.vue (1,206 lines)
   ├── route-name switch
   ├── three route surfaces
   ├── four queries
   ├── filter state machine
   ├── format/presentation models
   └── loading/error/refresh/page assembly
```

The main structural defects are:

- one BI question bypasses the fact boundary;
- Registry-to-fact verification does not cover Discovery;
- endpoint date validation is inconsistent;
- repeated row transfer/in-memory aggregation obscures query cost;
- Web Admin owns unrelated BI semantics; and
- the route page is simultaneously router adapter, workflow, presentation
  model and three dashboard surfaces.

## Target

```text
Backend Event Registry                 authoritative PR business tables
          |                                         |
          v                                         v
accepted telemetry ledger                 lifecycle/count read queries
          |
          v
fact-specific PostgreSQL views
  ├── create
  ├── join
  ├── retention
  └── discovery (typed fields + route/auth context; no raw payload)
          \____________________  ____________________/
                               \/
                 infra/analytics query boundary
                   ├── shared instant-range contract
                   ├── fact/business filtering
                   └── compatibility response composer
                               |
                               v
                     Analytics HTTP controller
                               |
                               v
                    Web domains/analytics
                   ├── queries/cache contracts
                   ├── filter/presentation model
                   └── three route surfaces
                               |
                               v
                    three route-only pages
                      + Admin shell/navigation
```

## Dependency Rules

| From | May depend on | Must not depend on |
| --- | --- | --- |
| Event Registry | schemas/contracts | dashboards or SQL response DTOs |
| fact migration/view | Registry-governed names/versions/fields expressed as SQL and checked in tests | Web modules, arbitrary payload exposure |
| Backend Analytics query | fact entities, business authority, pure response model | Web state, raw payload parser |
| Analytics controller | query surface, request schemas/auth middleware | fact internals or aggregation logic |
| Web Analytics queries | RPC transport types, query-key factory | page components |
| Web Analytics UI | Analytics model/queries, shared/design primitives | Backend persistence or Admin BI logic |
| route pages | Analytics surfaces, Admin shell/nav | reusable filter/query/presentation rules |

## Why Backend And Web Owners Differ

Backend-local architecture explicitly classifies Analytics read/export
queries as infrastructure. Web-local architecture says route pages are
assembly and domain modules own queries/use-cases/UI. Therefore the coherent
change is:

- retain and deepen `Backend infra/analytics`; and
- extract `Web domains/analytics` from `domains/admin` and the route page.

Mirroring folder names across units would be visual symmetry, not better
ownership.
