# Decisions

## Inherited From Issue 226

- User behavior telemetry is scoped to user-caused behavior streams.
- Automatic system facts such as `pr.expired` do not enter user telemetry.
- Successful backend-confirmed user-result event names use direct past tense, for example `pr.joined`.
- `journey_id` is mandatory for accepted user behavior events.
- User command requests pass current journey through `x-journey-id`.
- Identity context currently uses `auth.session.created`.
- PR lifecycle metrics come from business fact data / PR table statuses, not user behavior events.
- PR lifecycle cohorts use PR `created_at` and PR time-window `endAt`.
- BI combines business fact data, user behavior events, and program behavior / observability data.

## Issue-Local Decisions

- First-pass `event_enriched` is a query-level projection, not a stored table or materialized view.
- `dim_event` is projected from the unique Event Registry at query time; it is not a second hand-maintained catalog.
- Dashboard projections for #241 remain query-level and minimal: PR create / join funnels plus BI overview over retention, per-user PR counts, PR lifecycle status, Anchor Event transitions, and "view other activities" conversion.
- Old cold-start analytics readers, the old `/api/telemetry/events` v1 ingest route, and frontend segment production paths are removed from production code. Backend legacy segment reads remain only to support migrated historical user telemetry.

## Open For This Issue

1. Dedicated backend failed-result event names and failure reason taxonomy remain a future product decision. The current implementation records frontend-observed result events with `actionResult`, `failureCode`, and `failureReason`.
