update "partner_requests"
set "join_gate_config" = coalesce(
  (
    select jsonb_agg(gate.item order by gate.ordinality)
    from jsonb_array_elements("partner_requests"."join_gate_config")
      with ordinality as gate(item, ordinality)
    where gate.item ->> 'kind' <> 'BOOKING_CONTACT'
  ),
  '[]'::jsonb
)
where "join_gate_config" @> '[{"kind":"BOOKING_CONTACT"}]'::jsonb;

update "anchor_events"
set "join_gate_config" = coalesce(
  (
    select jsonb_agg(gate.item order by gate.ordinality)
    from jsonb_array_elements("anchor_events"."join_gate_config")
      with ordinality as gate(item, ordinality)
    where gate.item ->> 'kind' <> 'BOOKING_CONTACT'
  ),
  '[]'::jsonb
)
where "join_gate_config" @> '[{"kind":"BOOKING_CONTACT"}]'::jsonb;

delete from "notification_deliveries"
where "notification_kind" = 'BOOKING_RESULT';

delete from "notification_opportunities"
where "notification_kind" = 'BOOKING_RESULT';

delete from "notification_waves"
where "notification_kind" = 'BOOKING_RESULT';

delete from "jobs"
where "job_type" = 'wechat.notification.booking-result';

delete from "config"
where "key" in (
  'wechat.submsg_booking_result_template_id',
  'wecom_staff_link'
);
