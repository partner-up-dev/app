Parent epic: #226

Sibling / downstream issue: #241

Task packet: `tasks/issue-240-telemetry-substrate/`

This issue owns the telemetry substrate part of #226. It is part of the same breaking release train as the behavior / BI issue; it is split for reviewability, not for independent deployment.

Implementation blueprint: `tasks/issue-240-telemetry-substrate/40-implementation-blueprint.md`

## Scope

- Final RawUserEvent contract.
- Unique Event Registry module and first event contracts.
- Naming rules for event_name / event_family.
- Registry ownership, versioning, schema, and BI-purpose metadata.
- v1-to-v2 mapping table for existing telemetry rows.
- Decision artifact for failed-result event naming.
- Rename v1 telemetry tables to backup names.
- Create new `user_telemetry_events` and `user_telemetry_rejected_events`.
- Remove `user_telemetry_segments` and `user_telemetry_journeys` from the final target schema.
- Data migration from v1 rows into context events and behavior events.
- New backend ingest validation against Event Registry.
- `event_id` idempotence, rejected-event quarantine, optional `trace_id`, and mandatory `journey_id`.
- Parse `x-journey-id` into Hono request context and pass typed journey context beyond controllers.

## Accepted Constraints

- Keep using the `user_telemetry_*` table family; do not introduce generic `raw_events`.
- Use a breaking migration, with data migration for existing telemetry rows.
- Accepted user behavior events require `journey_id`.
- Keep `trace_id` for joining user behavior with program behavior / observability.
- Do not add `seq`, `correlation_id`, `cause_event_id`, `source`, or `authority`.
- Do not put anonymous id or authenticated user hash on ordinary behavior event metadata / attributes.
- Identity context currently uses `auth.session.created`.

## Exit Criteria

- Registry tests prove duplicate names / versions / families are rejected.
- Mapping doc covers every existing v1 event name found in seed / fixture / current schema evidence.
- Existing telemetry rows are represented in the new ledger or explicitly quarantined.
- Accepted events contain no `seq`, `correlation_id`, `cause_event_id`, `source`, `authority`, anonymous id, or authenticated user hash.
- Backend user-command owners can emit result events with the frontend journey context.

## Implementation Blueprint Summary

1. Inventory current v1 telemetry schema, event names, analytics readers, and migration conventions.
2. Finalize RawUserEvent and unique Event Registry contract.
3. Define v1-to-v2 mapping before SQL.
4. Replace `user_telemetry_*` storage with new events/rejected-events tables and data migration.
5. Update backend ingest validation, idempotence, rejection quarantine, `trace_id`, and mandatory `journey_id`.
6. Parse `x-journey-id` into Hono context and pass typed journey context beyond controllers.
7. Verify registry, ingest, migration, and request-context behavior with backend tests and guardrails.
