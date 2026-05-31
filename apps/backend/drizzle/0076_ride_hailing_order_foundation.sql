create table if not exists "ride_hailing_orders" (
  "order_id" uuid primary key references "trade_orders" ("id") on delete cascade,
  "route_snapshot" jsonb not null,
  "departure_at" timestamptz,
  "riders" jsonb not null default '[]'::jsonb,
  "contact_phone" text not null,
  "provider_creation_status" text not null default 'PENDING',
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index if not exists "ride_hailing_orders_departure_at_idx"
  on "ride_hailing_orders" ("departure_at");

create index if not exists "ride_hailing_orders_provider_creation_status_idx"
  on "ride_hailing_orders" ("provider_creation_status");

create table if not exists "ride_hailing_fulfillments" (
  "id" uuid primary key default gen_random_uuid(),
  "order_id" uuid not null references "trade_orders" ("id") on delete cascade,
  "lifecycle_status" text not null default 'PENDING',
  "provider_instance_id" uuid not null references "ride_hailing_provider_instances" ("id") on delete restrict,
  "provider_type" text not null,
  "external_order_id" text,
  "provider_order_id" text,
  "provider_execution_ref" jsonb,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index if not exists "ride_hailing_fulfillments_order_unique"
  on "ride_hailing_fulfillments" ("order_id");

create index if not exists "ride_hailing_fulfillments_provider_instance_idx"
  on "ride_hailing_fulfillments" ("provider_instance_id");

create unique index if not exists "ride_hailing_fulfillments_external_order_unique"
  on "ride_hailing_fulfillments" ("external_order_id")
  where "external_order_id" is not null;

create unique index if not exists "ride_hailing_fulfillments_provider_order_unique"
  on "ride_hailing_fulfillments" ("provider_type", "provider_order_id")
  where "provider_order_id" is not null;
