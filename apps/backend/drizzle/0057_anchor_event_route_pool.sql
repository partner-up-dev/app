alter table "anchor_events"
  add column if not exists "route_pool" jsonb not null default '[]'::jsonb;

alter table "anchor_events"
  drop constraint if exists "anchor_events_place_pool_chk";

alter table "anchor_events"
  add constraint "anchor_events_place_pool_chk" check (
    jsonb_typeof("location_pool") = 'array'
    and jsonb_typeof("route_pool") = 'array'
    and (
      jsonb_array_length("location_pool") = 0
      or jsonb_array_length("route_pool") = 0
    )
  );
