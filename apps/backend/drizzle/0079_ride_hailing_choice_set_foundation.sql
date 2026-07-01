alter table "product_skus"
  add column "presentation" jsonb not null default
    '{"heroImageAssetIds":[],"detailImageAssetIds":[],"sellingPoints":[],"parameterGroups":[],"noticeBlocks":[]}'::jsonb;

drop index if exists "ride_hailing_orders_provider_instance_idx";
drop index if exists "ride_hailing_orders_provider_order_idx";

alter table "ride_hailing_orders"
  drop column "provider_instance_id",
  drop column "provider_order_id";
