# `7-4B` — PR Discovery Fact Cut-Over

## Status

**Complete on 2026-07-23.** Migration `0096` creates the guarded typed fact,
the Drizzle entity and Registry reference guard include all six events, and
the production reader now filters that fact without reading raw payload. A
real-Postgres scenario covers malformed/overflow fields, deterministic
context, unknown context, typed dimensions, and API output.

## Objective

Replace the only production BI raw-payload reader with a typed,
Registry-checked PostgreSQL fact projection while preserving observable
Discovery output.

## Concrete Work

1. Use `pnpm db:next-migration drizzle` at execution time; after
   `0095_retire_operation_logs.sql`, the current expected file is
   `0096_pr_discovery_funnel_fact_view.sql`.
2. Create `fact_pr_discovery_funnel_event` from the six v1 Registry events.
3. Guard JSON extraction and numeric casts; expose explicit unknown context.
4. Attach deterministic nearest-prior route/auth context and carry
   `spm`/`source_qr`.
5. Add the existing-view Drizzle entity.
6. Add all six Discovery names to the Registry fact-reference test with
   `requiredBIUsage: "pr_discovery_funnel"`.
7. In the real-Postgres migration fixture, insert the Registry event set and
   prove the actual migrated view admits exactly the six Discovery names. The
   existing TypeScript guard does not inspect SQL.
8. Compare raw-input compatibility output and typed-fact output in tests.
9. Switch `getPRDiscoveryFunnelAnalytics` to the fact entity.
10. Delete production raw payload parsing/casts from the Discovery
    reader/model.
11. Add one isolated real-Postgres migration/API scenario.

## Migration Boundary

- do not edit `0067_bi_fact_views.sql` or `0087_drop_anchor_events.sql`;
- do not add a raw payload column;
- do not introduce a production dual-read flag;
- use existing telemetry indexes initially;
- a shared route/auth helper view is a later optional migration only after
  parity plus `EXPLAIN` evidence.

## Exit

- migration/checks pass;
- Registry intent guard and migrated-view selection proof cover Discovery;
- fact/API scenario proves typed fields, tie-break and unknown context;
- output matches the `7-4A` fixture; and
- structural search finds no production Discovery raw-payload read.

See [`rehearsal.md`](./rehearsal.md).
