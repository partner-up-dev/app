Parent epic: #226

Depends on substrate issue: #240

Task packet: `tasks/issue-241-user-event-bi/`

This issue owns user event production migration, BI projections, dashboard updates, and release verification for #226. It depends on the telemetry substrate issue and lands in the same breaking release train.

Implementation blueprint: `tasks/issue-241-user-event-bi/40-implementation-blueprint.md`

## Scope

- Replace old frontend telemetry envelope.
- Generate and persist current `journey_id` as a frontend UUID in tab-scoped `sessionStorage`.
- Reuse the current journey until 30 minutes of inactivity, then create a new journey on the next event.
- Emit `journey.started`, `route.entered`, and `auth.session.created`; keep `journey.ended` and `route.left` registered but not required until a concrete BI query needs them.
- Attach `x-journey-id` to user command requests.
- Remove legacy segment tracking and ordinary-event identity metadata.
- Migrate existing user behavior collection to registry-governed events.
- Add missing PR create / join / waitlist / close observation, intent, and submission events.
- Emit backend-confirmed user-result events such as `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed`; include failed-result events after naming is confirmed.
- Build `event_enriched` or equivalent projection from raw events plus context stream.
- Project `dim_event` from the unique Event Registry.
- Build identity/session projection from nearest prior `auth.session.created`.
- Rebuild BI readers for retention, per-user PR count, PR create / join funnels, anchor-event transitions, and "view other activities" conversion.
- Query PR lifecycle metrics from business fact data / PR table current statuses, using `created_at` and PR time-window `endAt` cohort dimensions.
- Update `/admin/analytics` and any dashboard readers to the new projections.
- Remove obsolete frontend/backend telemetry code paths.
- Add scenario / regression tests and staging deployment verification notes.

## Accepted Constraints

- User behavior telemetry is scoped to user-caused behavior streams.
- Automatic `pr.expired` and similar system lifecycle facts do not enter user telemetry.
- Successful backend-confirmed user-result events use direct past tense, for example `pr.joined`.
- PR lifecycle metrics come from business fact data / PR table statuses, not user behavior events.
- BI combines business fact data, user behavior events, and program behavior / observability data.

## Exit Criteria

- Core PR funnels can be reconstructed from frontend intent/submission plus backend result events.
- Automatic `pr.expired` does not enter user telemetry.
- BI queries do not depend on old telemetry envelope fields.
- Lifecycle status metrics are not sourced from user behavior events.
- Unknown or incomplete context is surfaced explicitly.
- Full release train validates on staging after `develop` deployment.

## Implementation Blueprint Summary

1. Confirm #240 substrate contract exists in the same branch.
2. Replace frontend telemetry runtime and emit journey / route / auth-session context events.
3. Attach `x-journey-id` to user command requests.
4. Migrate product behavior events into registry-governed observation / intent / submission semantics.
5. Emit backend-confirmed user-result events such as `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed`.
6. Build enrichment, identity/session projection, `dim_event`, and required BI readers.
7. Update `/admin/analytics`, remove obsolete telemetry paths, and verify with unit / scenario / staging checks.
