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
