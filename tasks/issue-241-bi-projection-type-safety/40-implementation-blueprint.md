# Implementation Blueprint

Do not start implementation until the user explicitly starts the implementation slice.

## Phase 1: Fact Contract Design

For each current BI question, define the target fact contract:

- source family;
- fact name;
- grain;
- source events or business tables;
- context reconstruction rule;
- dimensions;
- measures;
- expected query filters;
- known gaps from the current implementation.

Initial candidates:

- `fact_user_retention_daily`
- `fact_pr_join_funnel_event`
- `fact_pr_create_funnel_event`
- `fact_anchor_event_transition`
- `fact_view_other_activities_conversion`
- `fact_official_account_follow_nudge`
- `fact_user_pr_counts`
- `fact_pr_lifecycle_status`

Checkpoint:

- No fact should depend on a broad `event_enriched` contract.
- Business facts stay business-table based.

## Phase 1.5: Dashboard And API IA

Before or alongside fact view implementation, define the dashboard split:

- route names;
- navigation grouping;
- query/filter schema per dashboard;
- backend endpoint ownership;
- which existing `/admin/analytics` panels move first;
- whether `/admin/analytics` remains an overview route or redirects to the first BI dashboard.

Candidate split:

- `/admin/analytics/overview`
- `/admin/analytics/pr-funnels`
- `/admin/analytics/anchor-events`
- `/admin/analytics/official-account`

Checkpoint:

- Each dashboard's filters match its fact sources.
- API endpoints are grouped by fact ownership, not by the current monolithic page.

## Phase 2: Registry Reference Guardrail

Add a lightweight registry verification layer before creating DB views:

- preserve literal event-name types where practical;
- export or expose registered event-name sets;
- verify every fact event-name reference exists in the TypeScript Event Registry;
- verify deprecated events are only referenced when the fact explicitly supports migrated history.

Checkpoint:

- Fact event-name lists are explicit but not free-form.
- No DB-level `dim_event` is required for this stage.

## Phase 3: PostgreSQL View Migrations

Create forward-only migrations for the selected first fact views.

Suggested first slice:

- PR join funnel event view;
- PR create funnel event view;
- registry reference guardrail for fact event-name lists.

Keep each view self-contained:

- reconstruct only the context it needs;
- use `timestamptz` comparisons for telemetry instants;
- document snake_case / camelCase payload compatibility where it is intentionally supported;
- surface unknown context explicitly.

Checkpoint:

- The migration should not introduce `dim_event` or a generic context base view.

## Phase 4: Drizzle Projection Schema

Model each view in Drizzle:

- use timestamp columns with `withTimezone: true` for instants;
- use stable enum / text columns for dimensions;
- avoid `any`;
- keep view schema names aligned with migration output.

Checkpoint:

- Application readers can query fact views through typed Drizzle schema instead of `db.execute<T>`.

## Phase 5: Reader Migration

Replace current query-level readers incrementally:

- PR join funnel reader reads `fact_pr_join_funnel_event`;
- PR create funnel reader reads `fact_pr_create_funnel_event`;
- BI overview retention reads retention fact;
- BI overview Anchor Event transition reads transition fact;
- BI overview view-other-activities reads conversion fact;
- official-account nudge reads its fact view if split from Anchor Event funnel;
- PR lifecycle and per-user PR count readers either remain direct business-table typed queries or move to business fact views.

Checkpoint:

- `apps/backend/src/infra/analytics/user-event-projection.ts` is no longer the stable shared projection dependency for dashboard readers.
- PR create/join and BI overview readers no longer depend on `apps/backend/src/infra/analytics/user-event-projection.ts`.
- `/admin/analytics` is no longer the only surface that must load every BI fact family.

## Phase 6: Raw SQL And Cleanup

Inventory remaining `db.execute<T>` usage under production backend source.

Classify each remaining use:

- migration / diagnostic;
- allowed local aggregate;
- should move to typed query builder;
- should move to DB view / schema-backed fact.

Then:

- remove the `timestamptz` parser override if no longer needed by production raw projection paths, or keep it documented as a compatibility guardrail;
- remove query-level `dim_event` if no reader uses it;
- document any accepted raw SQL exceptions.

Checkpoint:

- Raw SQL no longer hides stable BI projection contracts behind generic row assertions.

## Phase 7: Verification

- Run backend typecheck and BI unit tests.
- Add registry-reference verification for fact event-name sets.
- Add DB view shape verification if the migration/test platform can expose it cleanly.
- Smoke `/api/analytics/overview`, `/api/analytics/pr-create-funnel`, `/api/analytics/pr-join-funnel`, and `/api/analytics/anchor-event-funnel` after reader migration.
