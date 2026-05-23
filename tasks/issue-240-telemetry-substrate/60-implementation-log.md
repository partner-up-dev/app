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
- Added forward-only `0065_user_telemetry_cleanup_and_timestamptz.sql` to convert user telemetry instant columns to `timestamptz`, drop migration-only `_v1` staging tables, and remove legacy `telemetry_events` storage.
- Restored `timestamptz` Date decoding at the backend Drizzle/Postgres boundary for raw SQL projection paths.

## Guardrails

- Ordinary behavior events do not persist anonymous id, authenticated user hash, `seq`, `correlation_id`, `cause_event_id`, `source`, or `authority`.
- `trace_id` remains available for joining user behavior with program behavior / observability.
- Legacy identity fields are only reconstructed into `auth.session.created` context events during data migration.
- Legacy segment meaning is represented as migration-only context events, not as a surviving target table.
- User telemetry instants keep timezone semantics end to end: API datetime inputs include `Z` or an explicit offset, DB columns use `timestamptz`, analytics filters cast as `::timestamptz`, and raw SQL projection paths receive DB-boundary-decoded `Date` values.

## Verification

- `pnpm --filter @partner-up-dev/backend typecheck` passed.
- `pnpm --filter @partner-up-dev/backend build` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/telemetry/user-event-registry.test.ts apps/backend/src/infra/telemetry/request-journey-context.test.ts` passed.
- `pnpm --dir . exec vitest run --project backend-unit apps/backend/src/infra/analytics/anchor-event-funnel.model.test.ts apps/backend/src/infra/telemetry/request-journey-context.test.ts apps/backend/src/infra/telemetry/user-event-registry.test.ts` passed.
- `pnpm test:unit:backend` passed.
- `pnpm db:lint` passed.
- `pnpm lint:backend` passed.
- `pnpm db:lint` passed after `0065_user_telemetry_cleanup_and_timestamptz.sql`.
- `pnpm --filter @partner-up-dev/backend typecheck` passed after telemetry `timestamptz` schema alignment.
- `pnpm test:unit:backend` passed after legacy telemetry entity removal.
- `pnpm --filter @partner-up-dev/backend typecheck` passed after restoring `timestamptz` DB-boundary decoding.
- Runtime DB check confirmed raw `db.execute()` returns `user_telemetry_events.occurred_at` as `Date` for `timestamptz`.
