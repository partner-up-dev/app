# Observability

This document owns deployment and program-runtime observability: signals that
help operators decide whether the deployed system is healthy, failing, or
recovering.

User-behavior telemetry and BI answer product questions about how people use
PartnerUp. Their product meaning belongs to PRD, and their cross-unit technical
contracts belong to Product TDD:

- `docs/20-product-tdd/analytics-and-telemetry-contracts.md`
- `docs/20-product-tdd/bi-domain-contracts.md`

Deployment may mention those surfaces only as adjacent diagnostic evidence, not
as the owner of BI metric semantics.

## Runtime Signals Available

### Function Runtime

- FC request metrics enabled
- FC instance metrics enabled
- logs written to configured Aliyun Log Service project/store

### Backend Health And Runtime Paths

- `/health` exposes basic HTTP health and job-runner status
- `/internal/maintenance/tick` is the operational entrypoint for due-job
  execution
- request-tail maintenance remains separate and short-budgeted

### Persisted Program Signals

- `operation_logs` records domain action audit trail and can support runtime
  diagnosis when user-facing state does not match expected command effects
- `jobs` records persisted scheduling semantics, including bucket resolution
  and early/late tolerance units
- `notification_deliveries` records notification send outcomes and provider
  failures
- user-behavior telemetry rejection counts can be adjacent runtime evidence
  when ingest is failing, but accepted event meaning, BI projections, and
  dashboard semantics are not deployment-owned

### Correlation Boundary

- User-behavior telemetry and program-internal telemetry are separate signal
  families.
- User-behavior telemetry may keep optional `trace_id` so behavior events can
  join with program behavior collection / software observability.
- User command requests carry `x-journey-id` so backend command owners can emit
  user-result events in the same journey.
- Program-internal behavior collection should preserve OTLP-compatible
  trace/log/metric correlation when that infrastructure exists.

## What To Watch

- migration failure before deploy
- backend FC deploy or production alias publication failures
- frontend ESA deploy failures
- job runner tick failures, backlog growth, or unexpected `MISSED`
  accumulation caused by bucket timing policy
- notification delivery failures, especially repeated rejection/error patterns
- OAuth/config-related failures in WeChat-dependent flows
- provider callback edge routing failures for CaoCao callbacks
- telemetry ingest rejection spikes as a runtime symptom, while BI metric
  interpretation remains outside deployment

## Adjacent Product Observability Boundary

The following surfaces are product / BI observability, not deployment
observability:

- `user_telemetry_events`
- `user_telemetry_rejected_events` as BI validation ledger
- `/api/telemetry/user/events` as the user-behavior ingest contract
- `/api/analytics/*`
- `/api/analytics/anchor-event-funnel`
- `/admin/analytics`
- `/bi?code=...`
- Anchor Event -> PR conversion, source attribution, retention, and funnel
  semantics

Deployment can use these surfaces for diagnosis only in a narrow sense:

- accepted/rejected event volume can reveal ingest health
- analytics API failures can reveal backend runtime or authorization failure
- unexpected empty dashboards after deploy can be a smoke signal

The meaning of those metrics and dashboards belongs to product / BI ownership,
not deployment operations.

## Current Gaps And Owners

| Gap | Owner route | Notes |
| --- | --- | --- |
| no documented centralized alerting policy in the repo | deployment operations policy | define alert channels, thresholds, and owner rotation before calling this implemented |
| `/internal/maintenance/tick` only avoids overlap inside one warm backend process today | backend runtime architecture | cross-instance maintenance overlap remains possible until a DB-global coordination mechanism is added |
| no dedicated management UI yet for operation logs | product/admin surface follow-up if operator UI is needed | deployment owns the runtime diagnostic need, not the product shape of an operator UI |
| BI source-attribution scenario coverage for `/e/:eventId?spm=...` is missing | Product TDD / test-platform follow-up | this is a product analytics verification gap, not deployment observability |

Those gaps are real and should remain explicit rather than implied away.
