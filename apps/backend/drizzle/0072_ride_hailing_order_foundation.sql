create table "ride_hailing_provider_instances" (
  "id" uuid primary key default gen_random_uuid(),
  "provider_type" text not null,
  "instance_key" text not null,
  "status" text not null default 'ACTIVE',
  "display_name" text not null,
  "config" jsonb not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "ride_hailing_provider_instances_type_key_unique"
  on "ride_hailing_provider_instances" ("provider_type", "instance_key");

create index "ride_hailing_provider_instances_type_status_idx"
  on "ride_hailing_provider_instances" ("provider_type", "status");

create table "ride_hailing_orders" (
  "order_id" uuid primary key references "trade_orders" ("id") on delete cascade,
  "route_snapshot" jsonb not null,
  "departure_at" timestamptz,
  "riders" jsonb not null default '[]'::jsonb,
  "contact_phone" text not null,
  "provider_instance_id" uuid not null references "ride_hailing_provider_instances" ("id") on delete restrict,
  "provider_order_id" text,
  "execution_phase" text not null default 'INITIATING',
  "driver_snapshot" jsonb default null,
  "vehicle_snapshot" jsonb default null,
  "final_settlement_input" jsonb default null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "ride_hailing_orders_departure_at_idx"
  on "ride_hailing_orders" ("departure_at");

create index "ride_hailing_orders_provider_instance_idx"
  on "ride_hailing_orders" ("provider_instance_id");

create index "ride_hailing_orders_provider_order_idx"
  on "ride_hailing_orders" ("provider_order_id");

create index "ride_hailing_orders_execution_phase_idx"
  on "ride_hailing_orders" ("execution_phase");
