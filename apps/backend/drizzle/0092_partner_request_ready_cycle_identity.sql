alter table "partner_requests"
  add column if not exists "ready_cycle_id" uuid;

update "partner_requests"
set "ready_cycle_id" = gen_random_uuid()
where "status" in ('READY', 'ACTIVE')
  and "ready_cycle_id" is null;

create unique index if not exists "partner_requests_ready_cycle_id_uq"
  on "partner_requests" ("ready_cycle_id")
  where "ready_cycle_id" is not null;
