alter table if exists "anchor_partner_requests"
  drop column if exists "booking_triggered_at";

alter table if exists "partners"
  drop column if exists "reimbursement_requested",
  drop column if exists "reimbursement_status",
  drop column if exists "reimbursement_amount",
  drop column if exists "reimbursement_requested_at",
  drop column if exists "reimbursement_reviewed_at",
  drop column if exists "reimbursement_paid_at";

alter table if exists "user_notification_opts"
  drop column if exists "wechat_booking_result_opt_in",
  drop column if exists "wechat_booking_result_opt_in_at",
  drop column if exists "wechat_booking_result_remaining_count";

drop table if exists "pr_booking_executions";
drop table if exists "pr_support_resources";
drop table if exists "anchor_event_support_resources";
