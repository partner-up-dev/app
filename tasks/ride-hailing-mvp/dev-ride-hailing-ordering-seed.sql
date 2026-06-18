-- Temporary dev-only data seed for the RideHailing ordering page.
--
-- Purpose:
-- - create enough dev DB data to enter /order/new from a PR Page Button Placement
-- - keep the data tactical and outside formal migrations/seeds
--
-- Expected local setup:
-- 1. Start fake Caocao through portless on the default endpoint used below:
--      pnpm dev:portless:fake-caocao
-- 2. Start the app stack:
--      pnpm dev:ensure
-- 3. Run this file against the dev DB.
-- 4. Open the PR URL printed by the final SELECT, then click the Placement CTA.
--
-- If your fake Caocao or backend callback base URL is different, edit the
-- constants at the top of the DO block before running.
--
-- Auth note:
-- - The seeded user is bound to the default local WeChat mock openid
--   "dev-mock-openid". In the normal dev env, mock OAuth can authenticate as
--   this user.
-- - If you bypass mock OAuth, generate a token for the printed viewer_user_id
--   with backend code and place it in localStorage:
--      partner_up_user_id
--      partner_up_access_token
--      partner_up_session_role=authenticated

begin;

create temporary table if not exists ride_hailing_mvp_seed_result (
  pr_id bigint,
  viewer_user_id uuid,
  offer_id bigint,
  placement_id bigint,
  provider_instance_id uuid,
  fake_caocao_endpoint text,
  backend_callback_base_url text,
  suggested_pr_path text
) on commit drop;

truncate table ride_hailing_mvp_seed_result;

do $$
declare
  default_viewer_user_id constant uuid := '00000000-0000-4000-8000-000000000231';
  mock_open_id constant text := 'dev-mock-openid';
  fake_caocao_endpoint constant text := 'https://fake-caocao.localhost';
  backend_callback_base_url constant text := 'https://api.partner-up.localhost';
  provider_instance_key constant text := 'dev-ride-hailing-mvp-caocao';
  pr_type constant text := 'RIDE_HAILING';

  v_viewer_user_id uuid;
  v_provider_instance_id uuid;
  v_spu_id bigint;
  v_express_sku_id bigint;
  v_premier_sku_id bigint;
  v_offer_id bigint;
  v_placement_id bigint;
  v_pr_id bigint;
begin
  select id
    into v_viewer_user_id
    from users
   where open_id = mock_open_id
     and status = 'ACTIVE'
   order by created_at desc
   limit 1;

  if v_viewer_user_id is null then
    v_viewer_user_id := default_viewer_user_id;

    insert into users (
      id,
      open_id,
      role,
      nickname,
      phone_number,
      status,
      created_at,
      updated_at
    )
    values (
      v_viewer_user_id,
      mock_open_id,
      array['authenticated']::text[],
      'RideHailing MVP Demo',
      '13800138000',
      'ACTIVE',
      now(),
      now()
    )
    on conflict (id) do update
      set open_id = excluded.open_id,
          role = array['authenticated']::text[],
          nickname = excluded.nickname,
          phone_number = excluded.phone_number,
          status = excluded.status,
          updated_at = now();
  else
    update users
       set role = (
             select array_agg(distinct role_value)
               from unnest(users.role || array['authenticated']::text[]) as role_value
              where role_value <> 'anonymous'
           ),
           nickname = coalesce(users.nickname, 'RideHailing MVP Demo'),
           phone_number = coalesce(users.phone_number, '13800138000'),
           status = 'ACTIVE',
           updated_at = now()
     where id = v_viewer_user_id;
  end if;

  insert into user_reliability (user_id)
  values (v_viewer_user_id)
  on conflict (user_id) do nothing;

  insert into user_notification_opts (user_id)
  values (v_viewer_user_id)
  on conflict (user_id) do nothing;

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

  select id
    into v_placement_id
    from placements
   where placements.offer_id = v_offer_id
     and placement_type = 'BUTTON'
     and matching_rule::text like '%' || pr_type || '%'
   order by created_at desc
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
      jsonb_build_object(
        'and',
        jsonb_build_array(
          jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'kind'), 'PR')),
          jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'type'), pr_type)),
          jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'status'), 'READY')),
          jsonb_build_object('var', 'hasRoute'),
          jsonb_build_object('var', 'time.hasConcreteTime')
        )
      ),
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
           matching_rule = jsonb_build_object(
             'and',
             jsonb_build_array(
               jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'kind'), 'PR')),
               jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'type'), pr_type)),
               jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'status'), 'READY')),
               jsonb_build_object('var', 'hasRoute'),
               jsonb_build_object('var', 'time.hasConcreteTime')
             )
           ),
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
     and matching_rule::text like '%' || pr_type || '%';

  insert into partner_requests (
    title,
    type,
    time_window,
    location,
    route,
    status,
    visibility_status,
    confirmation_enabled,
    confirmation_start_offset_minutes,
    confirmation_end_offset_minutes,
    join_lock_offset_minutes,
    min_partners,
    max_partners,
    budget,
    created_at,
    preferences,
    notes,
    meeting_point,
    allow_edit_after_ready,
    join_gate_config,
    orders,
    created_by
  )
  values (
    'Dev RideHailing MVP PR ' || to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS'),
    pr_type,
    array['2031-04-01T02:00:00.000Z','2031-04-01T03:00:00.000Z']::text[],
    null,
    '[
      {
        "bd09": null,
        "full_address": "杭州市上城区全福桥路2号",
        "gcj02": [30.2912, 120.212],
        "name": "杭州东站",
        "wgs84": null
      },
      {
        "bd09": null,
        "full_address": "杭州市西湖区灵隐路1号",
        "gcj02": [30.24, 120.102],
        "name": "灵隐寺",
        "wgs84": null
      }
    ]'::jsonb,
    'READY',
    'VISIBLE',
    false,
    null,
    null,
    null,
    1,
    null,
    null,
    now(),
    array['安静','准时']::text[],
    'RideHailing MVP dev seed. This PR is safe to delete after manual UI testing.',
    null,
    null,
    '[]'::jsonb,
    array[]::uuid[],
    v_viewer_user_id
  )
  returning id into v_pr_id;

  insert into partners (
    pr_id,
    status,
    user_id,
    payment_status,
    created_at
  )
  values (
    v_pr_id,
    'JOINED',
    v_viewer_user_id,
    'NONE',
    now()
  );

  insert into ride_hailing_mvp_seed_result (
    pr_id,
    viewer_user_id,
    offer_id,
    placement_id,
    provider_instance_id,
    fake_caocao_endpoint,
    backend_callback_base_url,
    suggested_pr_path
  )
  values (
    v_pr_id,
    v_viewer_user_id,
    v_offer_id,
    v_placement_id,
    v_provider_instance_id,
    fake_caocao_endpoint,
    backend_callback_base_url,
    '/pr/' || v_pr_id::text
  );
end $$;

select *
from ride_hailing_mvp_seed_result;

commit;
