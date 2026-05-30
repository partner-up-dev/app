drop index if exists "payment_client_provider_bindings_active_unique";

alter table "payment_client_provider_bindings"
  drop column "channel";

create unique index "payment_client_provider_bindings_active_unique"
  on "payment_client_provider_bindings" ("client_id", "provider_instance_id")
  where "status" = 'ACTIVE';

alter table "payment_provider_instances"
  drop column "supported_channels";

alter table "payment_txs"
  rename column "direction" to "type";

alter table "payment_txs"
  drop column "provider_type",
  drop column "channel",
  alter column "client_id" drop not null,
  add column "source_payment_tx_id" uuid references "payment_txs"("id") on delete restrict;

create index "payment_txs_source_payment_tx_idx"
  on "payment_txs" ("source_payment_tx_id");
