alter table "user_notification_opts"
  add column "wechat_pr_ready_opt_in" boolean default false not null,
  add column "wechat_pr_ready_opt_in_at" timestamp,
  add column "wechat_pr_ready_remaining_count" integer default 0 not null;
