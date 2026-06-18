-- Temporary dev-only PR seed for the RideHailing ordering page.
--
-- Purpose:
-- - create a fresh READY route PR to enter /order/new from a PR Page Button
--   Placement
-- - keep per-run manual UI test data out of ledgered data migrations
--
-- Expected local setup:
-- 1. Start fake Caocao through portless:
--      pnpm dev:portless:fake-caocao
-- 2. Start the app stack:
--      pnpm dev:ensure
-- 3. Apply the stable development DB fixture:
--      pnpm db:migrate:dev
-- 4. Run this file against the dev DB.
-- 5. Open the PR URL printed by the final SELECT, then click the Placement CTA.
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
  suggested_pr_path text
) on commit drop;

truncate table ride_hailing_mvp_seed_result;

do $$
declare
  default_viewer_user_id constant uuid := '00000000-0000-4000-8000-000000000231';
  mock_open_id constant text := 'dev-mock-openid';
  provider_instance_key constant text := 'dev-ride-hailing-mvp-caocao';
  pr_type constant text := 'RIDE_HAILING';

  v_viewer_user_id uuid;
  v_provider_instance_id uuid;
  v_offer_id bigint;
  v_placement_id bigint;
  v_pr_id bigint;
begin
  select id
    into v_provider_instance_id
    from ride_hailing_provider_instances
   where provider_type = 'CAOCAO'
     and instance_key = provider_instance_key
     and status = 'ACTIVE'
   order by created_at asc
   limit 1;

  if v_provider_instance_id is null then
    raise exception
      'RideHailing dev provider fixture not found. Run pnpm db:migrate:dev first.';
  end if;

  select offers.id
    into v_offer_id
    from offers
   where offers.product_type = 'RIDE_HAILING'
     and offers.status = 'ACTIVE'
     and exists (
       select 1
         from product_spus
        where product_spus.id = any(offers.spu_ids)
          and product_spus.product_type = 'RIDE_HAILING'
          and product_spus.name = '系统曹操出行'
          and product_spus.status = 'ACTIVE'
     )
   order by offers.created_at desc
   limit 1;

  if v_offer_id is null then
    raise exception
      'RideHailing dev offer fixture not found. Run pnpm db:migrate:dev first.';
  end if;

  select placements.id
    into v_placement_id
    from placements
   where placements.offer_id = v_offer_id
     and placements.status = 'ACTIVE'
     and placements.placement_type = 'BUTTON'
     and placements.matching_rule::text like '%' || pr_type || '%'
   order by placements.priority desc, placements.created_at desc
   limit 1;

  if v_placement_id is null then
    raise exception
      'RideHailing dev placement fixture not found. Run pnpm db:migrate:dev first.';
  end if;

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
    suggested_pr_path
  )
  values (
    v_pr_id,
    v_viewer_user_id,
    v_offer_id,
    v_placement_id,
    v_provider_instance_id,
    '/pr/' || v_pr_id::text
  );
end $$;

select *
from ride_hailing_mvp_seed_result;

commit;
