# Global Review

## Current Assessment

The direction is coherent after the latest decisions:

- User behavior collection remains scoped to user-caused behavior streams.
- System lifecycle facts are outside user telemetry.
- `user_telemetry_*` remains the bounded context, but the schema can break cleanly.
- Identity moves into `auth.session.created` context events and identity projection.
- Raw user events stay small: no `seq`, no `correlation_id`, no `cause_event_id`, no `source`, no `authority`; keep optional `trace_id` for observability linkage.

## Remaining Decisions Before Implementation

### 1. Accepted Events Without `journey_id`

Decision: `journey_id` is required for all accepted user-behavior events.

If an event does not belong to a user journey, it should not enter `user_telemetry_events`. It can be rejected, dropped, or sent to a future program-behavior collection path.

Rationale: this keeps user telemetry semantically clean and avoids using optional `journey_id` as a loophole for system facts.

### 2. Backend-Confirmed User Results

Decision: frontend user command requests pass the current journey through `x-journey-id`.

Backend middleware parses `x-journey-id` into Hono request context. Controllers can read it and pass a typed journey context into use-cases/services that emit backend-confirmed user-result events.

Non-goal: do not add `correlation_id` or `cause_event_id`. The event stream and registry-defined funnel steps are enough for aggregate BI. Per-attempt technical tracing belongs elsewhere.

### 3. Lifecycle Metrics Source

Decision: PR close / expire / formed lifecycle BI should be based on business fact data, especially current PR table statuses, not user-behavior events or business events.

Decision: lifecycle metric cohorts use PR `created_at` and PR time-window `endAt` as business date dimensions.

### 4. Breaking Migration Deployment

Decision: production changes for schema, ingest, frontend collection, and analytics readers ship as one breaking release train on `develop`.

`origin/develop` automatically deploys staging backend and frontend, so Slices 1-7 should land together for staging validation.

Acceptable early-stage compromise: old frontend telemetry flushes may fail during rollout, but user-facing product commands must remain unaffected.

### 5. Registry Source Of Truth

Decision: maintain one unique Event Registry.

Recommendation: TypeScript registry is the source of truth for validation and tests; `dim_event` is generated/projected from it for BI. Do not maintain two hand-edited registries.

### 6. Legacy Data Migration Mapping

Decision needed: exact v1 event mapping table.

Recommendation: define a migration mapping document before SQL:

- old canonical event name
- new `event_name`
- new `event_family`
- `event_version`
- attributes extraction
- payload extraction
- context events generated from old journey/segment rows

This avoids ad-hoc SQL decisions becoming invisible product semantics.

## Plan Gaps To Close

- Add a short Slice 0 artifact for first event registry entries.
- Add a short Slice 0 artifact for v1-to-v2 migration mapping.
- Lifecycle metrics cohort dimensions decided: PR `created_at` and PR time-window `endAt`.
- Add deployment sequencing notes before any migration PR.
- Decide whether `/api/telemetry/user/events` keeps the same route with breaking payload or moves to a versioned route. Current preference is same route, breaking payload, because early stage.
