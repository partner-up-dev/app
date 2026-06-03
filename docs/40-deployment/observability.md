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
- `user_telemetry_events` and `user_telemetry_rejected_events` record governed user-behavior telemetry and ingest validation failures
- `/api/telemetry/user/events` ingests batched registry-governed user telemetry events with mandatory `journey_id`, optional `trace_id`, attributes, and payload
- `/api/analytics/*` exposes read-oriented product analytics derived from `user_telemetry_*` projections and business-state tables
- `/api/analytics/anchor-event-funnel` exposes the BI v1 aggregate for Anchor Event -> PR conversion, split by `FORM`, `CARD_RICH`, and `LIST` landing modes, plus official-account follow Nudge button-click metrics
- `/admin/analytics` is the BI dashboard route and requires the `analytics` role
- `/bi?code=...` is the lightweight BI entry route for the seeded analytics user

### Correlation Boundary

- User-behavior telemetry and program-internal telemetry are separate signal families.
- User-behavior telemetry keeps optional `trace_id` so behavior events can join with program behavior collection / software observability.
- User-behavior telemetry does not carry `correlation_id`, `cause_event_id`, `source`, `authority`, anonymous id, or authenticated user hash on ordinary behavior events.
- Program-internal behavior collection should preserve OTLP-compatible trace/log/metric correlation.
- User command requests carry `x-journey-id` so backend command owners can emit user-result events in the same journey.

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
