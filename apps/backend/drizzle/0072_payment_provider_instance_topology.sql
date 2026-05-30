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

with active_credentials as (
  select distinct on ("provider_instance_id")
    "provider_instance_id",
    "merchant_serial_no",
    "merchant_private_key_pem",
    "api_v3_key",
    "verifier",
    "created_at"
  from "payment_provider_credential_sets"
  where "status" = 'ACTIVE'
  order by "provider_instance_id", "created_at" desc
)
update "payment_provider_instances" as provider
set "config" =
  provider."config"
  - 'notifyBaseUrl'
  - 'paymentNotifyPath'
  - 'refundNotifyPath'
  || jsonb_build_object(
  'apiV3Key',
  credential."api_v3_key",
  'merchantCertificate',
  jsonb_build_object(
    'serialNo',
    credential."merchant_serial_no",
    'privateKeyPem',
    credential."merchant_private_key_pem",
    'certificatePem',
    null
  ),
  'platformCertificates',
  case
    when credential."verifier" ->> 'mode' = 'PLATFORM_CERTIFICATE' then
      jsonb_build_array(jsonb_build_object(
        'serialNo',
        credential."verifier" ->> 'certificateSerialNo',
        'certificatePem',
        credential."verifier" ->> 'certificatePem',
        'effectiveTime',
        null,
        'expireTime',
        null
      ))
    when credential."verifier" ->> 'mode' = 'WECHAT_PAY_PUBLIC_KEY' then
      jsonb_build_array(jsonb_build_object(
        'serialNo',
        credential."verifier" ->> 'publicKeyId',
        'certificatePem',
        credential."verifier" ->> 'publicKeyPem',
        'effectiveTime',
        null,
        'expireTime',
        null
      ))
    else null
  end
)
from active_credentials as credential
where credential."provider_instance_id" = provider."id"
  and provider."config" ->> 'adapterMode' = 'WECHAT_PAY_API_V3';

create unique index "payment_provider_instances_active_client_unique"
  on "payment_provider_instances" ("client_id")
  where "status" = 'ACTIVE';

drop table "payment_client_provider_bindings";

drop table "payment_provider_credential_sets";

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
