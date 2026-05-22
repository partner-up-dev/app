update "user_telemetry_events"
set "attributes" = "attributes" - 'legacy_event_kind'
where "attributes" ? 'legacy_event_kind';

alter table "user_telemetry_events"
  drop column if exists "event_kind";
