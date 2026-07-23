alter table "partners"
  add column if not exists "admission_cycle_id" uuid;

update "partners"
set "admission_cycle_id" = gen_random_uuid()
where "status" in ('JOINED', 'CONFIRMED', 'ATTENDED')
  and "admission_cycle_id" is null;

create unique index if not exists "partners_admission_cycle_id_uq"
  on "partners" ("admission_cycle_id")
  where "admission_cycle_id" is not null;
