alter table "partner_requests"
  add column if not exists "route" jsonb default null;

alter table "partner_requests"
  drop constraint if exists "partner_requests_place_mode_chk";

alter table "partner_requests"
  add constraint "partner_requests_place_mode_chk" check (
    "route" is null
    or
    (
      "location" is null and
      jsonb_typeof("route") = 'array' and
      jsonb_array_length("route") >= 2
    )
  );
