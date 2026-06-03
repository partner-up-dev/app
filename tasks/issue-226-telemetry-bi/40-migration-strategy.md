# Migration Strategy

## Direction

Use a clean breaking migration for `user_telemetry_*` because telemetry and BI are still early-stage. Keep the table-family name, but do not keep old envelope fields as long-lived compatibility.

## Schema Migration Shape

Preferred approach:

1. Rename existing tables to backup names:
   - `user_telemetry_journeys_v1`
   - `user_telemetry_segments_v1`
   - `user_telemetry_events_v1`
2. Create new target tables:
   - `user_telemetry_journeys`
   - `user_telemetry_events`
   - `user_telemetry_rejected_events`
3. Recreate target indexes and constraints.
4. Do not recreate `user_telemetry_segments`.

This keeps data migration SQL clear and avoids complicated in-place column surgery.

## Data Migration Shape

The data migration should:

1. Insert one new journey row for each old journey.
2. Generate reconstructed context events from old journey rows:
   - `journey.started`
   - `auth.session.created` when old `anonymous_id` or `user_id_hash` exists and can be represented as a reconstructed auth/session context
   - route and entry-attribution context when old route or attribution fields exist
3. Convert old segment rows into context events:
   - `segment.started`
   - optional `segment.ended`
4. Convert old event rows into raw ledger events:
   - derive `event_id` from old `id`
   - derive `journey_id` from old `app_journey_id`
   - derive `event_version = 1` unless registry says otherwise
   - derive `event_family` from registry mapping
   - derive `attributes` from low-cardinality old fields / properties
   - derive `payload` from event-owned old properties
5. Preserve `occurred_at` as event time and `received_at` as ingest time when old data has them.

## Ordering Migration

Do not generate a business `seq` for legacy rows.

For migration verification and projection stability, use deterministic read ordering only:

1. `occurred_at`
2. synthetic priority:
   - journey context
   - identity context
   - route/segment context
   - behavior event
3. legacy event id or synthetic event id

This ordering is a projection rule, not persisted business truth.

## Auth Session Identity Migration

Do not copy old `anonymous_id` or `user_id_hash` onto ordinary behavior events.

Instead:

- create reconstructed `auth.session.created` context events where legacy identity fields make that possible;
- mark them with payload field `migration_source = "legacy_user_telemetry_v1"`;
- let identity projection consume them later.

## Code Migration

The same implementation track should update:

- backend entity schema;
- backend telemetry ingest validation;
- backend telemetry insert logic;
- frontend `trackEvent` envelope;
- router context events;
- analytics query readers.

Do not add `correlation_id`, `cause_event_id`, `source`, or `authority` to the new user-behavior event envelope.

## Rollback Posture

This is forward-only. The backup v1 tables may remain temporarily for recovery and migration verification, but production readers should not depend on them after migration.
