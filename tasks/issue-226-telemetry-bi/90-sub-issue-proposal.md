# Sub-Issue Proposal

Do not create these GitHub issues until the user confirms the split.

## Split Rationale

Issue #226 remains the epic and decision owner. Because Slices 1-7 land together as one breaking release train on `develop`, sub-issues should track large reviewable workstreams, not independent deployable milestones.

The preferred split is two sub-issues:

1. substrate: contract, registry, storage, ingest, and data migration;
2. behavior and BI: frontend/backend event production, enrichment, dashboard, and release verification.

## Created Sub-Issues

### #240: Telemetry Substrate, Registry, Storage, Ingest, And Data Migration

GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/240

Task packet: `tasks/issue-240-telemetry-substrate/`

Implementation blueprint: `tasks/issue-240-telemetry-substrate/40-implementation-blueprint.md`

Scope:

- Final RawUserEvent contract.
- Unique Event Registry module and first event contracts.
- Naming rules for event_name / event_family.
- Registry ownership, versioning, schema, and BI-purpose metadata.
- v1-to-v2 mapping table for existing telemetry rows.
- Decision artifact for failed-result event naming.
- Rename v1 telemetry tables to backup names.
- Create new `user_telemetry_journeys`, `user_telemetry_events`, and `user_telemetry_rejected_events`.
- Remove `user_telemetry_segments` from the target schema.
- Data migration from v1 rows into v2 journeys, context events, and behavior events.
- New backend ingest validation against Event Registry.
- `event_id` idempotence, rejected-event quarantine, optional `trace_id`, and mandatory `journey_id`.
- Parse `x-journey-id` into Hono request context and pass typed journey context beyond controllers.

Exit criteria:

- Registry tests prove duplicate names / versions / families are rejected.
- Mapping doc covers every existing v1 event name found in seed / fixture / current schema evidence.
- Existing telemetry rows are represented in the new ledger or explicitly quarantined.
- Accepted events contain no `seq`, `correlation_id`, `cause_event_id`, `source`, `authority`, anonymous id, or authenticated user hash.
- Backend user-command owners can emit result events with the frontend journey context.

### #241: User Event Migration, BI Projections, Dashboard, And Release Verification

GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/241

Task packet: `tasks/issue-241-user-event-bi/`

Implementation blueprint: `tasks/issue-241-user-event-bi/40-implementation-blueprint.md`

Scope:

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

Dependencies:

- 226-A.

Exit criteria:

- Core PR funnels can be reconstructed from frontend intent/submission plus backend result events.
- Automatic `pr.expired` does not enter user telemetry.
- BI queries do not depend on old telemetry envelope fields.
- Lifecycle status metrics are not sourced from user behavior events.
- Unknown or incomplete context is surfaced explicitly.
- Full release train validates on staging after `develop` deployment.
