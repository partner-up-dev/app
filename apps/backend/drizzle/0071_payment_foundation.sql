create table "payment_provider_instances" (
  "id" uuid primary key default gen_random_uuid(),
  "provider_type" text not null,
  "instance_key" text not null,
  "status" text not null default 'ACTIVE',
  "display_name" text not null,
  "config" jsonb not null,
  "active_credential_set_id" uuid,
  "supported_channels" text[] not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "payment_provider_instances_type_key_unique"
  on "payment_provider_instances" ("provider_type", "instance_key");

create index "payment_provider_instances_type_status_idx"
  on "payment_provider_instances" ("provider_type", "status");

create table "payment_provider_credential_sets" (
  "id" uuid primary key default gen_random_uuid(),
  "provider_instance_id" uuid not null references "payment_provider_instances"("id") on delete cascade,
  "status" text not null default 'ACTIVE',
  "merchant_serial_no" text not null,
  "merchant_private_key_pem" text not null,
  "api_v3_key" text not null,
  "verifier" jsonb not null,
  "effective_from" timestamptz not null default now(),
  "effective_to" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "payment_provider_credential_sets_instance_idx"
  on "payment_provider_credential_sets" ("provider_instance_id");

create unique index "payment_provider_credential_sets_active_unique"
  on "payment_provider_credential_sets" ("provider_instance_id")
  where "status" = 'ACTIVE';

create table "payment_client_provider_bindings" (
  "id" uuid primary key default gen_random_uuid(),
  "client_id" text not null,
  "provider_instance_id" uuid not null references "payment_provider_instances"("id") on delete cascade,
  "channel" text not null,
  "status" text not null default 'ACTIVE',
  "priority" integer not null default 100,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "payment_client_provider_bindings_client_status_priority_idx"
  on "payment_client_provider_bindings" ("client_id", "status", "priority");

create unique index "payment_client_provider_bindings_active_unique"
  on "payment_client_provider_bindings" ("client_id", "provider_instance_id", "channel")
  where "status" = 'ACTIVE';

create table "payment_txs" (
  "id" uuid primary key default gen_random_uuid(),
  "bill_id" uuid not null references "bills"("id") on delete cascade,
  "bill_line_id" uuid not null references "bill_lines"("id") on delete cascade,
  "direction" text not null,
  "provider_type" text not null,
  "provider_instance_id" uuid not null references "payment_provider_instances"("id") on delete restrict,
  "client_id" text not null,
  "channel" text not null,
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

create index "payment_txs_bill_idx"
  on "payment_txs" ("bill_id");

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
