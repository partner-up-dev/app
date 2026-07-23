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
- `GET /internal/maintenance/diagnostics` is protected by the same internal
  token and exposes only bounded Job backlog/lag/lease/retry/held aggregates
  plus bounded runner state. It is read-only, excludes Job rows/payloads and
  provider data, and is not a public health endpoint.
- request-tail maintenance remains separate and short-budgeted

### Persisted Program Signals

- `operation_logs` records domain action audit trail and can support runtime
  diagnosis when user-facing state does not match expected command effects
- `jobs` records persisted scheduling semantics, including bucket resolution
  and early/late tolerance units, generic execution status/reason, claim
  fencing and held/released creation reservations
- retained `notification_deliveries` rows record historical legacy handler
  outcomes and provider failures; current generic Notification execution does
  not write them. They are transitional audit evidence, not delivery
  authority.
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

### Job-Attempt Observability Boundary

Phase 6 deliberately adds no Job-attempt console/stdout sink and removes the
legacy CaoCao debug stdout path. FC log capture alone is not a governed
observability implementation: the repository still lacks a correlated
log/trace/metric backend contract, checked-in queries, retention/access policy,
alerts and recovery runbooks.

Current operational truth therefore comes from durable generic `jobs` state,
the protected bounded maintenance diagnostic and the transitional
`notification_deliveries` audit surface. A later observability phase may emit
zero-to-many attempt signals per Job, but it must preserve telemetry
non-authority and must not require another SQL attempt ledger merely to model
pure audit history.

Job status, retry count and latest bounded execution error remain durable
because they control generic task execution. Business reconciliation-required
state belongs to the semantic owner when the product actually models one; it
is not a Job status. Dropping `notification_deliveries` remains future work
until a real log/trace/metric path proves correlation, queryability, retention
and recovery/alert coverage. Telemetry loss must not change Job control state.

## What To Watch

- migration failure before deploy
- backend FC deploy or production alias publication failures
- frontend ESA deploy failures
- job runner tick failures, backlog growth, or unexpected `MISSED`
  accumulation caused by bucket timing policy
- durable Job failures/retries plus owner-specific outcomes, especially
  repeated Notification/provider rejection/error patterns
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
- `/api/analytics/pr-discovery-funnel`
- `/admin/analytics`
- `/bi?code=...`
- PR Discovery -> PR Authoring / PR participation outcomes, source attribution,
  retention, and funnel semantics

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
| `/internal/maintenance/tick` has no whole-tick or whole-handler global exclusion | backend runtime architecture | the endpoint has a process-local in-flight guard; JobRunner also takes a transaction-scoped DB advisory lock and row claims for each batch. Cross-instance ticks may still overlap outside that short claim transaction, so handlers and lease-expiry retry paths must remain idempotent. |
| protected maintenance diagnostics have local source proof but no deployed access/query/runbook proof | Phase 6 deployment observability | do not assume the deployed internal-token route is reachable or operationally usable until an authorized environment check records it; the read-only aggregate is not an O11y replacement by itself |
| no dedicated management UI yet for operation logs | product/admin surface follow-up if operator UI is needed | deployment owns the runtime diagnostic need, not the product shape of an operator UI |
| no governed Job-attempt log/trace/metric path exists | future observability infrastructure | keep `notification_deliveries`, durable Job execution state and protected aggregates until correlated signals, retention, access, operator queries and alerts are proven; do not substitute console JSON or add a second SQL attempt ledger |
| BI source-attribution scenario coverage for `/prd?spm=...` is missing | Product TDD / test-platform follow-up | this is a product analytics verification gap, not deployment observability |

Those gaps are real and should remain explicit rather than implied away.
