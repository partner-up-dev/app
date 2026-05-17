# Observability

## Runtime Signals Available

### Function Runtime

- FC request metrics enabled
- FC instance metrics enabled
- logs written to configured Aliyun Log Service project/store

### Backend Health And Runtime Paths

- `/health` exposes basic HTTP health and job-runner status
- `/internal/maintenance/tick` is the operational entrypoint for due-job execution
- request-tail maintenance remains separate and short-budgeted

### Persisted Operational Signals

- `operation_logs` records domain action audit trail
- `jobs` records persisted scheduling semantics, including bucket resolution and early/late tolerance units
- `notification_deliveries` records notification send outcomes
- `telemetry_events` records raw product telemetry from frontend/backend sources
- `user_telemetry_journeys`, `user_telemetry_segments`, and `user_telemetry_events` record user-behavior telemetry for product funnel analysis
- `/api/telemetry/user/events` ingests batched user telemetry events with app journey, business segment, typed subject, source, and correlation fields
- `/api/analytics/*` exposes read/export-oriented product analytics derived from telemetry and business-state tables
- `/api/analytics/anchor-event-funnel` exposes the BI v1 aggregate for Anchor Event -> PR conversion, split by `FORM`, `CARD_RICH`, and `LIST` landing modes, plus official-account follow Nudge button-click metrics
- `/admin/analytics` is the BI dashboard route and requires the `analytics` role
- `/bi?code=...` is the lightweight BI entry route for the seeded analytics user

### Correlation Boundary

- User-behavior telemetry and program-internal telemetry are separate signal families.
- User-behavior telemetry carries `correlation_id`, `request_id`, and `trace_id` fields so later analysis can join frontend behavior to backend execution evidence.
- Program-internal behavior collection is a future track and should preserve OTLP-compatible trace/log/metric correlation.
- Frontend correlated JSON commands must keep `content-type: application/json` while adding `x-correlation-id`, so backend JSON validators continue to parse command bodies.

## What To Watch

- migration failure before deploy
- job runner tick failures, backlog growth, or unexpected `MISSED` accumulation caused by bucket timing policy
- notification delivery failures, especially repeated rejection/error patterns
- OAuth/config-related failures in WeChat-dependent flows
- user telemetry ingestion failures from `/api/telemetry/user/events`
- analytics dashboard aggregate failures or unexpected empty-funnel results after Anchor Event landing campaigns

## Current Gaps

- no dedicated management UI yet for operation logs
- no documented centralized alerting policy in the repo
- `/internal/maintenance/tick` only avoids overlap inside one warm backend process today; cross-instance maintenance overlap is still possible until a DB-global coordination mechanism is added
- direct source-attribution scenario coverage for `/e/:eventId?spm=...` still needs a focused verification slice if BI source filtering becomes a release gate

Those gaps are real and should remain explicit rather than implied away.
