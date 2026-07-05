-- Stable development-only ride-hailing baseline for local ordering-page work.
-- migration: environments=development
--
-- Keep this file limited to provider and catalog rows. Do not add offers,
-- placements, PRs, orders, real provider credentials, or scenario fixtures here.

do $$
declare
  provider_instance_key constant text := 'caocao-openapi-primary';
  provider_endpoint_base_url constant text := 'https://caocao.partner-up.localhost';
  backend_callback_base_url constant text := 'https://api.partner-up.localhost';

  v_provider_instance_id uuid;
  v_spu_id bigint;
  v_express_sku_id bigint;
  v_premier_sku_id bigint;
begin
  select id
    into v_provider_instance_id
    from ride_hailing_provider_instances
   where provider_type = 'CAOCAO'
     and instance_key = provider_instance_key
   order by created_at asc
   limit 1;

  if v_provider_instance_id is null then
    insert into ride_hailing_provider_instances (
      provider_type,
      instance_key,
      status,
      display_name,
      config,
      created_at,
      updated_at
    )
    values (
      'CAOCAO',
      provider_instance_key,
      'ACTIVE',
      '系统曹操',
      jsonb_build_object(
        'adapterMode', 'CAOCAO_OPEN_API',
        'caocaoClientId', 'partnerup-caocao-client',
        'signKey', 'partnerup-caocao-sign-key',
        'endpointBaseUrl', provider_endpoint_base_url,
        'callbackBaseUrl', backend_callback_base_url,
        'requestTimeoutMs', 5000
      ),
      now(),
      now()
    )
    returning id into v_provider_instance_id;
  else
    update ride_hailing_provider_instances
       set status = 'ACTIVE',
           display_name = '系统曹操',
           config = jsonb_build_object(
             'adapterMode', 'CAOCAO_OPEN_API',
             'caocaoClientId', 'partnerup-caocao-client',
             'signKey', 'partnerup-caocao-sign-key',
             'endpointBaseUrl', provider_endpoint_base_url,
             'callbackBaseUrl', backend_callback_base_url,
             'requestTimeoutMs', 5000
           ),
           updated_at = now()
     where id = v_provider_instance_id;
  end if;

  select id
    into v_spu_id
    from product_spus
   where product_type = 'RIDE_HAILING'
     and name = '系统曹操出行'
   order by created_at asc
   limit 1;

  if v_spu_id is null then
    insert into product_spus (
      version,
      status,
      name,
      product_type,
      sales_policy,
      service_policy,
      presentation,
      facts,
      created_at,
      updated_at
    )
    values (
      1,
      'ACTIVE',
      '系统曹操出行',
      'RIDE_HAILING',
      '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"CHOICE_SET","min":1,"max":null,"resolvesTo":1}}'::jsonb,
      '{"type":"RIDE_HAILING"}'::jsonb,
      '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":["曹操实时预估","行程结束后按实际费用结算"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
    returning id into v_spu_id;
  else
    update product_spus
       set version = 1,
           status = 'ACTIVE',
           sales_policy = '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"CHOICE_SET","min":1,"max":null,"resolvesTo":1}}'::jsonb,
           service_policy = '{"type":"RIDE_HAILING"}'::jsonb,
           presentation = '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":["曹操实时预估","行程结束后按实际费用结算"]}'::jsonb,
           facts = '{}'::jsonb,
           updated_at = now()
     where id = v_spu_id;
  end if;

  select id
    into v_express_sku_id
    from product_skus
   where product_skus.spu_id = v_spu_id
     and name = '快车'
   order by created_at asc
   limit 1;

  if v_express_sku_id is null then
    insert into product_skus (
      spu_id,
      version,
      status,
      name,
      sort_order,
      facts,
      pricing_model,
      created_at,
      updated_at
    )
    values (
      v_spu_id,
      1,
      'ACTIVE',
      '快车',
      10,
      jsonb_build_object(
        'rideHailingProviderInstanceId', v_provider_instance_id::text,
        'providerVehicleTypeCode', '3'
      ),
      '{"type":"DYNAMIC_QUOTE","calculatorSpec":{"version":1,"currency":"CNY","components":[{"id":"caocao-provider-estimate","label":"曹操预估价","amount":{"type":"INPUT","path":"provider.estimateAmountFen"}}]}}'::jsonb,
      now(),
      now()
    )
    returning id into v_express_sku_id;
  else
    update product_skus
       set version = 1,
           status = 'ACTIVE',
           sort_order = 10,
           facts = jsonb_build_object(
             'rideHailingProviderInstanceId', v_provider_instance_id::text,
             'providerVehicleTypeCode', '3'
           ),
           pricing_model = '{"type":"DYNAMIC_QUOTE","calculatorSpec":{"version":1,"currency":"CNY","components":[{"id":"caocao-provider-estimate","label":"曹操预估价","amount":{"type":"INPUT","path":"provider.estimateAmountFen"}}]}}'::jsonb,
           cancellation_policy_ref = null,
           updated_at = now()
     where id = v_express_sku_id;
  end if;

  select id
    into v_premier_sku_id
    from product_skus
   where product_skus.spu_id = v_spu_id
     and name = '专车'
   order by created_at asc
   limit 1;

  if v_premier_sku_id is null then
    insert into product_skus (
      spu_id,
      version,
      status,
      name,
      sort_order,
      facts,
      pricing_model,
      created_at,
      updated_at
    )
    values (
      v_spu_id,
      1,
      'ACTIVE',
      '专车',
      20,
      jsonb_build_object(
        'rideHailingProviderInstanceId', v_provider_instance_id::text,
        'providerVehicleTypeCode', '5'
      ),
      '{"type":"DYNAMIC_QUOTE","calculatorSpec":{"version":1,"currency":"CNY","components":[{"id":"caocao-provider-estimate","label":"曹操预估价","amount":{"type":"INPUT","path":"provider.estimateAmountFen"}}]}}'::jsonb,
      now(),
      now()
    )
    returning id into v_premier_sku_id;
  else
    update product_skus
       set version = 1,
           status = 'ACTIVE',
           sort_order = 20,
           facts = jsonb_build_object(
             'rideHailingProviderInstanceId', v_provider_instance_id::text,
             'providerVehicleTypeCode', '5'
           ),
           pricing_model = '{"type":"DYNAMIC_QUOTE","calculatorSpec":{"version":1,"currency":"CNY","components":[{"id":"caocao-provider-estimate","label":"曹操预估价","amount":{"type":"INPUT","path":"provider.estimateAmountFen"}}]}}'::jsonb,
           cancellation_policy_ref = null,
           updated_at = now()
     where id = v_premier_sku_id;
  end if;
end $$;
