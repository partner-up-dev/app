# Implementation Log

Date: 2026-05-22 / 2026-05-23

## Created

- Created this packet after reviewing the limitations of query-level `event_enriched`, compile-time registry coverage, `dim_event`, and projection granularity.

## Current State

- The prior `timestamptz` DB-boundary hotfix remains a runtime safety fix, not the target architecture.
- The packet has been refreshed to use a fact-first projection topology:
  - one stable BI question maps to one fact view/table where practical;
  - DB-level `dim_event` is not a first-stage dependency;
  - shared `user_context_base` / wide `event_enriched` is not a first-stage dependency;
  - fact event-name references should be verified against the TypeScript Event Registry.
- Added a BI dashboard / API split constraint:
  - multiple dashboards should be grouped by BI question or fact family;
  - `/admin/analytics` should not remain a catch-all surface for every metric;
  - API endpoints should align with fact ownership and dashboard filters.
- Corrected the dashboard IA wording: cross-Anchor-Event natural extension belongs under `/admin/analytics/anchor-events`, not a separate "activity discovery" dashboard; dashboard naming should keep the domain term "Anchor Event".
- Implemented the first production fact-view slice:
  - `fact_pr_join_funnel_event`;
  - `fact_pr_create_funnel_event`;
  - `fact_user_retention_activity_event`;
  - `fact_anchor_event_transition_event`;
  - `fact_view_other_anchor_events_conversion_event`;
  - `fact_anchor_event_funnel_segment`;
  - `fact_anchor_event_funnel_event`;
  - `fact_official_account_follow_nudge_event`.
- Added Drizzle view schemas for those facts.
- Migrated BI overview, PR create funnel, PR join funnel, Anchor Event funnel, and official-account nudge readers away from the shared query-level `user-event-projection.ts` / production `db.execute<T>` projection paths.
- Deleted `user-event-projection.ts` after production readers stopped depending on it.
- Added registry-reference verification for the implemented fact event-name lists.
- Split the frontend BI dashboard surface into role-gated route-level dashboards:
  - `/admin/analytics` redirects to `/admin/analytics/overview`;
  - `/admin/analytics/overview` loads only overview facts;
  - `/admin/analytics/pr-funnels` loads PR create / join funnel facts;
  - `/admin/analytics/anchor-events` loads Anchor Event behavior facts and owns Anchor Event-specific filters;
  - `/admin/analytics/official-account` loads official-account follow nudge facts.
- Verification passed:
  - targeted analytics / registry unit tests;
  - full backend unit tests;
  - backend typecheck;
  - backend lint;
  - backend build;
  - DB migration lint;
  - source scan showing no analytics/controller production references to `db.execute<T>` or the removed shared projection.

## Remaining Follow-Up

- Decide whether PR lifecycle and per-user PR counts should remain typed business-table queries or gain business fact views.
- Add DB-backed smoke coverage after applying `0067` in local/staging DB if the team wants a persistent regression check beyond current unit/build coverage.
