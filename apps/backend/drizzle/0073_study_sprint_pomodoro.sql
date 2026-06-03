create table "study_sprint_rooms" (
  "id" uuid primary key default gen_random_uuid(),
  "pr_id" bigint not null references "partner_requests"("id") on delete cascade,
  "status" text not null default 'OPEN',
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "study_sprint_rooms_pr_unique"
  on "study_sprint_rooms" ("pr_id");

create index "study_sprint_rooms_status_updated_at_idx"
  on "study_sprint_rooms" ("status", "updated_at");

create table "study_sprint_participant_sessions" (
  "id" uuid primary key default gen_random_uuid(),
  "room_id" uuid not null references "study_sprint_rooms"("id") on delete cascade,
  "pr_id" bigint not null references "partner_requests"("id") on delete cascade,
  "user_id" uuid not null references "users"("id") on delete cascade,
  "partner_id" bigint not null references "partners"("id") on delete cascade,
  "status" text not null default 'FOCUSING',
  "target_duration_minutes" integer not null,
  "credited_focus_seconds" integer not null default 0,
  "interruption_seconds" integer not null default 0,
  "started_at" timestamptz not null default now(),
  "completed_at" timestamptz,
  "left_at" timestamptz,
  "last_seen_at" timestamptz not null default now(),
  "created_at" timestamptz not null default now(),
  "updated_at" timestamptz not null default now()
);

create unique index "study_sprint_participant_sessions_room_user_unique"
  on "study_sprint_participant_sessions" ("room_id", "user_id");

create index "study_sprint_participant_sessions_room_status_idx"
  on "study_sprint_participant_sessions" ("room_id", "status");

create index "study_sprint_participant_sessions_pr_user_idx"
  on "study_sprint_participant_sessions" ("pr_id", "user_id");

create table "study_sprint_session_events" (
  "id" uuid primary key default gen_random_uuid(),
  "session_id" uuid not null references "study_sprint_participant_sessions"("id") on delete cascade,
  "event_type" text not null,
  "occurred_at" timestamptz not null,
  "client_seq" integer not null,
  "payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default now()
);

create unique index "study_sprint_session_events_session_client_seq_unique"
  on "study_sprint_session_events" ("session_id", "client_seq");

create index "study_sprint_session_events_session_occurred_at_idx"
  on "study_sprint_session_events" ("session_id", "occurred_at");
