# Verification

## Required Proof

- TypeScript registry exports useful literal unions for event names and families.
- Unknown event names are rejected at runtime and, where practical, at compile time.
- Fact event-name references are verified against the TypeScript Event Registry.
- Stable BI readers use Drizzle schema-backed fact projections rather than `db.execute<T>` row assertions.
- Query windows and telemetry instants remain timezone-safe end to end.
- Dashboard metrics keep their source-family authority:
  - PR lifecycle status from business fact tables;
  - user behavior funnels from user telemetry projections.
- First-stage implementation does not introduce DB-level `dim_event` or a broad `user_context_base` / `event_enriched` view.
- Dashboard routes and API endpoints are split so unrelated fact families do not share irrelevant filters or loading states.

## Candidate Commands

```bash
pnpm --filter @partner-up-dev/backend typecheck
pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/telemetry/user-event-registry.test.ts
pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/bi-overview.model.test.ts apps/backend/src/infra/analytics/pr-create-funnel.model.test.ts apps/backend/src/infra/analytics/pr-join-funnel.model.test.ts apps/backend/src/infra/analytics/anchor-event-funnel.model.test.ts
pnpm lint:backend
pnpm db:lint
pnpm build:backend
```

## Verified In This Slice

- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/anchor-event-funnel.model.test.ts apps/backend/src/infra/analytics/bi-overview.model.test.ts apps/backend/src/infra/analytics/pr-create-funnel.model.test.ts apps/backend/src/infra/analytics/pr-join-funnel.model.test.ts apps/backend/src/infra/analytics/fact-event-references.test.ts apps/backend/src/infra/telemetry/user-event-registry.test.ts`
- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm test:unit:backend`
- `pnpm lint:backend`
- `pnpm build:backend`
- `pnpm db:lint`
- `rg "db\\.execute<|fetchUserTelemetryEnrichedEvents|user-event-projection|UserTelemetryEnrichedEventRow" apps/backend/src/infra/analytics apps/backend/src/controllers -n`

## Future Guardrails

- Add a focused test or script that compares fact event-name references with the TypeScript registry.
- Add a source guardrail for production BI readers that discourages `db.execute<T>` when a typed projection schema exists.
- Add migration-level verification for view column names and types if the existing migration runner can expose it cleanly.
- Add a reintroduction checklist for any future `dim_event` or shared context helper projection.
- Add frontend route / navigation tests once dashboard IA is split.
