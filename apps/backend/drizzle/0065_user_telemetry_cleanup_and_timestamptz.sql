alter table "user_telemetry_journeys"
  alter column "started_at" type timestamptz using "started_at" at time zone 'UTC',
  alter column "last_seen_at" type timestamptz using "last_seen_at" at time zone 'UTC',
  alter column "created_at" type timestamptz using "created_at" at time zone 'UTC',
  alter column "updated_at" type timestamptz using "updated_at" at time zone 'UTC';

alter table "user_telemetry_events"
  alter column "occurred_at" type timestamptz using "occurred_at" at time zone 'UTC',
  alter column "received_at" type timestamptz using "received_at" at time zone 'UTC';

alter table "user_telemetry_rejected_events"
  alter column "occurred_at" type timestamptz using "occurred_at" at time zone 'UTC',
  alter column "received_at" type timestamptz using "received_at" at time zone 'UTC';

drop table if exists "user_telemetry_events_v1";
drop table if exists "user_telemetry_segments_v1";
drop table if exists "user_telemetry_journeys_v1";
drop table if exists "telemetry_events";
