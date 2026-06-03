# Verification

## Frontend Verification

- Journey lifecycle tests cover creation, idle / end behavior where applicable, and persistence boundaries.
- Route context tests cover `route.entered` and `route.left`.
- Auth/session tests cover `auth.session.created`.
- Request client tests prove `x-journey-id` is attached to user command requests.
- Legacy segment tracking and ordinary-event identity metadata are removed.

## Backend Result Verification

- PR create / join / waitlist / close command paths can emit backend-confirmed user-result events with the request journey context.
- Successful result names use direct past tense.
- Automatic `pr.expired` is absent from user telemetry.
- Frontend-observed result events expose `actionResult`, `failureCode`, and `failureReason`; dedicated backend failed-result event names wait for a confirmed taxonomy.

## BI Verification

- Retention queries use enriched events / identity-session projection, not old event metadata.
- Per-user PR count is queryable.
- PR create / join funnels can be reconstructed from explicit view / click / submission / backend result events.
- Anchor-event transition and "view other activities" conversion are queryable from projections.
- PR lifecycle metrics query business fact data / PR table current statuses using `created_at` and PR time-window `endAt`.
- Unknown or incomplete context appears explicitly as `context_unknown` / `context_incomplete`.
- User telemetry BI filters compare instant ranges with `::timestamptz`, not `::timestamp`.
- Analytics API datetime query parameters require `Z` or an explicit offset.

## Release Verification

- Scenario tests cover the cross-unit paths that emit user telemetry.
- Staging validation runs after the `develop` breaking release train deploys.
- Old v1 readers and event producers are removed; v1 staging tables are not a production dependency.
