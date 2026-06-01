create table "product_spus" (
  "id" bigserial primary key,
  "version" integer not null default 1,
  "status" text not null default 'DRAFT',
  "name" text not null,
  "product_type" text not null,
  "sales_policy" jsonb not null,
  "service_policy" jsonb not null,
  "presentation" jsonb not null,
  "facts" jsonb not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "product_spus_product_type_status_idx"
  on "product_spus" ("product_type", "status");

create table "product_skus" (
  "id" bigserial primary key,
  "spu_id" bigint not null references "product_spus"("id") on delete cascade,
  "version" integer not null default 1,
  "status" text not null default 'DRAFT',
  "name" text not null,
  "sort_order" integer not null default 0,
  "facts" jsonb not null,
  "pricing_model" jsonb not null,
  "cancellation_policy_ref" jsonb default null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "product_skus_spu_sort_order_idx"
  on "product_skus" ("spu_id", "sort_order");

create table "sku_cancellation_policies" (
  "policy_id" text not null,
  "policy_version" integer not null,
  "sku_id" bigint not null references "product_skus"("id") on delete cascade,
  "basis" text not null,
  "operator_buffer_minutes" integer not null,
  "tiers" jsonb not null,
  "created_at" timestamptz not null default now(),
  constraint "sku_cancellation_policies_pk"
    primary key ("policy_id", "policy_version")
);

create index "sku_cancellation_policies_sku_version_idx"
  on "sku_cancellation_policies" ("sku_id", "policy_version");

create table "offers" (
  "id" bigserial primary key,
  "status" text not null default 'DRAFT',
  "product_type" text not null,
  "spu_ids" bigint[] not null default ARRAY[]::bigint[],
  "pricing_policy" jsonb not null,
  "terms_version" integer not null default 1,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "offers_product_type_status_idx"
  on "offers" ("product_type", "status");

create table "placements" (
  "id" bigserial primary key,
  "status" text not null default 'DRAFT',
  "placement_type" text not null,
  "offer_id" bigint not null references "offers"("id") on delete restrict,
  "matching_rule" jsonb not null,
  "priority" integer not null default 0,
  "effective_from" timestamptz,
  "effective_to" timestamptz,
  "creative" jsonb not null,
  "binding_rules" jsonb not null default
    '[
      {
        "fieldKey": "participantCount",
        "contextPath": "activeParticipantCount",
        "lock": true
      },
      {
        "fieldKey": "serviceStartAt",
        "contextPath": "time.startAt",
        "lock": true
      },
      {
        "fieldKey": "serviceEndAt",
        "contextPath": "time.endAt",
        "lock": true
      }
    ]'::jsonb,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "placements_type_status_priority_idx"
  on "placements" ("placement_type", "status", "priority");

alter table "partner_requests"
  add column "orders" uuid[] not null default ARRAY[]::uuid[];

create table "trade_orders" (
  "id" uuid primary key default gen_random_uuid(),
  "family" text not null,
  "offer_id" bigint not null references "offers"("id") on delete restrict,
  "created_by" uuid not null references "users"("id") on delete restrict,
  "status" text not null default 'OPEN',
  "participants" jsonb not null,
  "split_rule_snapshot" jsonb not null,
  "items" jsonb not null,
  "timeout" jsonb not null,
  "termination_attempts" jsonb not null default '[]'::jsonb,
  "closed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "trade_orders_family_status_idx"
  on "trade_orders" ("family", "status");

create index "trade_orders_offer_status_idx"
  on "trade_orders" ("offer_id", "status");

create table "rental_orders" (
  "order_id" uuid primary key references "trade_orders" ("id") on delete cascade,
  "service_start_at" timestamptz not null,
  "service_end_at" timestamptz not null,
  "contact_phone" text not null,
  "registrants" jsonb not null default '[]'::jsonb,
  "booking_status" text not null default 'PENDING_BOOKING',
  "cancellation_handling_status" text not null default 'NONE',
  "supplier_cancellation_outcome" text default null,
  "entry_guidance" jsonb default null,
  "booking_note" text,
  "cancellation_note" text,
  "service_ended_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "rental_orders_service_start_idx"
  on "rental_orders" ("service_start_at");

create table "bills" (
  "id" uuid primary key default gen_random_uuid(),
  "source_order_id" uuid not null references "trade_orders"("id") on delete cascade,
  "status" text not null default 'ACTIVE',
  "currency" text not null default 'CNY',
  "closed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "bills_source_order_idx"
  on "bills" ("source_order_id");

create unique index "bills_source_order_unique"
  on "bills" ("source_order_id");

create table "bill_lines" (
  "id" uuid primary key default gen_random_uuid(),
  "bill_id" uuid not null references "bills"("id") on delete cascade,
  "user_id" uuid not null references "users"("id") on delete restrict,
  "kind" text not null,
  "amount_fen" integer not null,
  "currency" text not null default 'CNY',
  "label" text not null,
  "description" text,
  "refund_of_bill_line_id" uuid references "bill_lines"("id") on delete restrict,
  "created_at" timestamptz not null default now()
);

create index "bill_lines_bill_kind_idx"
  on "bill_lines" ("bill_id", "kind");

create index "bill_lines_user_idx"
  on "bill_lines" ("user_id");

create index "bill_lines_refund_of_bill_line_idx"
  on "bill_lines" ("refund_of_bill_line_id");
