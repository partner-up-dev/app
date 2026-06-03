# BI Requirements Inventory

## Purpose

Projection topology must be derived from BI requirements, not from a preferred storage pattern. This inventory records the current known BI questions and the shape each question demands from telemetry, business facts, and projections.

## Requirement Shape To Capture

For each BI question, capture:

- product question;
- source family;
- fact grain;
- time / cohort semantics;
- identity semantics;
- required context;
- dimensions / filters;
- measures;
- expected freshness;
- projection implication.

## Current Known BI Questions

## Previous Shared User-Telemetry Projection Input

Before the first fact-view migration slice, production readers that used user behavior events first called `fetchUserTelemetryEnrichedEvents(...)`.

Source:

- `user_telemetry_events` as raw ledger.
- Query-level `dim_event` CTE generated from the TypeScript Event Registry.

Base event filter:

- `e.occurred_at >= startAt::timestamptz`
- `e.occurred_at < endAt::timestamptz`
- `e.event_name in (...)`
- registry row must not be deprecated.

Dictionary fields:

- `event_family`, `owner`, `bi_usage`, and `deprecated` come from the TypeScript registry via query-level `values (...)`.

Route context:

- nearest prior `route.entered` event in the same `journey_id`;
- order: `occurred_at desc, event_id desc`;
- current parser reads:
  - `route_path`: `route.entered.payload.routePath`;
  - `route_name`: `route.entered.attributes.route_name` or `route.entered.payload.routeName`;
  - `spm`: `route.entered.attributes.spm` or `route.entered.payload.spm`;
  - `source_qr`: `route.entered.attributes.source_qr` or `route.entered.payload.sourceQr`.

Identity context:

- nearest prior `auth.session.created` event in the same `journey_id`;
- order: `occurred_at desc, event_id desc`;
- current parser reads:
  - `anonymous_id`: `auth.session.created.payload.anonymous_id`;
  - `authenticated_user_hash`: `auth.session.created.payload.authenticated_user_hash`.

Context completeness:

- missing route context becomes `route_context_status = context_unknown`;
- missing auth context becomes `auth_context_status = context_unknown`.

Known implementation gap:

- legacy migrated `route.entered` rows may carry snake-case payload fields such as `route_path`, `route_name`, and `source_qr`; the current query-level route parser does not read all snake-case payload variants.

### R1: Retention

Product question:

- Do users return after becoming active in the product?

Source family:

- User behavior telemetry.

Concrete implemented data source:

- `fact_user_retention_activity_event`.
- The view selects non-deprecated user telemetry activity and reconstructs identity from nearest prior `auth.session.created`.
- Fetch window is `[startAt, endAt + 7 days)` so return activity can be evaluated for 3 / 5 / 7 day lookahead windows.

Fact grain:

- User-date activity cohort.

Time semantics:

- Cohort date is derived from user event `occurred_at` using the product-local date key.
- Query window selects cohort dates.
- Retention needs lookahead windows of 3 / 5 / 7 days beyond the cohort date.

Identity semantics:

- Prefer authenticated user hash.
- Fall back to anonymous id when no authenticated session exists.
- Unknown identity is excluded or surfaced as incomplete, depending on metric policy.

Concrete current identity parsing:

- `identityKey = authenticatedUserHash ?? anonymous:${anonymousId}`.
- Events with neither value are skipped.

Required context:

- Identity context from nearest prior `auth.session.created`.

Measures:

- active users;
- retained within 3 days;
- retained within 5 days;
- retained within 7 days;
- retention rates.

Concrete current parsing:

- `cohortDate = formatDateKeyUtc8(event.occurredAt)`.
- A user is retained for N days when the same identity has any active date `> cohortDate` and `<= cohortDate + N days`.

Projection implication:

- A retention fact should likely be user-day based, not a wide event-level enrichment object.

### R2: Per-User PR Counts

Product question:

- How many users have created or joined PRs in the selected window?

Source family:

- Business fact tables.

Concrete current data source:

- `partner_requests`:
  - `created_by::text` as `user_key`;
  - `created_at` filtered by `[startAt, endAt)`;
  - only rows where `created_by is not null`;
  - count as `created_count`.
- `partners`:
  - `user_id::text` as `user_key`;
  - `created_at` filtered by `[startAt, endAt)`;
  - `status in ('JOINED', 'CONFIRMED', 'ATTENDED')`;
  - `count(distinct pr_id)` as `joined_count`.
- Full outer join by `user_key`.

Fact grain:

- User participation / ownership count.

Time semantics:

- Created PRs use PR `created_at`.
- Joined PRs use partner participation creation time or the authoritative participation timestamp.

Identity semantics:

- Durable user id from business tables.

Required context:

- None from user telemetry.

