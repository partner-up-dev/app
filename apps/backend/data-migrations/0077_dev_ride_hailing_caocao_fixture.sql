-- Stable development-only RideHailing fixture for local ordering-page work.
-- migration: environments=development
--
-- Keep this file limited to long-lived dev baseline data: fake provider
-- instance, catalog rows, offer, and placement. Do not add per-run PRs,
-- orders, real provider credentials, or scenario-test fixtures here.

do $$
declare
  fake_caocao_endpoint constant text := 'https://caocao.partner-up.local';
  backend_callback_base_url constant text := 'https://api.partner-up.localhost';
  old_task_private_pr_type constant text := 'ride-hailing-mvp-dev';
  placement_pr_type constant text := 'RIDE_HAILING';
  provider_instance_key constant text := 'dev-ride-hailing-mvp-caocao';

  v_provider_instance_id uuid;
  v_spu_id bigint;
  v_express_sku_id bigint;
  v_premier_sku_id bigint;
  v_offer_id bigint;
  v_placement_id bigint;
  v_matching_rule jsonb;
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
        'caocaoClientId', 'fake-caocao-client',
        'signKey', 'fake-caocao-sign-key',
        'endpointBaseUrl', fake_caocao_endpoint,
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
             'caocaoClientId', 'fake-caocao-client',
             'signKey', 'fake-caocao-sign-key',
             'endpointBaseUrl', fake_caocao_endpoint,
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
      '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"EXACTLY_ONE"}}'::jsonb,
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
           sales_policy = '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"EXACTLY_ONE"}}'::jsonb,
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
        'providerVehicleTypeCode', 'EXPRESS'
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
             'providerVehicleTypeCode', 'EXPRESS'
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
        'providerVehicleTypeCode', 'PREMIER'
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
             'providerVehicleTypeCode', 'PREMIER'
           ),
           pricing_model = '{"type":"DYNAMIC_QUOTE","calculatorSpec":{"version":1,"currency":"CNY","components":[{"id":"caocao-provider-estimate","label":"曹操预估价","amount":{"type":"INPUT","path":"provider.estimateAmountFen"}}]}}'::jsonb,
           cancellation_policy_ref = null,
           updated_at = now()
     where id = v_premier_sku_id;
  end if;

  select id
    into v_offer_id
    from offers
   where product_type = 'RIDE_HAILING'
     and spu_ids = array[v_spu_id]::bigint[]
   order by created_at desc
   limit 1;

  if v_offer_id is null then
    insert into offers (
      status,
      product_type,
      spu_ids,
      pricing_policy,
      terms_version,
      starts_at,
      ends_at,
      created_at,
      updated_at
    )
    values (
      'ACTIVE',
      'RIDE_HAILING',
      array[v_spu_id]::bigint[],
      '{"rules":[]}'::jsonb,
      1,
      null,
      null,
      now(),
      now()
    )
    returning id into v_offer_id;
  else
    update offers
       set status = 'ACTIVE',
           product_type = 'RIDE_HAILING',
           spu_ids = array[v_spu_id]::bigint[],
           pricing_policy = '{"rules":[]}'::jsonb,
           terms_version = 1,
           starts_at = null,
           ends_at = null,
           updated_at = now()
     where id = v_offer_id;
  end if;

  v_matching_rule := jsonb_build_object(
    'and',
    jsonb_build_array(
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'kind'), 'PR')),
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'type'), placement_pr_type)),
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'status'), 'READY')),
      jsonb_build_object('var', 'hasRoute'),
      jsonb_build_object('var', 'time.hasConcreteTime')
    )
  );

  select id
    into v_placement_id
    from placements
   where placements.offer_id = v_offer_id
     and placement_type = 'BUTTON'
     and (
       matching_rule::text like '%' || placement_pr_type || '%'
       or matching_rule::text like '%' || old_task_private_pr_type || '%'
       or creative ->> 'ctaLabel' = '叫曹操'
     )
   order by
     case
       when matching_rule::text like '%' || old_task_private_pr_type || '%' then 0
       when matching_rule::text like '%' || placement_pr_type || '%' then 1
       else 2
     end,
     created_at desc
   limit 1;

  if v_placement_id is null then
    insert into placements (
      status,
      placement_type,
      offer_id,
      matching_rule,
      priority,
      effective_from,
      effective_to,
      creative,
      binding_rules,
      created_at,
      updated_at
    )
    values (
      'ACTIVE',
      'BUTTON',
      v_offer_id,
      v_matching_rule,
      10000,
      now() - interval '1 minute',
      null,
      '{"ctaLabel":"叫曹操","description":"按当前路线预估网约车费用"}'::jsonb,
      '[{"fieldKey":"route","contextPath":"route","lock":true}]'::jsonb,
      now(),
      now()
    )
    returning id into v_placement_id;
  else
    update placements
       set status = 'ACTIVE',
           placement_type = 'BUTTON',
           offer_id = v_offer_id,
           matching_rule = v_matching_rule,
           priority = 10000,
           effective_from = now() - interval '1 minute',
           effective_to = null,
           creative = '{"ctaLabel":"叫曹操","description":"按当前路线预估网约车费用"}'::jsonb,
           binding_rules = '[{"fieldKey":"route","contextPath":"route","lock":true}]'::jsonb,
           updated_at = now()
     where id = v_placement_id;
  end if;

  update placements
     set status = 'ARCHIVED',
         updated_at = now()
   where id <> v_placement_id
     and offer_id = v_offer_id
     and placement_type = 'BUTTON'
     and matching_rule::text like '%' || old_task_private_pr_type || '%';
end $$;
