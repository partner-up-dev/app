# Implementation Log

Date: 2026-05-21

## Completed

- Replaced the target `user_telemetry_*` schema with registry-backed v2 tables:
  - `user_telemetry_journeys`
  - `user_telemetry_events`
  - `user_telemetry_rejected_events`
- Removed `user_telemetry_segments` from the target schema.
- Added the unique backend Event Registry and registry validation.
- Rebuilt `/api/telemetry/user/events` around the v2 RawUserEvent envelope:
  - `event_id`
  - `event_name`
  - `event_version`
  - `journey_id`
  - `occurred_at`
  - optional `trace_id`
  - optional `event_family`
  - `attributes`
  - `payload`
- Added `x-journey-id` parsing middleware and typed Hono context access.
- Added awaited request-scoped user telemetry event recording for backend-confirmed command-result events.
- Confirmed request behavior for missing or invalid journey context: the backend does not generate orphan user journeys and skips backend-confirmed user-result telemetry for that request.
- Added forward-only schema migration `0061_user_telemetry_v2.sql`.
- Added forward-only data migration `0062_user_telemetry_v2_backfill.sql`, including registry-aligned `event_family` reconstruction for legacy rows.
- Removed `event_kind` from the v2 user telemetry storage and registry contract; BI semantics now rely on explicit event names / families and registry BI usage metadata.
- Preserved already-executed `0061` / `0062` migration files and added forward-only `0064_drop_user_telemetry_event_kind.sql` to drop the column and remove migrated `legacy_event_kind` attributes.

## Guardrails

- Ordinary behavior events do not persist anonymous id, authenticated user hash, `seq`, `correlation_id`, `cause_event_id`, `source`, or `authority`.
- `trace_id` remains available for joining user behavior with program behavior / observability.
- Legacy identity fields are only reconstructed into `auth.session.created` context events during data migration.
- Legacy segment meaning is represented as migration-only context events, not as a surviving target table.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend build` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/telemetry/user-event-registry.test.ts apps/backend/src/infra/telemetry/request-journey-context.test.ts` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/anchor-event-funnel.model.test.ts apps/backend/src/infra/telemetry/request-journey-context.test.ts apps/backend/src/infra/telemetry/user-event-registry.test.ts` passed.
- `pnpm test:unit:backend` passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
