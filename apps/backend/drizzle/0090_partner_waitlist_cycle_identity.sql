alter table "partners"
  add column if not exists "waitlist_cycle_id" uuid;

update "partners"
set "waitlist_cycle_id" = gen_random_uuid()
where "status" = 'PENDING'
  and "waitlist_cycle_id" is null;

create unique index if not exists "partners_waitlist_cycle_id_uq"
  on "partners" ("waitlist_cycle_id")
  where "waitlist_cycle_id" is not null;
