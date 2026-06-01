alter table "rental_orders"
  add column if not exists "booking_status" text not null default 'PENDING_BOOKING',
  add column if not exists "cancellation_handling_status" text not null default 'NONE',
  add column if not exists "supplier_cancellation_outcome" text,
  add column if not exists "entry_guidance" jsonb,
  add column if not exists "booking_note" text,
  add column if not exists "cancellation_note" text,
  add column if not exists "service_ended_at" timestamptz;

update "rental_orders" ro
set
  "booking_status" = rf."booking_status",
  "cancellation_handling_status" = rf."cancellation_handling_status",
  "supplier_cancellation_outcome" = rf."supplier_cancellation_outcome",
  "entry_guidance" = rf."entry_guidance",
  "booking_note" = rf."booking_note",
  "cancellation_note" = rf."cancellation_note",
  "service_ended_at" = rf."service_ended_at",
  "updated_at" = greatest(ro."updated_at", rf."updated_at")
from "rental_fulfillments" rf
where ro."order_id" = rf."order_id";

alter table "ride_hailing_orders"
  add column if not exists "provider_instance_id" uuid references "ride_hailing_provider_instances" ("id") on delete restrict,
  add column if not exists "provider_order_id" text;

update "ride_hailing_orders" rho
set
  "provider_instance_id" = rhf."provider_instance_id",
  "provider_order_id" = rhf."provider_order_id",
  "updated_at" = greatest(rho."updated_at", rhf."updated_at")
from "ride_hailing_fulfillments" rhf
where rho."order_id" = rhf."order_id";

do $$
begin
  if exists (
    select 1
    from "ride_hailing_orders"
    where "provider_instance_id" is null
  ) then
    raise exception 'Cannot merge RideHailing fulfillment: provider_instance_id is missing';
  end if;
end $$;

alter table "ride_hailing_orders"
  alter column "provider_instance_id" set not null;

update "trade_orders"
set "items" = coalesce((
  select jsonb_agg(
    case
      when item ? 'sku' then item
      else jsonb_build_object(
        'itemId', item ->> 'itemId',
        'sku', jsonb_build_object(
          'id', (item ->> 'skuId')::bigint,
          'version', (item ->> 'skuVersion')::integer,
          'name', item ->> 'skuName',
          'factsSnapshot', item -> 'skuFactsSnapshot',
          'pricingModelSnapshot', item -> 'pricingModelSnapshot',
          'cancellationPolicySnapshot', item -> 'cancellationPolicySnapshot'
        ),
        'quantity', (item ->> 'quantity')::integer
      )
    end
  )
  from jsonb_array_elements("trade_orders"."items") as item
), '[]'::jsonb)
where "items" is not null;

drop index if exists "ride_hailing_orders_provider_creation_status_idx";
drop index if exists "rental_fulfillments_lifecycle_booking_idx";
drop index if exists "rental_fulfillments_order_unique";
drop index if exists "ride_hailing_fulfillments_order_unique";
drop index if exists "ride_hailing_fulfillments_provider_instance_idx";
drop index if exists "ride_hailing_fulfillments_external_order_unique";
drop index if exists "ride_hailing_fulfillments_provider_order_unique";

create index if not exists "ride_hailing_orders_provider_instance_idx"
  on "ride_hailing_orders" ("provider_instance_id");

create index if not exists "ride_hailing_orders_provider_order_idx"
  on "ride_hailing_orders" ("provider_order_id");

alter table "trade_orders" drop column if exists "pricing_snapshot";
alter table "rental_orders" drop column if exists "selected_zone_codes";
alter table "rental_orders" drop column if exists "participant_count";
alter table "ride_hailing_orders" drop column if exists "provider_creation_status";

drop table if exists "rental_fulfillments";
drop table if exists "ride_hailing_fulfillments";
