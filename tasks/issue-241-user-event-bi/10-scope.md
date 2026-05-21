# Scope

## In Scope

- Replace old frontend telemetry envelope.
- Generate and persist current `journey_id` as a frontend UUID in tab-scoped `sessionStorage`.
- Reuse the current journey until 30 minutes of inactivity, then create a new journey on the next event.
- Emit `journey.started`, `route.entered`, and `auth.session.created`.
- Keep `journey.ended` and `route.left` registered but not required until a concrete BI query needs hard-end or route-leave semantics.
- Attach `x-journey-id` to user command requests.
- Remove legacy segment tracking and ordinary-event identity metadata.
- Migrate existing user behavior collection to registry-governed events.
- Add missing PR create / join / waitlist / close observation, intent, and submission events.
- Emit backend-confirmed user-result events such as `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed`.
- Add first-slice failed-result events after naming is confirmed.
- Build `event_enriched` or equivalent projection from raw events plus context stream.
- Project `dim_event` from the unique Event Registry.
- Build identity/session projection from nearest prior `auth.session.created`.
- Rebuild BI readers for retention, per-user PR count, PR create / join funnels, anchor-event transitions, and "view other activities" conversion.
- Query PR lifecycle metrics from business fact data / PR table current statuses using `created_at` and PR time-window `endAt` cohort dimensions.
- Update `/admin/analytics` and dashboard readers.
- Remove obsolete frontend/backend telemetry code paths.
- Add scenario / regression tests and staging deployment verification notes.

## Out Of Scope

- Defining a second Event Registry.
- Program behavior collection implementation.
- Emitting automatic system facts into user telemetry.
- Maintaining old frontend telemetry envelope compatibility.

## Deliverables

- Frontend runtime migration.
- User-command `x-journey-id` propagation.
- Backend-confirmed user-result events.
- Enrichment and BI projection readers.
- Dashboard updates.
- Scenario / regression verification.
- Staging release verification checklist.
