create table "product_spus" (
  "id" bigserial primary key,
  "version" integer not null default 1,
  "status" text not null default 'DRAFT',
  "name" text not null,
  "product_type" text not null,
  "sales_policy" jsonb not null,
  "service_policy" jsonb not null,
  "pricing_policy" jsonb not null,
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
  "slot_key" text not null,
  "placement_type" text not null,
  "matching_rule" jsonb not null,
  "priority" integer not null default 0,
  "creative" jsonb not null,
  "target" jsonb not null,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "placements_slot_status_priority_idx"
  on "placements" ("slot_key", "status", "priority");

create table "trade_orders" (
  "id" uuid primary key default gen_random_uuid(),
  "family" text not null,
  "created_by" uuid not null references "users"("id") on delete restrict,
  "status" text not null default 'OPEN',
  "participants" jsonb not null,
  "split_rule_snapshot" jsonb not null,
  "offer_snapshot" jsonb not null,
  "items" jsonb not null,
  "pricing_snapshot" jsonb not null,
  "timeout" jsonb not null,
  "termination_attempts" jsonb not null default '[]'::jsonb,
  "selected_zone_codes" text[] not null default ARRAY[]::text[],
  "service_start_at" timestamptz,
  "service_end_at" timestamptz,
  "participant_count" integer,
  "contact_phone" text,
  "registrants" jsonb not null default '[]'::jsonb,
  "closed_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create index "trade_orders_family_status_idx"
  on "trade_orders" ("family", "status");

create index "trade_orders_service_start_idx"
  on "trade_orders" ("service_start_at");

create table "pr_attached_orders" (
  "order_id" uuid primary key references "trade_orders"("id") on delete cascade,
  "pr_id" bigint not null references "partner_requests"("id") on delete cascade,
  "offer_id" bigint not null references "offers"("id") on delete restrict,
  "detached_at" timestamptz,
  "created_at" timestamptz not null default now()
);

create unique index "pr_attached_orders_pr_offer_unique"
  on "pr_attached_orders" ("pr_id", "offer_id")
  where "detached_at" is null;

create index "pr_attached_orders_pr_idx"
  on "pr_attached_orders" ("pr_id");

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
  "source_line_id" uuid,
  "created_at" timestamptz not null default now()
);

create index "bill_lines_bill_kind_idx"
  on "bill_lines" ("bill_id", "kind");

create index "bill_lines_user_idx"
  on "bill_lines" ("user_id");

create table "rental_fulfillments" (
  "id" uuid primary key default gen_random_uuid(),
  "order_id" uuid not null references "trade_orders"("id") on delete cascade,
  "lifecycle_status" text not null default 'PENDING',
  "booking_status" text not null default 'PENDING_BOOKING',
  "cancellation_handling_status" text not null default 'NONE',
  "supplier_cancellation_outcome" text default null,
  "entry_guidance" jsonb default null,
  "booking_note" text,
  "cancellation_note" text,
  "irreversible_boundary_at" timestamptz,
  "service_ended_at" timestamptz,
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "rental_fulfillments_order_unique"
  on "rental_fulfillments" ("order_id");

create index "rental_fulfillments_lifecycle_booking_idx"
  on "rental_fulfillments" ("lifecycle_status", "booking_status");
