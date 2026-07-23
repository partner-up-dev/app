# Phase 7 Corrected Slice Map

## Dependency Shape

```text
7-0 negative-baseline entry and correction                  Complete
  |
  v
7-1 exact retirement and handoff decisions                  Complete
  |
  v
7-2 legacy pseudo-observability retirement                  Complete
  |
  v
7-3 user-telemetry owner and failure convergence            Complete
  |
  v
7-4 BI projection and Web Analytics convergence             Complete
  |
  v
7-5 Phase review and future-O11y handoff                     Complete
```

The ordering deliberately establishes the clean program-runtime baseline
before refactoring adjacent telemetry. It does not smuggle a replacement
observability implementation into `7-2`.

## Slice Gates

| Slice | Information needed before edits | Cheapest credible verification |
| --- | --- | --- |
| `7-0` | repository/external SLS boundary, structured/debug output inventory, telemetry-to-BI topology and user's architectural correction | read-only searches, narrow source/durable inspection and citation sampling |
| `7-1` | exact SLS config/env deletion; production-runtime versus CLI output boundary; external saved-query access; `operation_logs` retirement; future task placement | decision consistency and complete reference ledger; no build/test |
| `7-2` | source/deploy/docs reference ledger; optionality of FC `logConfig`; external cleanup method; behavior-neutral replacement for injected callback logger tests if needed | zero-reference searches, deployment config/env validation, focused logger/debug tests, Backend/Web unit and scenario gates proportional to touched paths |
| `7-3` | registry SSoT shape; type-only Web projection; current collection behavior; rejection/retry semantics; backend-confirmed failure policy | registry/type exhaustiveness, collector/transport unit tests, ingest DB scenarios and committed-command telemetry-failure proof |
| `7-4` | frozen response/formula compatibility; typed Discovery fact schema; date-window limit; Web Analytics owner and route boundaries | per-subtask gates: parity fixtures; forward migration + real Postgres; API boundary matrix; focused Web tests; `/prd?spm` event-to-fact plus current-dashboard System journey |
| `7-5` | zero repository legacy surface; operator closure of external saved state; all Analytics gates; future O11y requirement handoff; durable promotion inventory | authority/reference audit plus canonical static, Backend/Web unit, Backend scenario and System scenario gates |

## Ordering Consequences

- `notification_deliveries` cannot be retired in Phase 7 because the
  professional replacement is deliberately not implemented here.
- `operation_logs` is explicitly approved for `7-2` forward retirement;
  absence of readers was supporting evidence, not the authorization.
- Sir confirms no configured saved SLS queries/dashboard exists and closes
  further platform inventory for this Phase; no unperformed audit or deletion
  is implied.
- Analytics work remains useful after the clean baseline because it is a
  separate evidence family, not a substitute observability implementation.
- `7-4` is internally ordered as `7-4A` contract freeze -> `7-4B` fact
  cut-over -> `7-4C` API/query convergence -> `7-4D` Web owner decomposition
  -> `7-4E` cross-unit proof. Its detailed packet lives under
  `05-bi-projection-web-convergence/`.
