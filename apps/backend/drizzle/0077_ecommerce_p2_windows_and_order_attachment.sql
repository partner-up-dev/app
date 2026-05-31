alter table "placements"
  add column "effective_from" timestamptz,
  add column "effective_to" timestamptz;

drop index if exists "pr_attached_orders_pr_offer_unique";

create index if not exists "pr_attached_orders_pr_offer_idx"
  on "pr_attached_orders" ("pr_id", "offer_id");
