# Phase 7 Current And Corrected Target Topology

## Current Legacy Program-Diagnostic Topology

```text
production Backend / callback router / Web debug path
  -> request logger, console text, structured console JSON, debug headers
  -> FC logConfig
  -> Aliyun SLS project/logstore
  -> saved queries/dashboards/alerts, if any (external state at entry)

domain actions
  -> operationLogService
  -> operation_logs (best-effort SQL writes; no proven reader)

Job control
  -> jobs + protected bounded diagnostics

historical Notification audit
  -> notification_deliveries (no current writer)
```

The first path is legacy pseudo-observability. The SQL and durable-control
paths are separate mechanisms and require separate authority/data decisions.

## Phase 7 Clean-Baseline Target

```text
production Backend
  -X-> no repository SLS log coupling
  -X-> no structured-stdout observability adapter
  -X-> no Commerce/debug-header diagnostic protocol
  -X-> no operationLogService / operation_logs
  -X-> no configured legacy saved SLS query/dashboard
        (closed from labelled operator evidence/decision)

business facts ----------------------> semantic owners
generic execution control ----------> jobs
bounded maintenance diagnostics ----> temporary operational fallback,
                                       explicitly not O11y
historical compatibility -----------> retained only when separately justified

program observability --------------> NOT IMPLEMENTED YET
```

The target is intentionally incomplete in capability and complete in honesty.
It removes a misleading architectural constraint before the future system is
designed. Sir closed further platform-artifact inventory for Phase 7; this
topology does not claim a platform audit or deletion performed by Codex.

## Future Professional Program-Observability Task

```text
proven operator/recovery questions
  -> signal-family and correlation requirements
  -> privacy/cardinality/retention/access requirements
  -> runtime and deployment constraints
  -> architecture and backend/exporter selection
  -> vertical proof
  -> alerts/runbooks
  -> compatibility retirement
```

The task inherits requirements, not SLS queries, structured output schemas or
console-based transport. Logs, traces and metrics are design options, not a
preselected solution.

## Current User-Telemetry / BI Topology

```text
Web snake_case event + Web payload type
  -> canonical-name translation + journey/context
  -> in-memory queue
  -> telemetry ingest
  -> Backend Event Registry
     -> accepted ledger
     -> rejected ledger
  -> create/join/retention fact views
  -> PR Discovery raw-payload reader
  -> Analytics API
  -> four query hooks
  -> one page owns three dashboards
```

## Phase 7 User-Telemetry / BI Target

```text
Backend-owned canonical Event Registry
  -> type-only Web projection
  -> focused collector/context
  -> bounded queue/transport
  -> accepted/rejected ledgers
  -> fact-specific typed projections or authoritative business facts
  -> Analytics API
  -> Web domains/analytics queries/models/panels
  -> one route surface assembles one dashboard

business command outcome -X-> never depends on telemetry success
```

User telemetry does not fill the program-observability gap. A future
`trace_id` join remains optional and cannot become control authority.

The detailed `7-4` dependency topology and sequences live in
[`05-bi-projection-web-convergence/`](./05-bi-projection-web-convergence/).
