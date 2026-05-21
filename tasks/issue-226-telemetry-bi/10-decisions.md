# Decisions And Open Questions

## Accepted Decisions

- Continue using the `user_telemetry_*` table family instead of introducing a generic `raw_events` table.
- Use a one-time breaking migration because user behavior collection and BI are still early-stage.
- Avoid long-lived compatibility debt. Rebuild schema, ingest contract, collection code, and BI readers around the governed model.
- Do not preserve `app_journey_id` as the canonical contract name if `journey_id` is the target vocabulary.
- Remove anonymous id and authenticated user hash from ordinary event metadata / attributes.
- Express identity through `auth.session.created`; BI resolves identity by looking backward for the nearest session-created context event.
- Do not add a future `identity.changed` event unless a concrete BI need appears.
- User-behavior telemetry is scoped to user-caused behavior chains.
- Backend-confirmed user-result events may be produced by backend user command owners, but automatic system lifecycle facts do not belong in user-behavior telemetry.
- Automatic facts such as `pr.expired` belong to program behavior collection or business-state projections.
- Existing user event collection implementation must be migrated: some code will be removed, some updated.
- Do not require global journey-local sequence numbers. Backend-confirmed user-result events may share frontend `journey_id`, and strict sequence would turn telemetry into distributed coordination.
- Use `occurred_at` for event time, `received_at` for ingest time, and `event_id` for idempotence.
- Do not add `correlation_id` or `cause_event_id` to user-behavior telemetry events.
- Do not add raw event fields `source` or `authority`.
- Keep `trace_id` on user-behavior telemetry events so user behavior collection can join with program behavior collection / software observability data.
- Accepted user-behavior events require `journey_id`.
- User command requests pass journey context through `x-journey-id`.
- Hono request context is the backend request owner for parsed journey context; controllers can read it and pass a typed journey context into use-cases/services that need to emit backend-confirmed user-result events.
- PR close / expire / formed lifecycle BI should be based on business fact data, especially current PR table statuses, not user-behavior events or business events.
- PR lifecycle metric cohorts use both PR `created_at` and the PR time window `endAt` as business date dimensions.
- BI is generally composed from business fact data, user behavior events, and program behavior events / software observability data.
- Slices 1-7 should merge and deploy together as one breaking release train on `develop`; `origin/develop` deploys staging backend and frontend.
- Maintain one unique Event Registry.
- Backend-confirmed user-result event names should use direct past-tense names such as `pr.created`, `pr.joined`, `pr.waitlisted`, and `pr.closed`.

## Working Decisions

- `user_telemetry_events` becomes the raw user telemetry ledger.
- `user_telemetry_segments` should be deleted rather than preserved. Segment meaning moves into context events.
- Current Anchor Event funnel readers should be rebuilt against the new substrate instead of keeping old field compatibility.
- Registry governance should be introduced before broad event expansion.
- Projection code may define deterministic tie-break rules for stable output, but not as business ordering truth.

## Open Decisions

1. Should the breaking migration use replacement tables with temporary names and renames, or alter existing tables in place after copying rows to staging tables?
2. Which backend-confirmed failed-result events must land in the first implementation slice?
3. Should issue #226 close only when all listed BI metrics are queryable, or become an epic with sub-issues for registry, ingest, backend-confirmed user-result events, projections, and dashboard?
4. Confirm sub-issue split before creating GitHub sub-issues.
