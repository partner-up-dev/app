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
- The first dashboard projection slices are minimal PR create / join funnels over existing registered events, without adding new event production in this pass.

## Open For This Issue

1. First failed-result event names and failure reason taxonomy.
2. Exact frontend event names for PR create / join / waitlist / close observations and submissions.
3. Whether `/api/telemetry/user/events` keeps the same route with breaking payload or moves to a versioned route. Current preference is same route, breaking payload.
