# V1 To V2 Mapping

## Table Mapping

- `user_telemetry_journeys` v1 is renamed to `user_telemetry_journeys_v1`.
- `user_telemetry_segments` v1 is renamed to `user_telemetry_segments_v1`.
- `user_telemetry_events` v1 is renamed to `user_telemetry_events_v1`.
- New target tables are `user_telemetry_events` and `user_telemetry_rejected_events`.
- `user_telemetry_segments` does not exist in the target schema.
- `user_telemetry_journeys` does not exist in the final target schema; `journey_id` is carried by each event row.
- The renamed `_v1` tables are migration-only staging surfaces and are dropped after the forward data backfill.

## Journey Rows

V1 journey context fields become context events:

- `journey.started`
- `route.entered` when `start_route` exists
- `auth.session.created` when `anonymous_id` or `user_id_hash` exists

Anonymous id and authenticated user hash are not copied to ordinary behavior events. They appear only in reconstructed `auth.session.created` payloads.

## Segment Rows

V1 segment rows become migration-only context events:

- `segment.started`
- `segment.ended` when `ended_at` exists

These events are marked as legacy segment context through registry family `legacy.segment`. They are not a reason to keep `user_telemetry_segments` in the target schema.

## Event Rows

Each v1 event row becomes one v2 raw user telemetry event:

- `id` -> `event_id`
- `event_name` -> `event_name`
- `event_version` -> `1`
- `app_journey_id` -> `journey_id`
- `trace_id` -> `trace_id`
- `occurred_at` -> `occurred_at`
- `received_at` -> `received_at`
- `properties` -> `payload`

Low-cardinality legacy context that can still help BI is placed in `attributes`, for example:

- route name
- start/current SPM
- source QR attribution

Event-owned references are placed in `payload`, for example:

- `event_id_ref`
- `pr_id_ref`
- `legacy_segment_id`
- `card_key`
- `segment_key`

## Dropped Fields

The final v2 model does not retain these v1 envelope fields:

- `source`
- `event_kind`
- `anonymous_id`
- `user_id_hash`
- `segment_id`
- `correlation_id`
- `request_id`

`correlation_id` and `request_id` are intentionally not carried forward as user-behavior event fields. `trace_id` is retained for observability linkage.

`0061` and `0062` are historical forward-only migrations that may have already created / populated `event_kind` and `user_telemetry_journeys`. The follow-up migration `0064_drop_user_telemetry_event_kind.sql` removes the target column and deletes the temporary `legacy_event_kind` attribute from migrated rows. `0065_user_telemetry_cleanup_and_timestamptz.sql` drops the `_v1` staging tables after backfill and converts target telemetry instant columns to `timestamptz`. `0068_drop_user_telemetry_journeys.sql` removes the surviving journey entity table and the event FK.

## Ordering

No business `seq` is generated.

Projection code may sort migrated rows by:

1. `occurred_at`
2. context-event priority
3. event id

That ordering is a projection rule, not persisted business truth.
