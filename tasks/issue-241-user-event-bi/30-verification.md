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
- Failed-result events follow the confirmed naming and failure-reason contract.

## BI Verification

- Retention queries use enriched events / identity-session projection, not old event metadata.
- Per-user PR count is queryable.
- PR create / join funnels can be reconstructed from observation / intent / submission / backend result events.
- Anchor-event transition and "view other activities" conversion are queryable from projections.
- PR lifecycle metrics query business fact data / PR table current statuses using `created_at` and PR time-window `endAt`.
- Unknown or incomplete context appears explicitly as `context_unknown` / `context_incomplete`.

## Release Verification

- Scenario tests cover the cross-unit paths that emit user telemetry.
- Staging validation runs after the `develop` breaking release train deploys.
- Old v1 readers and event producers are removed or explicitly marked recovery-only.