Measures:

- users with any PR;
- creator users;
- participant users;
- created PRs;
- joined PRs;
- averages and max values.

Projection implication:

- This should not go through user telemetry enrichment.

### R3: PR Lifecycle Status

Product question:

- How many PRs are formed, closed, expired, active, or open for a business cohort?

Source family:

- Business fact tables.

Concrete current data source:

- `partner_requests.status`.
- Created-at cohort:
  - `partner_requests.created_at >= startAt::timestamp`
  - `partner_requests.created_at < endAt::timestamp`
- Time-window-end cohort:
  - `partner_requests.time_window[2] is not null`
  - `nullif(time_window[2], '')::timestamp >= startAt::timestamp`
  - `nullif(time_window[2], '')::timestamp < endAt::timestamp`

Fact grain:

- PR row status cohort.

Time semantics:

- PR `created_at` cohort.
- PR time-window `endAt` cohort.
- The selected question decides which cohort is authoritative.

Identity semantics:

- Not user-behavior identity driven.

Required context:

- None from user telemetry.

Measures:

- created PRs;
- formed PRs;
- closed PRs;
- expired PRs;
- active or open PRs;
- status count and share.

Projection implication:

- A business fact projection may be useful, but it is not part of the user telemetry projection topology.

Concrete current status parsing:

- `formedPRs`: statuses `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`, `CLOSED`.
- `activeOrOpenPRs`: statuses `OPEN`, `READY`, `FULL`, `LOCKED_TO_START`, `ACTIVE`.
- `closedPRs`: status `CLOSED`.
- `expiredPRs`: status `EXPIRED`.

### R4: PR Join Funnel

Product question:

- From seeing a join CTA, how many journeys proceed to click, frontend success, and backend-confirmed join?

Source family:

- User behavior telemetry plus backend-confirmed user-result telemetry.

Concrete current event source:

- `pr.primary_cta.impression`
- `pr.primary_cta.click`
- `pr.join.result`
- `pr.joined`

Concrete current event parsing:

- CTA impression / click only count when `payload.ctaType` or `payload.cta_type` equals `JOIN`.
- Frontend join success only counts when `pr.join.result.payload.actionResult` or `action_result` equals `success`.
- Backend joined counts any `pr.joined` event in the selected window.
- Step counts are distinct `journey_id` counts plus raw event counts.
- Identity diagnostic buckets:
  - authenticated journey if enriched `authenticatedUserHash` exists;
  - anonymous-only journey if auth context exists but no authenticated hash;
  - unknown-session journey if auth context is missing.
- Context diagnostic counters count enriched events with unknown route or auth context.

Fact grain:

- Journey-step facts, with event counts retained for diagnostics.

Time semantics:

- Step membership comes from event `occurred_at` in the selected instant window.
- Current funnel counts use journeys, not ordered per-attempt sequences.

Identity semantics:

- Journey-level counts are primary.
- Authenticated / anonymous / unknown session breakdown is diagnostic.

Required context:

- Route context for placement / surface diagnostics.
- Auth session context for identity completeness diagnostics.

Dimensions / filters:

- event name;
- CTA type `JOIN`;
- frontend result success;
- route / surface if needed later.

Measures:

- impression journeys;
- click journeys;
- frontend success journeys;
- backend joined journeys;
- conversion from previous and from start.

Projection implication:

- A `fact_pr_join_funnel_event` view/table is more appropriate than a generic wide `event_enriched` consumer.

Known implementation gap:

- The standalone PR join funnel currently counts frontend success and backend success. It does not yet include backend-confirmed failure because failure taxonomy is deferred.

### R5: PR Create Funnel

Product question:

- From create entry intent, how many journeys proceed to frontend success and backend-confirmed PR creation, split by creation path?

Source family:

- User behavior telemetry plus backend-confirmed user-result telemetry.

Concrete current event source:

- Create entry intent:
  - `home.create.entry.click`
  - `anchor_event.assisted_create.started`
  - `anchor_event.card_empty_create.started`
  - `anchor_event.list_create.started`
  - `anchor_event.form.create_fallback_clicked`
- Frontend create success:
  - `pr.create.result`
  - `anchor_event.assisted_create.result`
- Backend created:
  - `pr.created`

Concrete current event parsing:

- Frontend create success only counts when `payload.actionResult` or `action_result` equals `success`.
- Backend create path breakdown only reads `pr.created.payload.creation_path` or `creationPath`.
- Creation path is normalized to:
  - `form`
  - `event_assisted`
  - `natural_language`
  - `unknown`
- Step counts are distinct `journey_id` counts plus raw event counts.
- Identity and context diagnostics use `fact_pr_create_funnel_event` route/auth context status.

Fact grain:

- Journey-step facts and creation-path facts.

