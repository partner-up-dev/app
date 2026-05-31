create table if not exists "rental_orders" (
  "order_id" uuid primary key references "trade_orders" ("id") on delete cascade,
  "selected_zone_codes" text[] not null default ARRAY[]::text[],
  "service_start_at" timestamptz not null,
  "service_end_at" timestamptz not null,
  "participant_count" integer not null,
  "contact_phone" text not null,
  "registrants" jsonb not null default '[]'::jsonb,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from "trade_orders"
    where "family" = 'RENTAL'
      and (
        "service_start_at" is null
        or "service_end_at" is null
        or "participant_count" is null
        or "contact_phone" is null
      )
  ) then
    raise exception 'Cannot migrate Rental orders: required typed order facts are missing';
  end if;
end $$;

insert into "rental_orders" (
  "order_id",
  "selected_zone_codes",
  "service_start_at",
  "service_end_at",
  "participant_count",
  "contact_phone",
  "registrants",
  "created_at",
  "updated_at"
)
select
  "id",
  "selected_zone_codes",
  "service_start_at",
  "service_end_at",
  "participant_count",
  "contact_phone",
  "registrants",
  "created_at",
  "updated_at"
from "trade_orders"
where "family" = 'RENTAL'
  and not exists (
    select 1
    from "rental_orders"
    where "rental_orders"."order_id" = "trade_orders"."id"
  );

create index if not exists "rental_orders_service_start_idx"
  on "rental_orders" ("service_start_at");

drop index if exists "trade_orders_service_start_idx";

alter table "trade_orders" drop column if exists "selected_zone_codes";
alter table "trade_orders" drop column if exists "service_start_at";
alter table "trade_orders" drop column if exists "service_end_at";
alter table "trade_orders" drop column if exists "participant_count";
alter table "trade_orders" drop column if exists "contact_phone";
alter table "trade_orders" drop column if exists "registrants";
