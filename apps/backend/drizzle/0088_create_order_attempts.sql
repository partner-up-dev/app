create table "create_order_attempts" (
  "id" uuid primary key default gen_random_uuid() not null,
  "actor_user_id" uuid not null references "users"("id") on delete restrict,
  "idempotency_key" text not null,
  "command_fingerprint" text not null,
  "pr_id" bigint not null references "partner_requests"("id") on delete restrict,
  "offer_id" bigint not null references "offers"("id") on delete restrict,
  "order_id" uuid not null references "trade_orders"("id") on delete restrict,
  "provider_instance_id" uuid not null
    references "ride_hailing_provider_instances"("id") on delete restrict,
  "external_order_id" text not null,
  "provider_order_id" text,
  "dispatch_seed" jsonb not null,
  "status" text default 'PREPARED' not null,
  "result_snapshot" jsonb,
  "response_status" integer,
  "provider_request_started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "replay_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "create_order_attempts_status_check"
    check ("status" in ('PREPARED', 'SUBMITTING', 'SUCCEEDED', 'FAILED'))
);

create unique index "create_order_attempts_actor_key_unique"
  on "create_order_attempts" ("actor_user_id", "idempotency_key");
create unique index "create_order_attempts_order_unique"
  on "create_order_attempts" ("order_id");
create unique index "create_order_attempts_provider_external_order_unique"
  on "create_order_attempts" ("provider_instance_id", "external_order_id");
create unique index "create_order_attempts_provider_order_unique"
  on "create_order_attempts" ("provider_instance_id", "provider_order_id")
  where "provider_order_id" is not null;
create index "create_order_attempts_pr_offer_status_idx"
  on "create_order_attempts" ("pr_id", "offer_id", "status");
