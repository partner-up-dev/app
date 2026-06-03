create or replace function user_telemetry_v2_deterministic_uuid(input text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(input), 1, 8) || '-' ||
    substr(md5(input), 9, 4) || '-' ||
    '4' || substr(md5(input), 14, 3) || '-' ||
    '8' || substr(md5(input), 18, 3) || '-' ||
    substr(md5(input), 21, 12)
  )::uuid
$$;

insert into "user_telemetry_journeys" (
  "id",
  "started_at",
  "last_seen_at",
  "created_at",
  "updated_at"
)
select
  "id",
  "started_at",
  "last_seen_at",
  "created_at",
  "updated_at"
from "user_telemetry_journeys_v1"
on conflict ("id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  user_telemetry_v2_deterministic_uuid('journey.started:' || "id"::text),
  'journey.started',
  1,
  'journey.lifecycle',
  'context',
  "id",
  null,
  jsonb_strip_nulls(jsonb_build_object(
    'entry_kind', "entry_kind"
  )),
  jsonb_strip_nulls(jsonb_build_object(
    'start_route', "start_route",
    'start_route_name', "start_route_name",
    'start_referrer', "start_referrer",
    'start_spm', "start_spm",
    'start_source_qr', "start_source_qr",
    'start_event_id', "start_event_id",
    'start_pr_id', "start_pr_id",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "started_at",
  "created_at"
from "user_telemetry_journeys_v1"
on conflict ("event_id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  user_telemetry_v2_deterministic_uuid('auth.session.created:' || "id"::text),
  'auth.session.created',
  1,
  'auth.session',
  'context',
  "id",
  null,
  '{}'::jsonb,
  jsonb_strip_nulls(jsonb_build_object(
    'anonymous_id', "anonymous_id",
    'authenticated_user_hash', "user_id_hash",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "started_at",
  "created_at"
from "user_telemetry_journeys_v1"
where "anonymous_id" is not null
   or "user_id_hash" is not null
on conflict ("event_id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  user_telemetry_v2_deterministic_uuid('route.entered:' || "id"::text),
  'route.entered',
  1,
  'route.lifecycle',
  'context',
  "id",
  null,
  '{}'::jsonb,
  jsonb_strip_nulls(jsonb_build_object(
    'route_path', "start_route",
    'route_name', "start_route_name",
    'referrer', "start_referrer",
    'spm', "start_spm",
    'source_qr', "start_source_qr",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "started_at",
  "created_at"
from "user_telemetry_journeys_v1"
where "start_route" is not null
on conflict ("event_id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  user_telemetry_v2_deterministic_uuid('segment.started:' || "id"::text),
  'segment.started',
  1,
  'legacy.segment',
  'context',
  "app_journey_id",
  null,
  jsonb_strip_nulls(jsonb_build_object(
    'segment_kind', "segment_kind",
    'rendered_mode', "rendered_mode",
    'assigned_mode', "assigned_mode"
  )),
  jsonb_strip_nulls(jsonb_build_object(
    'segment_id', "id",
    'event_id', "event_id",
    'pr_id', "pr_id",
    'assignment_revision', "assignment_revision",
    'segment_start_route', "segment_start_route",
    'segment_start_spm', "segment_start_spm",
    'segment_start_source_qr', "segment_start_source_qr",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "started_at",
  "created_at"
from "user_telemetry_segments_v1"
on conflict ("event_id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  user_telemetry_v2_deterministic_uuid('segment.ended:' || "id"::text),
  'segment.ended',
  1,
  'legacy.segment',
  'context',
  "app_journey_id",
  null,
  jsonb_strip_nulls(jsonb_build_object(
    'segment_kind', "segment_kind",
    'rendered_mode', "rendered_mode",
    'assigned_mode', "assigned_mode"
  )),
  jsonb_strip_nulls(jsonb_build_object(
    'segment_id', "id",
    'event_id', "event_id",
    'pr_id', "pr_id",
    'assignment_revision', "assignment_revision",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "ended_at",
  "updated_at"
from "user_telemetry_segments_v1"
where "ended_at" is not null
on conflict ("event_id") do nothing;

insert into "user_telemetry_events" (
  "event_id",
  "event_name",
  "event_version",
  "event_family",
  "event_kind",
  "journey_id",
  "trace_id",
  "attributes",
  "payload",
  "occurred_at",
  "received_at"
)
select
  "id",
  "event_name",
  1,
  case
    when "event_name" = 'page.viewed' then 'page.viewed'
    when "event_name" = 'anchor_event.landing.viewed' then 'anchor_event.landing'
    when "event_name" like 'pr.create.%' then 'pr.create_result'
    when "event_name" = 'pr.created' then 'pr.created'
    when "event_name" like 'pr.join.%' then 'pr.join_result'
    when "event_name" = 'pr.joined' then 'pr.joined'
    when "event_name" like 'pr.waitlist.%' then 'pr.waitlist_result'
    when "event_name" = 'pr.waitlisted' then 'pr.waitlisted'
    when "event_name" = 'pr.closed' then 'pr.closed'
    when "event_name" like 'pr.exit.%' then 'pr.exit_result'
    when "event_name" like 'pr.confirm.%' then 'pr.confirm_result'
    when "event_name" like 'pr.checkin.%' then 'pr.checkin'
    when "event_name" like 'pr.commitment.%' then 'pr.commitment_result'
    when "event_name" like 'pr.entry.%' then 'pr.entry'
    when "event_name" like 'pr.primary_cta.%' then 'pr.primary_cta'
    when "event_name" like 'pr.lane.%' then 'pr.lane'
    when "event_name" like 'pr.recovery.%' then 'pr.recovery'
    when "event_name" like 'pr.secondary_action.%' then 'pr.secondary_action'
    when "event_name" like 'anchor_event.recommendation.%' then 'anchor_event.recommendation'
    when "event_name" = 'anchor_event.candidate.engaged' then 'anchor_event.candidate_engagement'
    when "event_name" like 'anchor_event.assisted_create.%' then 'anchor_event.assisted_create'
    when "event_name" like 'anchor_event.card_stack.%' then 'anchor_event.card_stack'
    when "event_name" like 'anchor_event.card.%' then 'anchor_event.card'
    when "event_name" = 'anchor_event.card_empty_create.started' then 'anchor_event.assisted_create'
    when "event_name" like 'anchor_event.list.%' then 'anchor_event.list'
    when "event_name" = 'anchor_event.date.selected' then 'anchor_event.list'
    when "event_name" like 'anchor_event.pr_row.%' then 'anchor_event.pr_row'
    when "event_name" = 'anchor_event.list_create.started' then 'anchor_event.assisted_create'
    when "event_name" like 'anchor_event.form_result.%' then 'anchor_event.form_result'
    when "event_name" = 'anchor_event.form.create_fallback_clicked' then 'anchor_event.assisted_create'
    when "event_name" like 'anchor_event.form.%' then 'anchor_event.form'
    when "event_name" like 'share.method.%' then 'share.method'
    when "event_name" like 'share.link.%' then 'share.link'
    when "event_name" like 'share.session.%' then 'share.session'
    when "event_name" like 'share.descriptor.%' then 'share.descriptor'
    when "event_name" like 'share.apply.%' then 'share.apply'
    when "event_name" like 'share.replay.%' then 'share.replay'
    when "event_name" like 'home.hero.%' then 'home.navigation'
    when "event_name" like 'home.event.%' then 'home.event_discovery'
    when "event_name" like 'home.create.%' then 'home.create_entry'
    when "event_name" like 'official.account.follow.nudge.%' then 'official_account_follow.nudge'
    when "event_name" like 'wechat.oauth.%' then 'wechat.oauth'
    else "event_name"
  end,
  case
    when "event_name" in (
      'anchor_event.recommendation.returned',
      'pr.created',
      'pr.joined',
      'pr.waitlisted',
      'pr.closed'
    )
      then 'command_result'
    when "event_name" in (
      'page.viewed',
      'anchor_event.landing.viewed',
      'anchor_event.card_stack.loaded',
      'anchor_event.card.seen',
      'anchor_event.list.loaded',
      'anchor_event.pr_row.seen',
      'anchor_event.form.impression',
      'anchor_event.form.recommendation_impression',
      'home.event.section.impression',
      'home.event.card.impression',
      'official.account.follow.nudge.shown',
      'share.session.started',
      'share.descriptor.discarded.stale',
      'wechat.oauth.trace'
    )
      then 'observation'
    when "event_name" like '%.result'
      or "event_name" like '%.success'
      or "event_name" like '%.succeeded'
      or "event_name" like '%.failed'
      then 'command_result'
    when "event_name" like '%.viewed'
      or "event_name" like '%.seen'
      or "event_name" like '%.impression'
      or "event_name" like '%.loaded'
      then 'observation'
    else 'intent'
  end,
  "app_journey_id",
  "trace_id",
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_event_kind', "event_kind",
    'route_name', "route_name",
    'start_spm', "start_spm",
    'current_spm', "current_spm",
    'source_qr', "source_qr"
  )),
  coalesce("properties", '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'event_id_ref', "event_id_ref",
    'pr_id_ref', "pr_id_ref",
    'legacy_segment_id', "segment_id",
    'card_key', "card_key",
    'segment_key', "segment_key",
    'route_path', "route_path",
    'referrer', "referrer",
    'migration_source', 'legacy_user_telemetry_v1'
  )),
  "occurred_at",
  "received_at"
from "user_telemetry_events_v1"
on conflict ("event_id") do nothing;

drop function user_telemetry_v2_deterministic_uuid(text);
