# Fact Contracts

## Purpose

This file turns the BI requirement inventory into implementation contracts. The first implementation slice intentionally uses narrow PostgreSQL views for stable parsing and context reconstruction, while keeping BI aggregation in TypeScript models.

## Shared Rules

- Fact views are not generic enriched event views.
- Each fact view belongs to one BI question or one tightly related dashboard family.
- Event instants must be `timestamptz` end to end.
- Query windows use `[startAt, endAt)` over `occurred_at`.
- Views may parse both camelCase and snake_case payload fields only where migration history requires it.
- Views must expose unknown context explicitly rather than silently dropping rows.
- Fact event names are declared in TypeScript and verified against the Event Registry.

## `fact_pr_join_funnel_event`

BI question:

- From seeing a join CTA, how many journeys proceed to click, frontend success, and backend-confirmed join?

Source:

- `user_telemetry_events`
- nearest prior `route.entered` in the same journey
- nearest prior `auth.session.created` in the same journey

Grain:

- one telemetry event row relevant to the PR join funnel event-name set
- `step_key` is nullable so diagnostics can still count in-window relevant events that do not qualify as a funnel step

Event names:

- `pr.primary_cta.impression`
- `pr.primary_cta.click`
- `pr.join.result`
- `pr.joined`

Derived dimensions:

- `step_key`
  - `join_cta_impression` when `pr.primary_cta.impression` has CTA type `JOIN`
  - `join_cta_click` when `pr.primary_cta.click` has CTA type `JOIN`
  - `frontend_join_success` when `pr.join.result` has action result `success`
  - `backend_joined` for `pr.joined`
- `route_context_status`
- `auth_context_status`
- `authenticated_user_hash`
- `anonymous_id`

Measures computed by the model:

- distinct journeys per step
- event count per step
- conversion from previous step
- conversion from start step
- identity completeness diagnostic
- route / auth context completeness diagnostic

## `fact_pr_create_funnel_event`

BI question:

- From create entry intent, how many journeys proceed to frontend success and backend-confirmed PR creation, split by creation path?

Source:

- `user_telemetry_events`
- nearest prior `route.entered` in the same journey
- nearest prior `auth.session.created` in the same journey

Grain:

- one telemetry event row relevant to the PR create funnel event-name set
- `step_key` is nullable for the same diagnostic reason as the join funnel fact

Event names:

- `home.create.entry.click`
- `anchor_event.assisted_create.started`
- `anchor_event.card_empty_create.started`
- `anchor_event.list_create.started`
- `anchor_event.form.create_fallback_clicked`
- `pr.create.result`
- `anchor_event.assisted_create.result`
- `pr.created`

Derived dimensions:

- `step_key`
  - `create_entry_intent` for create entry events
  - `frontend_create_success` when frontend create result has action result `success`
  - `backend_created` for `pr.created`
- `creation_path`
  - `form`
  - `event_assisted`
  - `natural_language`
  - `unknown`
- `route_context_status`
- `auth_context_status`
- `authenticated_user_hash`
- `anonymous_id`

Measures computed by the model:

- distinct journeys per step
- event count per step
- conversion from previous step
- conversion from start step
- creation-path journey and event breakdown
- identity completeness diagnostic
- route / auth context completeness diagnostic

## `fact_user_retention_activity_event`

BI question:

- Do users return after becoming active in the product?

Source:

- `user_telemetry_events`
- nearest prior `auth.session.created` in the same journey

Grain:

- one non-deprecated telemetry event row with reconstructed identity

Derived dimensions:

- `identity_key`
  - authenticated user hash when available
  - otherwise `anonymous:<anonymous_id>`
  - otherwise null

Measures computed by the model:

- active users by product-local cohort date
- retained users within 3 / 5 / 7 days
- retention rates

## `fact_anchor_event_transition_event`

BI question:

- Do users naturally move from one Anchor Event type to another after viewing Anchor Events?

Source:

- `anchor_event.landing.viewed`
- nearest prior `auth.session.created` in the same journey

Grain:

- one Anchor Event landing view with reconstructed identity and activity type

Derived dimensions:

- `identity_key`
- `activity_type`

Measures computed by the model:

- consecutive activity-type transition count
- distinct user count per transition

## `fact_view_other_anchor_events_conversion_event`

BI question:

- After clicking a view-other-Anchor-Events entry, do users view an Anchor Event landing later in the same journey?

Source:

- `home.event.all.click`
- `home.event.plaza.entry.click`
- `anchor_event.landing.viewed`
- nearest prior `auth.session.created` in the same journey

Grain:

- one conversion candidate event row

Derived dimensions:

- `identity_key`

Measures computed by the model:

- click journeys / users
- later landing-view journeys / users
- journey conversion rate
- user conversion rate

## `fact_anchor_event_funnel_segment`

BI question:

- How do Anchor Event landing modes convert into PR exposure, entry, commitment, and outcomes?

Source:

- legacy migrated `segment.started` rows for historical Anchor Event landing context
- new `anchor_event.landing.viewed` rows for current landing context

Grain:

- one Anchor Event landing context

Derived dimensions:

- `segment_id`
- `journey_id`
- `rendered_mode`
- `start_spm`
- `source_qr`
- `assignment_revision`
- `anchor_event_id`
- `context_occurred_at`

## `fact_anchor_event_funnel_event`

BI question:

- How do Anchor Event landing contexts convert into mode-specific funnel steps and PR commitment outcomes?

Source:

- Anchor Event funnel event-name set
- matched nearest `fact_anchor_event_funnel_segment`

Grain:

- one Anchor Event funnel event matched to one landing context

Derived dimensions:

- landing context dimensions from `fact_anchor_event_funnel_segment`
- raw event payload retained as fact-local input for existing mode/outcome parsing

Measures computed by the model:

- mode comparison
- mode funnel step counts
- outcome breakdown
- failure breakdown
- source breakdown

## `fact_official_account_follow_nudge_event`

BI question:

- How often does the official-account follow nudge lead to follow-click behavior, by source?

Source:

- `official.account.follow.nudge.shown`
- `official.account.follow.nudge.action.click`

Grain:

- one official-account follow nudge event

Derived dimensions:

- `source`
- `action`
- Anchor Event attribution filters where present

Measures computed by the model:

- shown journeys / events
- follow-click journeys / events
- dismiss journeys / events
- source breakdown

## Deferred Contracts

The following BI questions are intentionally not in the first implementation slice:

- PR lifecycle business fact view
- per-user PR count business fact view

They remain in scope for #241, but should follow this contract shape instead of depending on a shared wide event enrichment object.
