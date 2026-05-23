# Scope

## In Scope

- Strengthen the TypeScript Event Registry contract so event names, versions, attributes, and payload schemas can produce useful compile-time types.
- Use the Event Registry to verify fact projection event references without making DB-level `dim_event` a first-stage dependency.
- Replace stable query-level user event projections with fact-specific DB-level projection objects where appropriate.
- Avoid a broad shared enrichment projection in the first stage; let each fact own the exact context reconstruction it needs.
- Define narrow BI fact projections for stable dashboard / funnel questions, one BI question per fact table / view where practical.
- Split BI dashboard surfaces by BI question or fact family instead of continuing to concentrate all analytics in one conversion-funnel page.
- Split or group analytics APIs to match dashboard / fact-family ownership where it improves clarity.
- Establish guardrails for `db.execute<T>` and raw SQL in production BI code.
- Update durable TDD docs after decisions are confirmed.

## Out Of Scope

- Reopening the raw user telemetry envelope decisions from #240.
- Reintroducing `event_kind`, journey-local sequence, correlation id, or cause event id.
- Moving PR lifecycle close / expired metrics into user telemetry.
- Implementing program behavior collection.
- Rebuilding the entire BI warehouse beyond the current #226 / #241 dashboard questions.

## Deliverables

- A confirmed projection architecture note.
- Updated BI and telemetry TDD contracts.
- Registry type-safety hardening implementation for fact event references.
- Fact-specific DB-level projection migration implementation.
- Drizzle schema models for DB projections.
- Replacement of query-level `event_enriched` consumers with typed projection readers.
- Dashboard / API IA plan for multiple BI surfaces.
- Verification plan that catches fact event-name references, view shape drift, and raw-SQL projection regressions.
