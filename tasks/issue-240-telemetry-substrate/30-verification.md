# Verification

## Contract Verification

- Registry rejects duplicate event names / versions.
- Registry rejects missing owner, family, schema, or trigger contract fields.
- RawUserEvent validation rejects missing `journey_id`.
- RawUserEvent validation rejects unregistered event names or incompatible payload / attributes.
- Accepted event envelope does not expose `seq`, `correlation_id`, `cause_event_id`, `source`, `authority`, anonymous id, or authenticated user hash.

## Migration Verification

- v1 journey rows map to new journey rows.
- v1 segment rows map to context events or explicit quarantined records.
- v1 event rows map to new ledger rows with deterministic `event_id`, `event_name`, `event_version`, `event_family`, `attributes`, and `payload`.
- Reconstructed `auth.session.created` context events account for legacy identity fields where possible.
- Migration preserves `occurred_at` and `received_at` semantics.
- Target user telemetry instant columns use `timestamptz`.
- Migration-only `_v1` staging tables are dropped after backfill.
- Legacy `telemetry_events` storage is dropped after production readers move to `user_telemetry_*`.

## Backend Verification

- Ingest stores valid events idempotently by `event_id`.
- Invalid or unknown events go to `user_telemetry_rejected_events`.
- `trace_id` is persisted when present.
- `x-journey-id` is parsed into Hono context.
- Controllers can pass typed journey context to backend command owners without importing Hono into domain services.
- User telemetry datetime inputs require `Z` or an explicit offset.
