# Verification Plan

## Baseline Commands

- `pnpm --filter @partner-up-dev/backend typecheck`
- `pnpm --filter @partner-up-dev/backend test:unit`
- `pnpm --filter @partner-up-dev/backend lint`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm test:unit:frontend` when frontend helper tests change
- `pnpm db:lint` after migration changes
- `git diff --check`

## Migration Checks

- New `user_telemetry_events.event_id` is unique.
- `event_id` is unique for all migrated journey events.
- Every accepted `user_telemetry_events` row has `journey_id`.
- Every migrated behavior event has a registry-backed `event_name` and `event_version`.
- No ordinary behavior event stores anonymous id or authenticated user hash in `attributes` or metadata columns.
- Reconstructed `auth.session.created` context events account for legacy identity fields where possible.
- Old journey, segment, and event row counts reconcile to expected new event counts.

## Analytics Checks

- Existing Anchor Event funnel scenario remains explainable after query migration.
- Join funnel distinguishes frontend observation / intent from backend-confirmed user results.
- PR user-result metrics count created, joined, and user-caused closed from user-behavior events.
- Automatic lifecycle metrics such as expired use PR business fact data / business-state projection, not user-behavior telemetry.
- Retention query uses identity projection rather than event metadata.
- Lifecycle metric tests cover both PR `created_at` and time-window `endAt` cohorts.

## Scenario Candidates

- Existing LIST-mode Anchor Event -> PR join -> analytics funnel scenario.
- Structured PR create -> backend-confirmed create result -> analytics projection.
- PR close/status update -> backend-confirmed user-result event -> analytics projection.
