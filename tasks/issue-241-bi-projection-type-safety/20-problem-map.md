# Problem Map

## Problem A: Registry Type Safety Is Incomplete

Current state:

- The registry is a compile-time TypeScript module and runtime validation source.
- It checks duplicate `event_name + event_version` at module initialization.
- It validates ingest against registered event names and schemas.
- Most event contracts use loose attribute and payload schemas.
- `eventName` is currently widened to `string` in the public contract type.

Risk:

- Call sites and projections can still pass arbitrary event-name strings.
- Dashboard projection rows use manually declared interfaces rather than registry-derived types.
- Fact event-name lists are currently plain strings and can drift from the registry.

Merged work area:

- Make registry entries preserve literal event names and versions.
- Derive `UserTelemetryEventName` / event-family / usage unions from registry.
- Prefer typed helpers for event emission and BI event-name selection.
- Define how strict each event's attributes / payload schema should be.
- Verify fact projection event references against the registry.

## Problem B: Query-Level Projection Breaks Type Boundaries

Current state:

- `event_enriched` is not a DB view or table.
- It was a raw SQL CTE in `apps/backend/src/infra/analytics/user-event-projection.ts` before the first fact-view migration slice.
- `db.execute<T>` gives a TypeScript row shape but does not provide runtime mapping or DB/schema drift protection.

Risk:

- Stable BI semantics live in application query strings.
- TypeScript believes row fields are typed even when the driver returns different runtime values.
- Multiple readers can duplicate or fork context reconstruction logic.

Merged work area:

- Introduce DB-level projection objects for stable BI boundaries.
- Model those projections in Drizzle so application readers regain typed query builder access.
- Decide when a PostgreSQL view is enough and when a materialized view or table is justified.
- Prefer one fact projection per BI question over one shared enrichment projection.

## Problem C: A Single `event_enriched` Can Become A God-Object

Previous state:

- The first projection combines raw event facts, registry metadata, route context, and auth session context.
- It was consumed by retention, PR funnels, Anchor Event transitions, and view-other-Anchor-Events conversion before the first fact-view slice.

Risk:

- Adding experiment, consent, attribution, environment, and funnel-specific fields would turn it into an overly broad projection.
- Dashboard-specific semantics become harder to audit.
- Performance tuning becomes ambiguous because every consumer depends on the same wide relation.

Merged work area:

- Do not introduce a shared enrichment projection in the first implementation stage.
- Build dashboard / funnel-specific fact views or tables for stable questions.
- Allow duplicated context reconstruction inside fact views until repeated logic proves a narrow helper projection is necessary.
- Keep source-family authority clear: business facts stay business-table based; user behavior facts stay telemetry based.

## Problem D: Raw SQL Needs A Guardrail

Current state:

- Raw SQL remains useful for migrations, ad hoc diagnostics, and complex queries.
- Production BI readers currently use `db.execute<T>` for stable projection logic.

Risk:

- Raw SQL type assertions can bypass Drizzle's runtime mapping and schema ownership.
- The codebase can accumulate invisible projection contracts.

Merged work area:

- Define where `db.execute<T>` is allowed.
- Require `.mapWith(...)`, typed Drizzle views/tables, or explicit boundary adapters when raw SQL remains necessary.
- Add lint or review checklist if automation is practical.
