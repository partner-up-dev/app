alter table "payment_provider_instances"
  add column "client_id" text;

update "payment_provider_instances" as provider
set "client_id" = binding."client_id"
from (
  select
    "provider_instance_id",
    min("client_id") as "client_id"
  from "payment_client_provider_bindings"
  where "status" = 'ACTIVE'
  group by "provider_instance_id"
) as binding
where binding."provider_instance_id" = provider."id";

alter table "payment_provider_instances"
  alter column "client_id" set not null,
  drop column "supported_channels",
  drop column "active_credential_set_id";

create unique index "payment_provider_instances_active_client_unique"
  on "payment_provider_instances" ("client_id")
  where "status" = 'ACTIVE';

drop table "payment_client_provider_bindings";

drop index if exists "bill_lines_source_line_idx";

alter table "bill_lines"
  rename column "source_line_id" to "refund_of_bill_line_id";

alter table "bill_lines"
  add constraint "bill_lines_refund_of_bill_line_fk"
  foreign key ("refund_of_bill_line_id") references "bill_lines"("id")
  on delete restrict;

create index "bill_lines_refund_of_bill_line_idx"
  on "bill_lines" ("refund_of_bill_line_id");

alter table "payment_txs"
  rename column "direction" to "type";

alter table "payment_txs"
  drop column "bill_id",
  drop column "provider_type",
  drop column "channel",
  alter column "client_id" drop not null;
