create or replace view "fact_pr_join_funnel_event" as
select
  e.event_id,
  e.event_name,
  e.event_version,
  e.journey_id,
  e.trace_id,
  e.occurred_at,
  route_context.route_path,
  route_context.route_name,
  route_context.spm,
  route_context.source_qr,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  case
    when route_context.context_event_id is null then 'context_unknown'
    else 'context_complete'
  end as route_context_status,
  case
    when auth_context.context_event_id is null then 'context_unknown'
    else 'context_complete'
  end as auth_context_status,
  case
    when e.event_name = 'pr.primary_cta.impression'
      and coalesce(e.payload ->> 'ctaType', e.payload ->> 'cta_type') = 'JOIN'
      then 'join_cta_impression'
    when e.event_name = 'pr.primary_cta.click'
      and coalesce(e.payload ->> 'ctaType', e.payload ->> 'cta_type') = 'JOIN'
      then 'join_cta_click'
    when e.event_name = 'pr.join.result'
      and coalesce(e.payload ->> 'actionResult', e.payload ->> 'action_result') = 'success'
      then 'frontend_join_success'
    when e.event_name = 'pr.joined'
      then 'backend_joined'
    else null
  end as step_key
from "user_telemetry_events" e
left join lateral (
  select
    r.event_id as context_event_id,
    nullif(coalesce(r.payload ->> 'routePath', r.payload ->> 'route_path'), '') as route_path,
    nullif(
      coalesce(
        r.attributes ->> 'route_name',
        r.payload ->> 'routeName',
        r.payload ->> 'route_name'
      ),
      ''
    ) as route_name,
    nullif(coalesce(r.attributes ->> 'spm', r.payload ->> 'spm'), '') as spm,
    nullif(
      coalesce(
        r.attributes ->> 'source_qr',
        r.payload ->> 'sourceQr',
        r.payload ->> 'source_qr'
      ),
      ''
    ) as source_qr
  from "user_telemetry_events" r
  where r.journey_id = e.journey_id
    and r.event_name = 'route.entered'
    and r.occurred_at <= e.occurred_at
  order by r.occurred_at desc, r.event_id desc
  limit 1
) route_context on true
left join lateral (
  select
    a.event_id as context_event_id,
    nullif(coalesce(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') as anonymous_id,
    nullif(
      coalesce(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) as authenticated_user_hash
  from "user_telemetry_events" a
  where a.journey_id = e.journey_id
    and a.event_name = 'auth.session.created'
    and a.occurred_at <= e.occurred_at
  order by a.occurred_at desc, a.event_id desc
  limit 1
) auth_context on true
where e.event_version = 1
  and e.event_name in (
    'pr.primary_cta.impression',
    'pr.primary_cta.click',
    'pr.join.result',
    'pr.joined'
  );

create or replace view "fact_pr_create_funnel_event" as
select
  e.event_id,
  e.event_name,
  e.event_version,
  e.journey_id,
  e.trace_id,
  e.occurred_at,
  route_context.route_path,
  route_context.route_name,
  route_context.spm,
  route_context.source_qr,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  case
    when route_context.context_event_id is null then 'context_unknown'
    else 'context_complete'
  end as route_context_status,
  case
    when auth_context.context_event_id is null then 'context_unknown'
    else 'context_complete'
  end as auth_context_status,
  case
    when e.event_name in (
      'home.create.entry.click',
      'anchor_event.assisted_create.started',
      'anchor_event.card_empty_create.started',
      'anchor_event.list_create.started',
      'anchor_event.form.create_fallback_clicked'
    )
      then 'create_entry_intent'
    when e.event_name in (
      'pr.create.result',
      'anchor_event.assisted_create.result'
    )
      and coalesce(e.payload ->> 'actionResult', e.payload ->> 'action_result') = 'success'
      then 'frontend_create_success'
    when e.event_name = 'pr.created'
      then 'backend_created'
    else null
  end as step_key,
  case
    when e.event_name <> 'pr.created' then null
    when coalesce(e.payload ->> 'creation_path', e.payload ->> 'creationPath') in (
      'form',
      'event_assisted',
      'natural_language'
    )
      then coalesce(e.payload ->> 'creation_path', e.payload ->> 'creationPath')
    else 'unknown'
  end as creation_path
from "user_telemetry_events" e
left join lateral (
  select
    r.event_id as context_event_id,
    nullif(coalesce(r.payload ->> 'routePath', r.payload ->> 'route_path'), '') as route_path,
    nullif(
      coalesce(
        r.attributes ->> 'route_name',
        r.payload ->> 'routeName',
        r.payload ->> 'route_name'
      ),
      ''
    ) as route_name,
    nullif(coalesce(r.attributes ->> 'spm', r.payload ->> 'spm'), '') as spm,
    nullif(
      coalesce(
        r.attributes ->> 'source_qr',
        r.payload ->> 'sourceQr',
        r.payload ->> 'source_qr'
      ),
      ''
    ) as source_qr
  from "user_telemetry_events" r
  where r.journey_id = e.journey_id
    and r.event_name = 'route.entered'
    and r.occurred_at <= e.occurred_at
  order by r.occurred_at desc, r.event_id desc
  limit 1
) route_context on true
left join lateral (
  select
    a.event_id as context_event_id,
    nullif(coalesce(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') as anonymous_id,
    nullif(
      coalesce(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) as authenticated_user_hash
  from "user_telemetry_events" a
  where a.journey_id = e.journey_id
    and a.event_name = 'auth.session.created'
    and a.occurred_at <= e.occurred_at
  order by a.occurred_at desc, a.event_id desc
  limit 1
) auth_context on true
where e.event_version = 1
  and e.event_name in (
    'home.create.entry.click',
    'anchor_event.assisted_create.started',
    'anchor_event.card_empty_create.started',
    'anchor_event.list_create.started',
    'anchor_event.form.create_fallback_clicked',
    'pr.create.result',
    'anchor_event.assisted_create.result',
    'pr.created'
  );

create or replace view "fact_user_retention_activity_event" as
select
  e.event_id,
  e.event_name,
  e.journey_id,
  e.occurred_at,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  coalesce(
    auth_context.authenticated_user_hash,
    case
      when auth_context.anonymous_id is not null
        then 'anonymous:' || auth_context.anonymous_id
      else null
    end
  ) as identity_key
from "user_telemetry_events" e
left join lateral (
  select
    nullif(coalesce(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') as anonymous_id,
    nullif(
      coalesce(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) as authenticated_user_hash
  from "user_telemetry_events" a
  where a.journey_id = e.journey_id
    and a.event_name = 'auth.session.created'
    and a.occurred_at <= e.occurred_at
  order by a.occurred_at desc, a.event_id desc
  limit 1
) auth_context on true
where e.event_version = 1
  and e.event_name not in ('segment.started', 'segment.ended');

create or replace view "fact_anchor_event_transition_event" as
select
  e.event_id,
  e.journey_id,
  e.occurred_at,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  coalesce(
    auth_context.authenticated_user_hash,
    case
      when auth_context.anonymous_id is not null
        then 'anonymous:' || auth_context.anonymous_id
      else null
    end
  ) as identity_key,
  coalesce(
    nullif(coalesce(e.payload ->> 'activityType', e.payload ->> 'activity_type'), ''),
    'unknown'
  ) as activity_type
from "user_telemetry_events" e
left join lateral (
  select
    nullif(coalesce(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') as anonymous_id,
    nullif(
      coalesce(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) as authenticated_user_hash
  from "user_telemetry_events" a
  where a.journey_id = e.journey_id
    and a.event_name = 'auth.session.created'
    and a.occurred_at <= e.occurred_at
  order by a.occurred_at desc, a.event_id desc
  limit 1
) auth_context on true
where e.event_version = 1
  and e.event_name = 'anchor_event.landing.viewed';

create or replace view "fact_view_other_anchor_events_conversion_event" as
select
  e.event_id,
  e.event_name,
  e.journey_id,
  e.occurred_at,
  auth_context.anonymous_id,
  auth_context.authenticated_user_hash,
  coalesce(
    auth_context.authenticated_user_hash,
    case
      when auth_context.anonymous_id is not null
        then 'anonymous:' || auth_context.anonymous_id
      else null
    end
  ) as identity_key
from "user_telemetry_events" e
left join lateral (
  select
    nullif(coalesce(a.payload ->> 'anonymous_id', a.payload ->> 'anonymousId'), '') as anonymous_id,
    nullif(
      coalesce(
        a.payload ->> 'authenticated_user_hash',
        a.payload ->> 'authenticatedUserHash'
      ),
      ''
    ) as authenticated_user_hash
  from "user_telemetry_events" a
  where a.journey_id = e.journey_id
    and a.event_name = 'auth.session.created'
    and a.occurred_at <= e.occurred_at
  order by a.occurred_at desc, a.event_id desc
  limit 1
) auth_context on true
where e.event_version = 1
  and e.event_name in (
    'home.event.all.click',
    'home.event.plaza.entry.click',
    'anchor_event.landing.viewed'
  );

create or replace view "fact_anchor_event_funnel_segment" as
select
  s.payload ->> 'segment_id' as segment_id,
  s.journey_id,
  s.attributes ->> 'rendered_mode' as rendered_mode,
  nullif(s.payload ->> 'segment_start_spm', '') as start_spm,
  nullif(s.payload ->> 'segment_start_source_qr', '') as source_qr,
  nullif(s.payload ->> 'assignment_revision', '') as assignment_revision,
  case
    when (s.payload ->> 'event_id') ~ '^[0-9]+$'
      then (s.payload ->> 'event_id')::integer
    else null
  end as anchor_event_id,
  s.occurred_at as context_occurred_at
from "user_telemetry_events" s
where s.event_version = 1
  and s.event_name = 'segment.started'
  and s.payload ->> 'segment_kind' = 'anchor_event_landing'

union all

select
  s.event_id::text as segment_id,
  s.journey_id,
  nullif(coalesce(s.payload ->> 'renderedMode', s.payload ->> 'rendered_mode'), '') as rendered_mode,
  nullif(coalesce(s.attributes ->> 'spm', s.payload ->> 'spm'), '') as start_spm,
  nullif(
    coalesce(
      s.attributes ->> 'source_qr',
      s.payload ->> 'sourceQr',
      s.payload ->> 'source_qr'
    ),
    ''
  ) as source_qr,
  nullif(coalesce(s.payload ->> 'assignmentRevision', s.payload ->> 'assignment_revision'), '') as assignment_revision,
  case
    when coalesce(s.payload ->> 'eventId', s.payload ->> 'event_id') ~ '^[0-9]+$'
      then coalesce(s.payload ->> 'eventId', s.payload ->> 'event_id')::integer
    else null
  end as anchor_event_id,
  s.occurred_at as context_occurred_at
from "user_telemetry_events" s
where s.event_version = 1
  and s.event_name = 'anchor_event.landing.viewed';

create or replace view "fact_anchor_event_funnel_event" as
select
  e.event_id,
  e.event_name,
  e.journey_id,
  e.occurred_at,
  matched_segments.segment_id,
  matched_segments.rendered_mode,
  matched_segments.start_spm,
  matched_segments.source_qr,
  matched_segments.assignment_revision,
  matched_segments.anchor_event_id,
  matched_segments.context_occurred_at,
  e.payload
from "user_telemetry_events" e
inner join lateral (
  select
    s.segment_id,
    s.rendered_mode,
    s.start_spm,
    s.source_qr,
    s.assignment_revision,
    s.anchor_event_id,
    s.context_occurred_at
  from "fact_anchor_event_funnel_segment" s
  where
    s.segment_id = e.payload ->> 'legacy_segment_id'
    or (
      e.journey_id = s.journey_id
      and coalesce(
        case
          when (e.payload ->> 'eventId') ~ '^[0-9]+$'
            then (e.payload ->> 'eventId')::integer
          else null
        end,
        case
          when (e.payload ->> 'eventIdRef') ~ '^[0-9]+$'
            then (e.payload ->> 'eventIdRef')::integer
          else null
        end,
        case
          when (e.payload ->> 'event_id_ref') ~ '^[0-9]+$'
            then (e.payload ->> 'event_id_ref')::integer
          else null
        end
      ) = s.anchor_event_id
      and s.context_occurred_at <= e.occurred_at
    )
  order by
    case
      when s.segment_id = e.payload ->> 'legacy_segment_id' then 0
      else 1
    end,
    s.context_occurred_at desc,
    s.segment_id desc
  limit 1
) matched_segments on true
where e.event_version = 1
  and e.event_name in (
    'anchor_event.landing.viewed',
    'anchor_event.form.started',
    'anchor_event.recommendation.requested',
    'anchor_event.recommendation.returned',
    'anchor_event.candidate.engaged',
    'anchor_event.assisted_create.started',
    'anchor_event.card_stack.loaded',
    'anchor_event.card.seen',
    'anchor_event.card.action_taken',
    'anchor_event.card_empty_create.started',
    'anchor_event.list.loaded',
    'anchor_event.date.selected',
    'anchor_event.pr_row.seen',
    'anchor_event.pr_row.action_taken',
    'anchor_event.list_create.started',
    'pr.entry.reached',
    'pr.commitment.result'
  );

create or replace view "fact_official_account_follow_nudge_event" as
select
  e.event_id,
  e.event_name,
  e.journey_id,
  e.occurred_at,
  nullif(e.payload ->> 'source', '') as source,
  nullif(e.payload ->> 'action', '') as action,
  case
    when coalesce(e.payload ->> 'eventId', e.payload ->> 'event_id_ref') ~ '^[0-9]+$'
      then coalesce(e.payload ->> 'eventId', e.payload ->> 'event_id_ref')::integer
    else null
  end as anchor_event_id,
  nullif(coalesce(e.attributes ->> 'spm', e.payload ->> 'spm'), '') as spm,
  nullif(
    coalesce(
      e.attributes ->> 'source_qr',
      e.payload ->> 'sourceQr',
      e.payload ->> 'source_qr'
    ),
    ''
  ) as source_qr,
  nullif(coalesce(e.payload ->> 'assignmentRevision', e.payload ->> 'assignment_revision'), '') as assignment_revision,
  nullif(coalesce(e.payload ->> 'renderedMode', e.payload ->> 'rendered_mode'), '') as rendered_mode
from "user_telemetry_events" e
where e.event_version = 1
  and e.event_name in (
    'official.account.follow.nudge.shown',
    'official.account.follow.nudge.action.click'
  );
