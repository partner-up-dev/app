alter table "bill_lines"
  add column "payment_provider_instance_id" uuid
    references "payment_provider_instances"("id") on delete restrict,
  add column "attempt_count" integer not null default 0,
  add column "settled_at" timestamptz;

create index "bill_lines_payment_provider_instance_idx"
  on "bill_lines" ("payment_provider_instance_id");

update "bill_lines" as line
set
  "payment_provider_instance_id" = ranked."provider_instance_id",
  "attempt_count" = 1,
  "settled_at" = ranked."succeeded_at"
from (
  select distinct on (tx."bill_line_id")
    tx."bill_line_id",
    tx."provider_instance_id",
    coalesce(tx."succeeded_at", tx."updated_at", tx."created_at") as "succeeded_at"
  from "payment_txs" as tx
  where tx."status" = 'SUCCEEDED'
  order by tx."bill_line_id", tx."created_at" desc, tx."id" desc
) as ranked
where line."id" = ranked."bill_line_id"
  and line."settled_at" is null;

drop table "payment_txs";
