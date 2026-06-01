alter table "product_spus"
  drop column if exists "pricing_policy";

alter table "ride_hailing_orders"
  add column if not exists "execution_phase" text not null default 'INITIATING',
  add column if not exists "driver_snapshot" jsonb,
  add column if not exists "vehicle_snapshot" jsonb,
  add column if not exists "final_settlement_input" jsonb;

create index if not exists "ride_hailing_orders_execution_phase_idx"
  on "ride_hailing_orders" ("execution_phase");