Time semantics:

- Step membership comes from event `occurred_at` in the selected instant window.

Identity semantics:

- Journey-level counts are primary.
- Authenticated / anonymous / unknown session breakdown is diagnostic.

Required context:

- Route context.
- Auth session context.

Dimensions / filters:

- create entry event group;
- frontend result success;
- backend `pr.created`;
- creation path: form, event-assisted, natural-language, unknown.

Measures:

- entry journeys;
- frontend success journeys;
- backend created journeys;
- conversion rates;
- path breakdown.

Projection implication:

- A `fact_pr_create_funnel_event` view/table plus path breakdown projection is more appropriate than a single broad enrichment object.

Known implementation gap:

- The standalone PR create funnel currently counts frontend success and backend success. It does not yet include backend-confirmed failure because failure taxonomy is deferred.

### R6: Anchor Event Funnel

Product question:

- How do Anchor Event landing modes convert into PR exposure, entry, commitment, and outcomes?

Source family:

- User behavior telemetry, including migrated historical context where needed.

Concrete current context source:

- Legacy migrated context:
  - `segment.started`
  - `payload.segment_kind = anchor_event_landing`
  - filters:
    - `payload.event_id`
    - `payload.segment_start_spm`
    - `payload.segment_start_source_qr`
    - `payload.assignment_revision`
    - `attributes.rendered_mode`
- New context:
  - `anchor_event.landing.viewed`
  - filters:
    - `payload.eventId`
    - `attributes.spm` or `payload.spm`
    - `attributes.source_qr` or `payload.sourceQr`
    - `payload.assignmentRevision`
    - `payload.renderedMode`

Concrete current event source:

- `anchor_event.landing.viewed`
- `anchor_event.form.started`
- `anchor_event.recommendation.requested`
- `anchor_event.recommendation.returned`
- `anchor_event.candidate.engaged`
- `anchor_event.assisted_create.started`
- `anchor_event.card_stack.loaded`
- `anchor_event.card.seen`
- `anchor_event.card.action_taken`
- `anchor_event.card_empty_create.started`
- `anchor_event.list.loaded`
- `anchor_event.date.selected`
- `anchor_event.pr_row.seen`
- `anchor_event.pr_row.action_taken`
- `anchor_event.list_create.started`
- `pr.entry.reached`
- `pr.commitment.result`

Concrete current event-to-context matching:

- Prefer exact migrated `payload.legacy_segment_id`.
- Otherwise match same `journey_id`, same event id reference, and latest landing context with `context_occurred_at <= event.occurred_at`.
- Event id reference is parsed from `payload.eventId`, `payload.eventIdRef`, or `payload.event_id_ref`.

Fact grain:

- Journey by rendered mode, source attribution, and outcome.

Time semantics:

- Window over event `occurred_at`.

Identity semantics:

- Journey is primary.

Required context:

- Rendered mode / landing context.
- Source attribution such as `spm` and `sourceQr`.

Dimensions / filters:

- anchor event id;
- rendered mode: FORM / CARD_RICH / LIST;
- spm;
- source QR;
- assignment revision;
- commitment type;
- action result;
- failure code.

Measures:

- journeys;
- PR exposure journeys;
- PR entry journeys;
- PR commitment journeys;
- commitment rate;
- create / join / waitlist success counts;
- outcomes;
- failures;
- source breakdown.

Projection implication:

- This likely needs its own fact projection because it has richer product-specific dimensions than generic user event enrichment.

Concrete current parsing:

- Rendered mode is one of `FORM`, `CARD_RICH`, `LIST`.
- Source context is currently only `segment.startSpm`; empty source becomes `unknown`.
- PR exposure:
  - FORM: `anchor_event.recommendation.returned` with `candidateCount/candidate_count > 0` or `matchedPrId/matched_pr_id > 0`;
  - CARD_RICH: `anchor_event.card.seen`;
  - LIST: `anchor_event.pr_row.seen`.
- PR entry:
  - `pr.entry.reached`.
- Commitment outcome:
  - `pr.commitment.result.payload.commitmentType` or `commitment_type` in `create | join | waitlist`;
  - `payload.actionResult` or `action_result` in `success | blocked | failure`.
- Failure breakdown:
  - non-success `pr.commitment.result`;
  - `failureCode` / `failure_code`, default `UNKNOWN`;
  - optional `failureReason` / `failure_reason`.

### R7: Anchor Event Transition

Product question:

- Do users naturally move from one activity type to another after viewing Anchor Events?

Source family:

- User behavior telemetry.

Concrete implemented data source:

- `fact_anchor_event_transition_event`.
- Transition calculation uses `anchor_event.landing.viewed`.

Fact grain:

- Identity-level consecutive activity transition.

