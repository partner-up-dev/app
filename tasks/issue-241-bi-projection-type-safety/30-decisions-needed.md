# Decisions

## Confirmed Decision 1: Fact-First Projection Topology

Each stable BI question should have its own fact table or view where practical.

Rationale:

- Current BI requirements have different grains:
  - retention: user-date;
  - PR funnels: journey-step;
  - Anchor Event transition: identity-sequence;
  - view-other-Anchor-Events conversion: journey / user conversion;
  - official-account nudge: journey-source-action;
  - PR lifecycle and per-user PR counts: business fact grains.
- One broad `event_enriched` object would mix incompatible grains and become a god-object.

## Confirmed Decision 2: No DB-Level `dim_event` In The First Stage

Do not introduce `dim_user_telemetry_event` as a first-stage runtime dependency.

Instead:

- keep the TypeScript Event Registry as the semantic authority;
- make fact event-name sets explicit;
- verify fact event-name references against the registry in tests or scripts.

Revisit only if DB-level event metadata joins become necessary.

## Confirmed Decision 3: No Shared `user_context_base` In The First Stage

Do not introduce a generic shared context base view before facts exist.

Instead:

- each fact projection reconstructs only the context it needs;
- repeated context logic is acceptable initially;
- extract a narrow helper projection only after repeated logic proves costly or error-prone.

If extracted later, prefer narrow helpers such as identity-context or route-context projections over a wide `event_enriched` view.

## Confirmed Decision 4: PostgreSQL Views First

Use PostgreSQL views as the default first-stage DB projection object.

Use materialized views or projection tables only when:

- performance requires refreshable precomputation;
- snapshot semantics are required;
- incremental repair / backfill lifecycle is required.

## Confirmed Decision 5: Registry Type Safety Serves Producers And Fact References

Registry type safety should first serve:

- event producers and backend user-result emitters;
- ingest/runtime validation code;
- fact projection event-name reference checks;
- BI event-name set construction.

It should not pretend to make historical DB rows or raw SQL runtime-safe.

## Confirmed Decision 6: Raw SQL Policy

Production BI readers should not own stable projection semantics through `db.execute<T>`.

Raw SQL remains allowed for:

- migrations;
- diagnostics;
- narrowly scoped queries;
- DB view definitions.

Application BI readers should prefer Drizzle schema-backed views/tables after fact projections exist.

## Confirmed Decision 7: Multiple BI Dashboards

The BI UI should split into multiple dashboard surfaces by BI question or fact family instead of concentrating every metric in one broad conversion-funnel page.

Rationale:

- Current metrics have different filters, grains, and audiences.
- Anchor Event-specific filters should not appear as global BI filters for retention or PR lifecycle metrics.
- Fact-specific projections map naturally to fact-specific APIs and dashboard routes.
- Smaller dashboards make loading, error states, permissions, and future drill-downs easier to maintain.

## Open Implementation Details

- Dashboard route names, navigation grouping, and which existing panels move first.
- Whether PR lifecycle and per-user PR counts should remain typed business-table queries or gain business fact views.
