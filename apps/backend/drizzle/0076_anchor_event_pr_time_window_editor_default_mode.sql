alter table "anchor_events"
  add column if not exists "pr_time_window_editor_default_mode" text not null default 'NORMAL';

alter table "anchor_events"
  drop constraint if exists "anchor_events_pr_time_window_editor_default_mode_chk";

alter table "anchor_events"
  add constraint "anchor_events_pr_time_window_editor_default_mode_chk" check (
    "pr_time_window_editor_default_mode" in ('NORMAL', 'FUZZY', 'ADVANCED')
  );
