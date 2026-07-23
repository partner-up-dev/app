# Phase 7 — Legacy Observability Retirement / Analytics

## Status

**Phase 7 is complete on 2026-07-23. `7-0`–`7-5` are closed with canonical
local proof. Sir confirms that SLS has no configured saved queries or
dashboards and explicitly closes further platform-artifact inventory for this
Phase. D7-04 is therefore closed by operator evidence/decision rather than an
unperformed environment audit. Deployed-revision verification remains ordinary
rollout evidence, not a Phase 7 blocker.**

The entry baseline is commit `537a9b4f`. This packet is the only Phase 7
control surface. Task-packet maintenance is authorized; every source,
deployment and external-environment deletion still requires Sir's explicit
start.

## Corrected Objective

Phase 7 has two bounded responsibilities:

1. remove legacy pseudo-observability so it cannot constrain or masquerade as
   the future professional program-observability architecture; and
2. converge the already implemented user-telemetry/BI path around one Event
   Registry, passive failure semantics and fact-owned Analytics reads.

Phase 7 does **not** replace the deleted runtime logging/SLS mechanism. It
leaves a truthful clean baseline and a requirement handoff for a separate,
professional, long-lived program-observability task. That later task must
choose its architecture from requirements rather than inherit console,
structured-stdout or SLS-query compatibility.

## Authority Invariants

- Business facts and semantic owners remain product truth.
- `jobs` remains generic task-control truth.
- User telemetry remains non-authoritative product evidence.
- A future program-observability system will remain passive evidence.
- Removing pseudo-observability may reduce current convenience, but it may not
  change business, Job, provider or reconciliation behavior.
- A clean baseline is not an observability-complete claim.

## Entry Facts

- Repository-owned SLS coupling exists in Backend FC configuration, deploy
  workflow variables, environment validation and deployment documentation.
- No checked-in SLS query definition was found. Saved SLS queries, dashboards
  or alerts are external state and cannot be inferred from this repository.
- Production runtime paths include Hono request logging, structured JSON
  callback-router output, Commerce debug headers/output, OAuth/WeCom
  diagnostics and other ad-hoc console calls.
- Durable deployment documentation already says console JSON and FC capture
  are not a governed observability implementation, but it still describes the
  configured SLS path as an available runtime signal.
- `operation_logs` is a separate SQL diagnostic/audit-shaped mechanism: 25
  production writers, no external query call site, fire-and-forget writes and
  swallowed failures. Its retirement required a separate data/audit decision;
  Sir has now explicitly approved forward retirement.
- `notification_deliveries` is inert historical compatibility. Because Phase
  7 no longer implements its professional replacement, it remains for the
  future observability/data-retention task.
- User telemetry already has a Backend Event Registry, accepted/rejected
  ledgers and several fact views, but Web owns duplicate names, PR Discovery
  reads raw payloads and backend-confirmed recording can convert a successful
  business mutation into an HTTP failure.

See [`evidence-index.md`](./evidence-index.md) and
[`01-entry-topology-and-decisions/`](./01-entry-topology-and-decisions/).

## Ratified Retirement Decisions

Sir has ratified:

1. existing SLS queries and structured output are historical convenience, not
   the target observability model;
2. they should be deleted to establish a clean baseline; and
3. future program observability should be professional and long-lived, not an
   incremental formalization of the legacy path;
4. remove repository SLS coupling completely: `s.yaml` log configuration,
   deploy variables, validation and durable claims;
5. close external saved SLS state without inventing evidence: Sir confirms
   there are no configured queries/dashboards and no further platform cleanup
   is required for this Phase;
6. remove production-runtime request/debug/structured diagnostic output while
   retaining CLI/migration/test-runner terminal output that is not application
   observability;
7. retire `operation_logs`, its production writers/guidance and SQL table
   through a forward migration; and
8. keep the future professional observability implementation outside this
   Phase 7 execution packet, carrying requirements and clean-baseline proof
   only.

External SLS access may remain an honest `7-2` exit blocker; it no longer
blocks local source execution.

## Corrected Slice Order

| Slice | State | Responsibility | Depends on |
| --- | --- | --- | --- |
| `7-0` | Complete, read-only and corrected | negative-baseline inventory, current/target topology, user correction and re-slicing | Phase 6 local exit |
| `7-1` | Complete | exact legacy deletion boundary, external SLS state, operation-log retirement and future-task handoff | `7-0` |
| `7-2` | Complete | remove repository SLS coupling and production pseudo-observability; prove a deployable clean baseline without replacement | ratified `7-1` + explicit start |
| `7-3` | Complete | Event Registry SSoT, canonical Web type contract, collection/transport separation and non-authoritative backend recorder | complete `7-2` + explicit Phase start |
| `7-4` | Complete | `7-4A` contract freeze; `7-4B` PR Discovery fact cut-over; `7-4C` API/query convergence; `7-4D` Web Analytics owner; `7-4E` cross-unit proof | stable compiling `7-3` contract + explicit Phase start; 31-day range ratified |
| `7-5` | Complete | Phase review, durable truth reconciliation and clean handoff to future professional program observability | complete `7-4` |

The dependency graph, exact inputs and cheapest credible verification live in
[`slice-map.md`](./slice-map.md). Every slice owns a sub-folder and a
pre-execution rehearsal.

## Exit Shape

Phase 7 may exit only when:

- repository FC/SLS application-log coupling and its environment plumbing are
  gone;
- `operation_logs`, its writers and stale durable/local guidance are
  forward-retired;
- no checked-in SLS query/dashboard/alert remains; Sir confirms no configured
  saved query/dashboard exists and closes further platform inventory;
- production pseudo-observability selected by `7-1` is removed, not translated
  one-for-one;
- durable docs truthfully state that professional program observability is not
  yet implemented;
- the future task receives requirements for HTTP/tick, Job attempt,
  Notification/provider, correlation, privacy, retention, access, alerts and
  recovery without inheriting a transport/vendor design;
- one Backend Event Registry owns user-event name/version/schema;
- telemetry failure cannot change a successful command result;
- production BI readers use facts or authoritative business data rather than
  arbitrary raw telemetry payload; and
- canonical local gates pass on the final Phase revision.

All exit conditions are closed. See
[`06-phase-review-and-o11y-handoff/verification-log.md`](./06-phase-review-and-o11y-handoff/verification-log.md).
D7-04 records operator evidence/decision; it does not claim that Codex ran a
platform-side deletion or environment audit.

## Non-Goals

- Building the replacement program-observability backend in this Phase.
- Preserving SLS/structured-output compatibility “temporarily”.
- Treating a silent runtime as observability-complete.
- Deleting CLI, migration, test-runner or development terminal output merely
  because it uses `console.*`.
- Making user telemetry a replacement for program observability.
- Dropping `notification_deliveries` without a professional replacement and
  data-retention decision.
- Guessing undefined BI formulas or consent behavior.
