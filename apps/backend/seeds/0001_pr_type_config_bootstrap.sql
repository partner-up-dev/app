-- Local operator baseline for reset and manual validation.
--
-- Keep this file to configurable baseline records: PR-type pools, POIs,
-- rental catalog rows, and public support config. Do not add
-- PRs, orders, bills, message rows, or other per-run business state here.

do $$
declare
  v_food_feedback_template_id bigint;
  v_rental_spu_id bigint;
  v_rental_sku_id bigint;
begin
  select id
    into v_food_feedback_template_id
    from feedback_questionnaire_templates
   where key = 'food_tasting_post_event_feedback'
     and version = '1.0.0'
   order by id asc
   limit 1;

  insert into pois (
    name,
    full_address,
    status,
    gallery,
    gcj02,
    per_time_window_cap,
    availability_rules,
    created_at,
    updated_at
  )
  values
    (
      '广外南体育馆羽毛球场1号场',
      '广东省广州市番禺区广州大学城外环东路178号',
      'PUBLISHED',
      array[]::text[],
      array[23.069571, 113.396712]::double precision[],
      1,
      '[]'::jsonb,
      now(),
      now()
    ),
    (
      '广外南体育馆羽毛球场2号场',
      '广东省广州市番禺区广州大学城外环东路178号',
      'PUBLISHED',
      array[]::text[],
      array[23.069571, 113.396712]::double precision[],
      1,
      '[]'::jsonb,
      now(),
      now()
    ),
    (
      '广外南校羽毛球馆',
      '广东省广州市番禺区小谷围街道大学城外环东路178号',
      'PUBLISHED',
      array[
        'https://oss-app.partner-up.cn/pois/d17675d8-904c-47d0-a81a-8b3a6a411668.jpg',
        'https://oss-app.partner-up.cn/pois/13898b3b-47a4-4c55-a1b6-8a068b4ae53e.jpg'
      ],
      array[23.069571, 113.396712]::double precision[],
      1,
      '[]'::jsonb,
      now(),
      now()
    ),
    (
      '图书馆自习区A桌',
      '广东省广州市番禺区广州大学城外环东路178号',
      'PUBLISHED',
      array[]::text[],
      null,
      1,
      '[]'::jsonb,
      now(),
      now()
    ),
    (
      '图书馆自习区B',
      '广东省广州市番禺区广州大学城外环东路178号',
      'PUBLISHED',
      array[]::text[],
      null,
      1,
      '[]'::jsonb,
      now(),
      now()
    ),
    (
      '广外南一饭泰捣蛋',
      '广东省广州市番禺区广州大学城外环东路178号',
      'PUBLISHED',
      array[]::text[],
      null,
      10,
      '[]'::jsonb,
      now(),
      now()
    )
  on conflict (name) do update
  set
    full_address = excluded.full_address,
    status = excluded.status,
    gallery = excluded.gallery,
    gcj02 = excluded.gcj02,
    per_time_window_cap = excluded.per_time_window_cap,
    availability_rules = excluded.availability_rules,
    updated_at = excluded.updated_at;

  insert into pr_type_configs (
    title,
    type,
    description,
    location_pool,
    route_pool,
    time_pool_config,
    authoring_time_window_editor_default_mode,
    default_min_partners,
    default_max_partners,
    default_notes,
    default_confirmation_enabled,
    default_confirmation_start_offset_minutes,
    default_confirmation_end_offset_minutes,
    default_join_lock_offset_minutes,
    meeting_point,
    join_gate_config,
    participation_frequency_limit,
    feedback_questionnaire_template_id,
    location_meeting_points,
    cover_image,
    community_qr_code,
    authoring_creation_policy,
    full_capacity_expansion_policy,
    discovery_form_ratio,
    discovery_card_ratio,
    discovery_list_ratio,
    created_at,
    updated_at
  )
  values
    (
      '羽毛球',
      'BADMINTON',
      '就在校内，场地费用我们出，你只管玩得开心！',
      jsonb_build_array(
        '广外南体育馆羽毛球场1号场',
        '广外南体育馆羽毛球场2号场',
        '广外南校羽毛球馆'
      ),
      '[]'::jsonb,
      jsonb_build_object(
        'durationMinutes', 60,
        'earliestLeadMinutes', 4320,
        'startRules', jsonb_build_array(
          jsonb_build_object(
            'id', 'recurring-1',
            'kind', 'RECURRING',
            'weekdays', jsonb_build_array(1, 2, 3, 5),
            'timeOfDay', '17:00',
            'description', null
          ),
          jsonb_build_object(
            'id', 'recurring-2',
            'kind', 'RECURRING',
            'weekdays', jsonb_build_array(4, 6),
            'timeOfDay', '15:00',
            'description', null
          )
        )
      ),
      'FUZZY',
      2,
      4,
      null,
      true,
      120,
      30,
      30,
      null,
      '[]'::jsonb,
      null,
      null,
      '{}'::jsonb,
      null,
      null,
      'USER_AND_ADMIN',
      'DISABLED',
      50,
      50,
      0,
      now(),
      now()
    ),
    (
      '学习冲刺',
      'STUDY_SPRINT',
      '互相陪伴，独立学习',
      jsonb_build_array('图书馆自习区A桌', '图书馆自习区B'),
      '[]'::jsonb,
      jsonb_build_object(
        'durationMinutes', 60,
        'earliestLeadMinutes', 4320,
        'startRules', jsonb_build_array(
          jsonb_build_object(
            'id', 'recurring-1',
            'kind', 'RECURRING',
            'weekdays', jsonb_build_array(1, 2, 3, 5),
            'timeOfDay', '15:40',
            'description', '下课后继续学'
          )
        )
      ),
      'NORMAL',
      1,
      4,
      null,
      true,
      120,
      1,
      5,
      null,
      '[]'::jsonb,
      null,
      null,
      '{}'::jsonb,
      null,
      null,
      'USER_AND_ADMIN',
      'DISABLED',
      50,
      50,
      0,
      now(),
      now()
    ),
    (
      '泰捣蛋试吃会',
      'TAIDAODAN_FOOD_TRIAL',
      null,
      jsonb_build_array('广外南一饭泰捣蛋'),
      '[]'::jsonb,
      jsonb_build_object(
        'durationMinutes', 30,
        'earliestLeadMinutes', 3200,
        'startRules', jsonb_build_array(
          jsonb_build_object(
            'id', 'recurring-1',
            'kind', 'RECURRING',
            'weekdays', jsonb_build_array(1, 3, 5),
            'timeOfDay', '18:00',
            'description', null
          )
        )
      ),
      'NORMAL',
      1,
      10,
      '请按现场指引完成体验反馈。',
      true,
      120,
      30,
      30,
      null,
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'JOIN_NOTICE',
          'key', 'join-notice-food-trial',
          'title', '免费试吃',
          'body', '试吃是免费的。如果觉得好吃，请拍照发笔记到小红书；如果觉得不好吃，可以用纸条写下来告诉工作人员。',
          'version', '1',
          'source', 'PR_TYPE_CONFIG'
        )
      ),
      null,
      v_food_feedback_template_id,
      '{}'::jsonb,
      null,
      'https://mvp-ha.oss-cn-hangzhou.aliyuncs.com/support/2ced6f3b-b711-49fa-a298-c81f3918e19e.jpg',
      'ADMIN_ONLY',
      'DISABLED',
      50,
      50,
      0,
      now(),
      now()
    ),
    (
      '拼车搭子',
      'RIDE_HAILING',
      null,
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object(
          'id', 'route-1',
          'route', jsonb_build_array(
            jsonb_build_object(
              'name', '广东外语外贸大学(大学城校区)',
              'full_address', '广东省广州市番禺区广州大学城外环东路178号',
              'gcj02', jsonb_build_array(23.063968, 113.397681),
              'wgs84', null,
              'bd09', null
            ),
            jsonb_build_object(
              'name', '广州南站',
              'full_address', '广东省广州市番禺区南站北路',
              'gcj02', jsonb_build_array(22.988558, 113.269323),
              'wgs84', null,
              'bd09', null
            )
          )
        ),
        jsonb_build_object(
          'id', 'route-2',
          'route', jsonb_build_array(
            jsonb_build_object(
              'name', '北京街道',
              'full_address', '广东省广州市越秀区',
              'gcj02', jsonb_build_array(23.12908, 113.26436),
              'wgs84', null,
              'bd09', null
            ),
            jsonb_build_object(
              'name', '广州交易广场',
              'full_address', '广东省广州市越秀区北京街道东风中路268号',
              'gcj02', jsonb_build_array(23.131209, 113.262642),
              'wgs84', null,
              'bd09', null
            )
          )
        )
      ),
      jsonb_build_object(
        'durationMinutes', null,
        'earliestLeadMinutes', 10800,
        'startRules', '[]'::jsonb
      ),
      'ADVANCED',
      1,
      4,
      null,
      false,
      120,
      1,
      1,
      null,
      '[]'::jsonb,
      null,
      null,
      '{}'::jsonb,
      null,
      null,
      'USER_AND_ADMIN',
      'DISABLED',
      50,
      50,
      0,
      now(),
      now()
    )
  on conflict (type) do update
  set
    title = excluded.title,
    type = excluded.type,
    description = excluded.description,
    location_pool = excluded.location_pool,
    route_pool = excluded.route_pool,
    time_pool_config = excluded.time_pool_config,
    default_min_partners = excluded.default_min_partners,
    default_max_partners = excluded.default_max_partners,
    default_notes = excluded.default_notes,
    default_confirmation_enabled = excluded.default_confirmation_enabled,
    default_confirmation_start_offset_minutes = excluded.default_confirmation_start_offset_minutes,
    default_confirmation_end_offset_minutes = excluded.default_confirmation_end_offset_minutes,
    default_join_lock_offset_minutes = excluded.default_join_lock_offset_minutes,
    meeting_point = excluded.meeting_point,
    join_gate_config = excluded.join_gate_config,
    participation_frequency_limit = excluded.participation_frequency_limit,
    feedback_questionnaire_template_id = excluded.feedback_questionnaire_template_id,
    location_meeting_points = excluded.location_meeting_points,
    cover_image = excluded.cover_image,
    community_qr_code = excluded.community_qr_code,
    authoring_time_window_editor_default_mode = excluded.authoring_time_window_editor_default_mode,
    authoring_creation_policy = excluded.authoring_creation_policy,
    full_capacity_expansion_policy = excluded.full_capacity_expansion_policy,
    discovery_form_ratio = excluded.discovery_form_ratio,
    discovery_card_ratio = excluded.discovery_card_ratio,
    discovery_list_ratio = excluded.discovery_list_ratio,
    updated_at = excluded.updated_at;

  insert into pr_type_preference_tags (
    type,
    label,
    description,
    moderation_status,
    created_at,
    updated_at
  )
  select
    baseline.type,
    baseline.label,
    baseline.description,
    baseline.moderation_status,
    now(),
    now()
  from (
    values
      ('BADMINTON'::text, '节奏:新手友好'::text, ''::text, 'PUBLISHED'::text),
      ('BADMINTON'::text, '节奏:强度适中'::text, ''::text, 'PUBLISHED'::text),
      ('STUDY_SPRINT'::text, '学科:英语'::text, ''::text, 'PUBLISHED'::text),
      ('STUDY_SPRINT'::text, '学科:数学'::text, ''::text, 'PUBLISHED'::text),
      ('STUDY_SPRINT'::text, '状态:互相监督'::text, ''::text, 'PUBLISHED'::text)
  ) as baseline(type, label, description, moderation_status)
  where exists (
    select 1
      from pr_type_configs
     where pr_type_configs.type = baseline.type
  )
    and not exists (
      select 1
        from pr_type_preference_tags existing
       where existing.type = baseline.type
         and existing.label = baseline.label
    );

  insert into config (
    key,
    value
  )
  values
    (
      'home_page_wechat_qr_code',
      'https://oss-app.partner-up.cn/support/8f52443c-5546-4f1a-8f7d-035d929bde10.png'
    ),
    (
      'wechat_official_account_qr_code',
      'https://oss-app.partner-up.cn/support/qrcode_for_gh_2dce58a6fb41_258.jpg'
    ),
    (
      'wecom_service_qr_code',
      'https://oss-app.partner-up.cn/5264495b163398842ad04ee5ee42a3df.jpg'
    ),
    (
      'wecom_support_link_wechat_in',
      'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
    ),
    (
      'wecom_support_link_wechat_out',
      'https://work.weixin.qq.com/kfid/kfc64fa7b5ec8b01916'
    )
  on conflict (key) do update
  set value = excluded.value;

  select id
    into v_rental_spu_id
    from product_spus
   where product_type = 'RENTAL'
     and name = '广外南体育馆羽毛球场'
   order by created_at asc
   limit 1;

  if v_rental_spu_id is null then
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
      '广外南体育馆羽毛球场',
      'RENTAL',
      '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"EXACTLY_ONE"}}'::jsonb,
      '{"type":"RENTAL","bookingLeadTimeMinutes":1440,"requiresContactPhone":true,"requiresRealName":true,"requiresNationalId":false}'::jsonb,
      '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":[]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
    returning id into v_rental_spu_id;
  else
    update product_spus
       set version = 1,
           status = 'ACTIVE',
           sales_policy = '{"quantityPolicy":{"type":"FIXED","quantity":1},"skuSelectionPolicy":{"type":"EXACTLY_ONE"}}'::jsonb,
           service_policy = '{"type":"RENTAL","bookingLeadTimeMinutes":1440,"requiresContactPhone":true,"requiresRealName":true,"requiresNationalId":false}'::jsonb,
           presentation = '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":[]}'::jsonb,
           facts = '{}'::jsonb,
           updated_at = now()
     where id = v_rental_spu_id;
  end if;

  select id
    into v_rental_sku_id
    from product_skus
   where spu_id = v_rental_spu_id
     and name = '普通羽毛球场1小时'
   order by created_at asc
   limit 1;

  if v_rental_sku_id is null then
    insert into product_skus (
      spu_id,
      version,
      status,
      name,
      sort_order,
      presentation,
      facts,
      pricing_model,
      cancellation_policy_ref,
      created_at,
      updated_at
    )
    values (
      v_rental_spu_id,
      1,
      'ACTIVE',
      '普通羽毛球场1小时',
      10,
      '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":[]}'::jsonb,
      '{"type":"RENTAL","zoneCode":"NORMAL","participantCount":1,"durationMinutes":60}'::jsonb,
      '{"type":"FIXED_TOTAL","amountFen":1000}'::jsonb,
      '{"policyId":"sku-1-policy","policyVersion":1}'::jsonb,
      now(),
      now()
    )
    returning id into v_rental_sku_id;
  else
    update product_skus
       set version = 1,
           status = 'ACTIVE',
           sort_order = 10,
           presentation = '{"detailImageAssetIds":[],"heroImageAssetIds":[],"noticeBlocks":[],"parameterGroups":[],"sellingPoints":[]}'::jsonb,
           facts = '{"type":"RENTAL","zoneCode":"NORMAL","participantCount":1,"durationMinutes":60}'::jsonb,
           pricing_model = '{"type":"FIXED_TOTAL","amountFen":1000}'::jsonb,
           cancellation_policy_ref = '{"policyId":"sku-1-policy","policyVersion":1}'::jsonb,
           updated_at = now()
     where id = v_rental_sku_id;
  end if;

  insert into sku_cancellation_policies (
    policy_id,
    policy_version,
    sku_id,
    basis,
    operator_buffer_minutes,
    tiers,
    created_at
  )
  values (
    'sku-1-policy',
    1,
    v_rental_sku_id,
    'CUSTOMER_PAID_AMOUNT',
    30,
    jsonb_build_array(
      jsonb_build_object(
        'code', 'DEFAULT',
        'visibleLabel', '默认全额退款',
        'refundPercent', 100,
        'fromMinutesBeforeStart', 240,
        'untilMinutesBeforeStart', null,
        'requiresOperatorHandling', false
      )
    ),
    now()
  )
  on conflict (policy_id, policy_version) do update
  set
    sku_id = excluded.sku_id,
    basis = excluded.basis,
    operator_buffer_minutes = excluded.operator_buffer_minutes,
    tiers = excluded.tiers;

  perform setval(
    pg_get_serial_sequence('pois', 'id'),
    coalesce((select max(id) from pois), 1),
    true
  );
end
$$;
