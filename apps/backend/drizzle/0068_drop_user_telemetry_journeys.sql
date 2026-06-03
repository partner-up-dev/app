do $$
declare
  fk_name text;
begin
  for fk_name in
    select c.conname
    from pg_constraint c
    join pg_class child on child.oid = c.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    join pg_class parent on parent.oid = c.confrelid
    join pg_namespace parent_ns on parent_ns.oid = parent.relnamespace
    where c.contype = 'f'
      and child.relname = 'user_telemetry_events'
      and child_ns.nspname = 'public'
      and parent.relname = 'user_telemetry_journeys'
      and parent_ns.nspname = 'public'
  loop
    execute format(
      'alter table %I.%I drop constraint %I',
      'public',
      'user_telemetry_events',
      fk_name
    );
  end loop;
end $$;

drop table if exists "user_telemetry_journeys";
