# Task Packet: BI Projection Type Safety

Date: 2026-05-22

Parent context:

- GitHub issue #241 migrates user event production and BI readers onto the governed `user_telemetry_*` substrate.
- This packet splits out the follow-up design and implementation work exposed by the first query-level projection slice.

## Objective & Hypothesis

The current user telemetry BI projection is functional but not yet at the desired maintainability bar. The hypothesis is that we should move from application-level raw SQL projections toward typed, durable projection boundaries:

- the Event Registry should provide stronger compile-time and runtime guarantees;
- fact-specific DB-level projections should replace query-level `event_enriched` CTEs where the projection has stable BI meaning;
- dashboard and funnel facts should use narrow fact projections instead of one broad enrichment god-object.

## Input Classification

- Intent: raise the long-term maintainability and type-safety standard for user telemetry BI projections.
- Constraint: preserve the unique Event Registry and avoid second hand-maintained event dictionaries.
- Reality: `db.execute<T>` / `sql<T>` currently provides compile-time assertions without runtime mapping, and the query-level projection has already exposed timestamp boundary risk.

## Durable Owners

- `docs/20-product-tdd/analytics-and-telemetry-contracts.md`
- `docs/20-product-tdd/bi-domain-contracts.md`
- `apps/backend/src/infra/telemetry/user-event-registry.ts`
- `apps/backend/src/infra/analytics/*`
- `apps/backend/src/entities/*`
- `apps/backend/drizzle/*`

## Guardrails Touched

- Event Registry remains the unique source of event semantics.
- BI facts may reference explicit event names, but those references must be verified against the unique Event Registry.
- User telemetry projections must not depend on raw SQL type assertions for stable production readers.
- Context should be expressed by event stream and projections, not copied onto ordinary behavior events.
- BI facts should select the authoritative source family: user behavior events, business fact tables, or program behavior signals.

## Current Mode

Execute / first implementation slice completed. Remaining work is dashboard/API IA and optional business fact view extraction.
