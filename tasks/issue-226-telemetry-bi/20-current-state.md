# Current State

## Frontend Evidence

- User telemetry is centralized in `apps/frontend/src/shared/telemetry/events.ts`, `track.ts`, and `journey.ts`.
- `trackEvent(...)` maps snake_case source names to dot-separated canonical names, queues events, and flushes to `/api/telemetry/user/events`.
- Journey state uses sessionStorage, anonymous id continuity, and a 30-minute inactivity timeout.
- The frontend does not emit explicit `journey.started`, `journey.ended`, `route.entered`, or `route.left` events.
- The frontend does not provide `event_version`, `event_family`, or a governed `attributes` / `payload` split.
- Router currently emits `page_view` in `router.afterEach`.
- PR join / waitlist have relatively complete result telemetry, but the viewed -> clicked -> intent -> request submitted -> backend-confirmed result funnel is not governed.
- Structured PR create has success-result telemetry, while NL create and close/status update coverage is incomplete.

## Backend Evidence

- User behavior is stored in `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events`.
- Ingest dedupes events by client-provided UUID and upserts journey / segment context.
- `user_telemetry_events` is not yet a minimal raw ledger: it stores many context fields and lacks governed version/family/attributes/payload semantics.
- BI v1 reads user telemetry directly for Anchor Event funnel aggregation.
- There is no `event_enriched`, `dim_event`, `fact_pr_lifecycle`, `fact_pr_join_funnel`, `fact_anchor_event_transition`, or `fact_retention` projection layer.
- User-caused PR result paths live in `pr-core`: create / publish / join / waitlist / status update.
- Automatic PR lifecycle paths such as temporal expire/close currently live in `pr-core/temporal-refresh.ts` and should not be folded into user-behavior telemetry.
- PR lifecycle paths write operation logs, not BI-grade user-result events or program-behavior events.

## Known Risk

- Continuing to extend current event fields would reinforce duplicated context and frontend-owned BI semantics.
- Keeping `user_telemetry_segments` as a separate table conflicts with the target principle that context should be expressed through event streams.
- `refreshTemporalStatus()` may observe close/expire facts from read-triggered paths; those facts should be handled by program behavior collection or business-state projection, not user-behavior telemetry.
