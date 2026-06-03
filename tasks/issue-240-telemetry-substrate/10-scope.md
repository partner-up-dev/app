# Scope

## In Scope

- Final RawUserEvent contract.
- Unique Event Registry module and first event contracts.
- Naming rules for event_name / event_family.
- Registry ownership, versioning, schema, and BI-purpose metadata.
- v1-to-v2 mapping table for existing telemetry rows.
- Decision artifact for failed-result event naming.
- Breaking replacement of current `user_telemetry_*` schema.
- Data migration from v1 rows into v2 journeys, context events, and behavior events.
- New backend ingest validation against Event Registry.
- `event_id` idempotence.
- Rejected-event quarantine.
- Optional `trace_id` persistence.
- Mandatory `journey_id` for accepted user telemetry.
- `x-journey-id` parsing into Hono request context and typed propagation beyond controllers.

## Out Of Scope

- Full frontend event migration.
- Dashboard updates.
- BI projection rebuild.
- Adding broad PR funnel event production beyond proving backend command owners can receive journey context.
- Program behavior collection implementation.

## Deliverables

- Registry contract and tests.
- Migration mapping artifact.
- Backend schema migration.
- Data migration.
- Ingest validation and rejected-event handling.
- Backend request journey context helper / middleware.
