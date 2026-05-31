alter table "partner_requests"
  add column "orders" uuid[] not null default ARRAY[]::uuid[];

alter table "trade_orders"
  add column "offer_id" bigint;

update "trade_orders"
set "offer_id" = ("offer_snapshot" ->> 'offerId')::bigint
where "offer_id" is null;

alter table "trade_orders"
  alter column "offer_id" set not null;

alter table "trade_orders"
  add constraint "trade_orders_offer_id_offers_id_fk"
  foreign key ("offer_id") references "offers"("id") on delete restrict;

create index "trade_orders_offer_status_idx"
  on "trade_orders" ("offer_id", "status");

update "partner_requests" pr
set "orders" = coalesce(attached.orders, ARRAY[]::uuid[])
from (
  select "pr_id", array_agg("order_id" order by "created_at") as orders
  from "pr_attached_orders"
  where "detached_at" is null
  group by "pr_id"
) attached
where pr."id" = attached."pr_id";

alter table "placements"
  add column "offer_id" bigint;

update "placements"
set "offer_id" = ("target" ->> 'offerId')::bigint
where "target" ->> 'kind' = 'OFFER';

alter table "placements"
  alter column "offer_id" set not null;

alter table "placements"
  add constraint "placements_offer_id_offers_id_fk"
  foreign key ("offer_id") references "offers"("id") on delete restrict;

update "placements"
set "creative" = jsonb_strip_nulls(
  jsonb_build_object(
    'ctaLabel', "creative" ->> 'ctaLabel',
    'description', coalesce("creative" ->> 'description', "creative" ->> 'subtitle')
  )
);

drop index if exists "placements_slot_status_priority_idx";

create index "placements_type_status_priority_idx"
  on "placements" ("placement_type", "status", "priority");

alter table "placements"
  drop column "slot_key",
  drop column "target";

alter table "trade_orders"
  drop column "offer_snapshot";

drop table "pr_attached_orders";
