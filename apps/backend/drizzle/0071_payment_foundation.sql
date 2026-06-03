create table "payment_provider_instances" (
  "id" uuid primary key default gen_random_uuid(),
  "provider_type" text not null,
  "instance_key" text not null,
  "status" text not null default 'ACTIVE',
  "display_name" text not null,
  "client_id" text not null,
  "config" jsonb not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "payment_provider_instances_type_key_unique"
  on "payment_provider_instances" ("provider_type", "instance_key");

create index "payment_provider_instances_type_status_idx"
  on "payment_provider_instances" ("provider_type", "status");

create unique index "payment_provider_instances_active_client_unique"
  on "payment_provider_instances" ("client_id")
  where "status" = 'ACTIVE';

create table "payment_txs" (
  "id" uuid primary key default gen_random_uuid(),
  "bill_line_id" uuid not null references "bill_lines"("id") on delete cascade,
  "type" text not null,
  "provider_instance_id" uuid not null references "payment_provider_instances"("id") on delete restrict,
  "client_id" text,
  "status" text not null default 'INITIATED',
  "amount_fen" integer not null,
  "currency" text not null default 'CNY',
  "requested_by" uuid not null references "users"("id") on delete restrict,
  "merchant_order_no" text,
  "merchant_refund_no" text,
  "provider_prepay_id" text,
  "provider_transaction_id" text,
  "provider_refund_id" text,
  "provider_status" text,
  "client_action" jsonb,
  "provider_snapshot" jsonb,
  "failure_code" text,
  "failure_message" text,
  "expires_at" timestamptz,
  "succeeded_at" timestamptz,
  "closed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "payment_txs_bill_line_idx"
  on "payment_txs" ("bill_line_id");

create index "payment_txs_provider_instance_idx"
  on "payment_txs" ("provider_instance_id");

create index "payment_txs_status_updated_at_idx"
  on "payment_txs" ("status", "updated_at");

create unique index "payment_txs_provider_order_unique"
  on "payment_txs" ("provider_instance_id", "merchant_order_no")
  where "merchant_order_no" is not null;

create unique index "payment_txs_provider_refund_unique"
  on "payment_txs" ("provider_instance_id", "merchant_refund_no")
  where "merchant_refund_no" is not null;