Time semantics:

- Event order by `occurred_at`.
- Query window bounds the observed landing events.

Identity semantics:

- Requires an identity key from auth session or anonymous id.

Required context:

- Activity type from landing event payload.
- Identity context.

Measures:

- user count per transition;
- transition count.

Concrete current parsing:

- Identity key is `authenticatedUserHash ?? anonymous:${anonymousId}`.
- Landing events are grouped by identity and sorted by `occurredAt`, then `eventId`.
- Activity type is parsed by the fact view from `payload.activityType` or `activity_type`; missing value becomes `unknown`.
- Consecutive same activity type is ignored.

Projection implication:

- A transition fact should be separate from funnel facts; it is sequence-oriented by identity rather than journey-step oriented.

Known implementation gap:

- The current transition calculation does not explicitly exclude advertising or external paid-entry paths. Source attribution is not yet part of this transition fact.

### R8: View Other Anchor Events Conversion

Product question:

- After clicking a view-other-Anchor-Events entry, do users view an Anchor Event landing later?

Source family:

- User behavior telemetry.

Concrete implemented data source:

- `fact_view_other_anchor_events_conversion_event` over:
  - `home.event.all.click`;
  - `home.event.plaza.entry.click`;
  - `anchor_event.landing.viewed`.

Fact grain:

- Journey conversion and user conversion.

Time semantics:

- Click event must precede later landing view in the same journey.
- Query window selects click and landing candidates by `occurred_at`.

Identity semantics:

- Journey conversion is primary.
- User conversion requires identity context.

Required context:

- Identity context for user conversion.

Measures:

- click journeys;
- click users;
- landing view journeys;
- landing view users;
- journey conversion rate;
- user conversion rate.

Projection implication:

- This should be a narrow conversion fact, not a generic event enrichment output.

Concrete current parsing:

- Click events are:
  - `home.event.all.click`
  - `home.event.plaza.entry.click`
- Converted journey if there is an `anchor_event.landing.viewed` in the same `journey_id` with `occurredAt >= click.occurredAt`.
- Click users and landing-view users use `authenticatedUserHash ?? anonymous:${anonymousId}`.

### R9: Official Account Follow Nudge

Product question:

- How often does the official-account follow nudge lead to follow-click behavior, by source?

Source family:

- User behavior telemetry.

Concrete implemented data source:

- `fact_official_account_follow_nudge_event` over:
  - `official.account.follow.nudge.shown`;
  - `official.account.follow.nudge.action.click`.

Concrete current query filters:

- `occurred_at` in `[startAt, endAt)`.
- Optional filters:
  - `eventId` from `payload.eventId` or `payload.event_id_ref`;
  - `spm` from `attributes.spm` or `payload.spm`;
  - `sourceQr` from `attributes.source_qr` or `payload.sourceQr`;
  - `assignmentRevision` from `payload.assignmentRevision`;
  - `renderedMode` from `payload.renderedMode`.

Fact grain:

- Journey by nudge source and action.

Time semantics:

- Window over event `occurred_at`.

Identity semantics:

- Journey-level counts are primary.

Required context:

- Nudge source from event attributes / payload.

Measures:

- shown journeys;
- follow-click journeys;
- dismiss journeys;
- shown events;
- follow-click events;
- dismiss events;
- follow click rate.

Projection implication:

- This can be a dedicated fact projection or remain part of the Anchor Event funnel only if the dashboard question stays coupled to that surface.

Concrete current parsing:

- Source is read from `payload.source` and normalized to:
  - `home`
  - `anchor_event`
  - `pr_join_result`
  - `pr_waitlist_result`
  - `unknown`
- Action is read from `payload.action`.
- `shown` event increments shown journey/event counts.
- `action.click` with `action = complete` increments follow-click journey/event counts.
- `action.click` with `action = dismiss` increments dismiss journey/event counts.

## Cross-Requirement Observations

- Most user-behavior BI questions want fact grains more specific than "enriched event row".
- Shared context reconstruction is useful, but only as a dependency for facts, not necessarily as the dashboard-facing contract.
- Retention is user-day based; PR funnels are journey-step based; Anchor Event transition is identity-sequence based; PR lifecycle and per-user PR counts are business fact based.
- Therefore topology should probably be fact-first, with any base enrichment kept thin and implementation-owned.

## Missing Information

- Which BI questions are dashboard-stable versus exploratory?
- Which metrics require event-level drill-down for debugging?
- What freshness is required: request-time view, materialized refresh, or scheduled projection table?
- Which dimensions must be filterable in the UI versus only used internally?
- Should old migrated Anchor Event segment context remain supported in future fact projections, or only until current historical windows age out?
- Should fact projections expose raw rows to application models, pre-aggregated rows, or both?
