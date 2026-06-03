alter table if exists "user_telemetry_events" rename to "user_telemetry_events_v1";
alter table if exists "user_telemetry_segments" rename to "user_telemetry_segments_v1";
alter table if exists "user_telemetry_journeys" rename to "user_telemetry_journeys_v1";

alter table if exists "user_telemetry_events_v1"
  drop constraint if exists "user_telemetry_events_app_journey_id_user_telemetry_journeys_id_fk",
  drop constraint if exists "user_telemetry_events_segment_id_user_telemetry_segments_id_fk";

alter table if exists "user_telemetry_segments_v1"
  drop constraint if exists "user_telemetry_segments_app_journey_id_user_telemetry_journeys_id_fk";

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'user_telemetry_journeys_pkey'
  ) then
    alter table "user_telemetry_journeys_v1"
      rename constraint "user_telemetry_journeys_pkey" to "user_telemetry_journeys_v1_pkey";
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'user_telemetry_segments_pkey'
  ) then
    alter table "user_telemetry_segments_v1"
      rename constraint "user_telemetry_segments_pkey" to "user_telemetry_segments_v1_pkey";
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'user_telemetry_events_pkey'
  ) then
    alter table "user_telemetry_events_v1"
      rename constraint "user_telemetry_events_pkey" to "user_telemetry_events_v1_pkey";
  end if;
end $$;

alter index if exists "user_telemetry_journeys_started_at_idx"
  rename to "user_telemetry_journeys_v1_started_at_idx";
alter index if exists "user_telemetry_journeys_start_spm_started_at_idx"
  rename to "user_telemetry_journeys_v1_start_spm_started_at_idx";
alter index if exists "user_telemetry_journeys_anonymous_started_at_idx"
  rename to "user_telemetry_journeys_v1_anonymous_started_at_idx";

alter index if exists "user_telemetry_segments_kind_started_at_idx"
  rename to "user_telemetry_segments_v1_kind_started_at_idx";
alter index if exists "user_telemetry_segments_journey_started_at_idx"
  rename to "user_telemetry_segments_v1_journey_started_at_idx";
alter index if exists "user_telemetry_segments_event_mode_started_at_idx"
  rename to "user_telemetry_segments_v1_event_mode_started_at_idx";

alter index if exists "user_telemetry_events_name_occurred_at_idx"
  rename to "user_telemetry_events_v1_name_occurred_at_idx";
alter index if exists "user_telemetry_events_journey_occurred_at_idx"
  rename to "user_telemetry_events_v1_journey_occurred_at_idx";
alter index if exists "user_telemetry_events_segment_occurred_at_idx"
  rename to "user_telemetry_events_v1_segment_occurred_at_idx";
alter index if exists "user_telemetry_events_event_ref_occurred_at_idx"
  rename to "user_telemetry_events_v1_event_ref_occurred_at_idx";
alter index if exists "user_telemetry_events_pr_ref_occurred_at_idx"
  rename to "user_telemetry_events_v1_pr_ref_occurred_at_idx";
alter index if exists "user_telemetry_events_card_key_occurred_at_idx"
  rename to "user_telemetry_events_v1_card_key_occurred_at_idx";
alter index if exists "user_telemetry_events_current_spm_occurred_at_idx"
  rename to "user_telemetry_events_v1_current_spm_occurred_at_idx";
alter index if exists "user_telemetry_events_correlation_id_idx"
  rename to "user_telemetry_events_v1_correlation_id_idx";
alter index if exists "user_telemetry_events_request_id_idx"
  rename to "user_telemetry_events_v1_request_id_idx";

create table "user_telemetry_journeys" (
  "id" uuid primary key not null,
  "started_at" timestamp not null,
  "last_seen_at" timestamp not null,
  "created_at" timestamp default now() not null,
  "updated_at" timestamp default now() not null
);

create index "user_telemetry_journeys_started_at_idx"
  on "user_telemetry_journeys" ("started_at");
create index "user_telemetry_journeys_last_seen_at_idx"
  on "user_telemetry_journeys" ("last_seen_at");

create table "user_telemetry_events" (
  "event_id" uuid primary key not null,
  "event_name" text not null,
  "event_version" integer not null,
  "event_family" text not null,
  "event_kind" text not null,
  "journey_id" uuid not null references "user_telemetry_journeys"("id"),
  "trace_id" text,
  "attributes" jsonb default '{}'::jsonb not null,
  "payload" jsonb not null,
  "occurred_at" timestamp not null,
  "received_at" timestamp default now() not null
);

create index "user_telemetry_events_name_occurred_at_idx"
  on "user_telemetry_events" ("event_name", "occurred_at");
create index "user_telemetry_events_family_occurred_at_idx"
  on "user_telemetry_events" ("event_family", "occurred_at");
create index "user_telemetry_events_journey_occurred_at_idx"
  on "user_telemetry_events" ("journey_id", "occurred_at");
create index "user_telemetry_events_trace_id_idx"
  on "user_telemetry_events" ("trace_id");
create index "user_telemetry_events_received_at_idx"
  on "user_telemetry_events" ("received_at");

create table "user_telemetry_rejected_events" (
  "id" uuid primary key default gen_random_uuid() not null,
  "event_id" text,
  "event_name" text,
  "event_version" integer,
  "journey_id" text,
  "occurred_at" timestamp,
  "failure_code" text not null,
  "failure_message" text not null,
  "raw_event" jsonb not null,
  "received_at" timestamp default now() not null
);

create index "user_telemetry_rejected_events_name_received_at_idx"
  on "user_telemetry_rejected_events" ("event_name", "received_at");
create index "user_telemetry_rejected_events_failure_received_at_idx"
  on "user_telemetry_rejected_events" ("failure_code", "received_at");
