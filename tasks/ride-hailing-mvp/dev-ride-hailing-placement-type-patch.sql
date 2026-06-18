-- Temporary dev-only patch for a previously applied RideHailing ordering seed.
--
-- Use this only when dev-ride-hailing-ordering-seed.sql was already applied
-- with the task-private PR type "ride-hailing-mvp-dev".
--
-- Effect:
-- - changes the seeded Caocao Button Placement rule to match real ride-hailing
--   PRs with type = "RIDE_HAILING"
-- - updates old seed-created dev PR rows to type = "RIDE_HAILING" so the
--   previously printed /pr/:id URL keeps working
-- - leaves provider / catalog / SKU / order rows in place

begin;

create temporary table if not exists ride_hailing_mvp_placement_type_patch_result (
  offer_id bigint,
  placement_id bigint,
  patched_seed_pr_count integer,
  matching_type text,
  matching_rule jsonb
) on commit drop;

truncate table ride_hailing_mvp_placement_type_patch_result;

do $$
declare
  old_pr_type constant text := 'ride-hailing-mvp-dev';
  ride_hailing_pr_type constant text := 'RIDE_HAILING';

  v_offer_id bigint;
  v_placement_id bigint;
  v_patched_seed_pr_count integer := 0;
  v_matching_rule jsonb;
begin
  select offers.id
    into v_offer_id
    from offers
   where offers.product_type = 'RIDE_HAILING'
     and exists (
       select 1
         from product_spus
        where product_spus.id = any(offers.spu_ids)
          and product_spus.product_type = 'RIDE_HAILING'
          and product_spus.name = '系统曹操出行'
     )
   order by offers.created_at asc
   limit 1;

  if v_offer_id is null then
    raise exception
      'RideHailing Caocao offer not found. Apply dev-ride-hailing-ordering-seed.sql first.';
  end if;

  v_matching_rule := jsonb_build_object(
    'and',
    jsonb_build_array(
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'kind'), 'PR')),
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'type'), ride_hailing_pr_type)),
      jsonb_build_object('===', jsonb_build_array(jsonb_build_object('var', 'status'), 'READY')),
      jsonb_build_object('var', 'hasRoute'),
      jsonb_build_object('var', 'time.hasConcreteTime')
    )
  );

  select placements.id
    into v_placement_id
    from placements
   where placements.offer_id = v_offer_id
     and placements.placement_type = 'BUTTON'
     and (
       placements.matching_rule::text like '%' || old_pr_type || '%'
       or placements.matching_rule::text like '%' || ride_hailing_pr_type || '%'
       or placements.creative ->> 'ctaLabel' = '叫曹操'
     )
   order by
     case
       when placements.matching_rule::text like '%' || old_pr_type || '%' then 0
       when placements.matching_rule::text like '%' || ride_hailing_pr_type || '%' then 1
       else 2
     end,
     placements.created_at desc
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
     and matching_rule::text like '%' || old_pr_type || '%';

  update partner_requests
     set type = ride_hailing_pr_type
   where type = old_pr_type
     and (
       title like 'Dev RideHailing MVP PR %'
       or notes = 'RideHailing MVP dev seed. This PR is safe to delete after manual UI testing.'
     );
  get diagnostics v_patched_seed_pr_count = row_count;

  insert into ride_hailing_mvp_placement_type_patch_result (
    offer_id,
    placement_id,
    patched_seed_pr_count,
    matching_type,
    matching_rule
  )
  values (
    v_offer_id,
    v_placement_id,
    v_patched_seed_pr_count,
    ride_hailing_pr_type,
    v_matching_rule
  );
end $$;

select *
from ride_hailing_mvp_placement_type_patch_result;

commit;
