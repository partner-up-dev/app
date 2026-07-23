alter table "pr_messages"
  add column if not exists "deleted_at" timestamp;
