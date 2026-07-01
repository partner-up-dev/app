create table "commerce_quotes" (
  "id" uuid primary key default gen_random_uuid(),
  "listing_session_id" uuid not null,
  "offer_id" bigint not null references "offers" ("id") on delete restrict,
  "product_type" text not null,
  "item_kind" text not null,
  "spu_id" bigint not null references "product_spus" ("id") on delete restrict,
  "sku_id" bigint not null references "product_skus" ("id") on delete restrict,
  "quantity" integer not null default 1,
  "listing_context_snapshot" jsonb not null,
  "fulfillment_quote_snapshot" jsonb not null,
  "pricing_snapshot" jsonb not null,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index "commerce_quotes_listing_session_idx"
  on "commerce_quotes" ("listing_session_id");

create index "commerce_quotes_offer_sku_idx"
  on "commerce_quotes" ("offer_id", "sku_id");

create index "commerce_quotes_expires_at_idx"
  on "commerce_quotes" ("expires_at");
