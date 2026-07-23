# `7-0` Discussion Log

## 2026-07-23 — SLS / Structured-Output Correction

### Sir's Correction

The SLS queries and structured-output path currently visible are not a valid
observability model. They are historical convenience implementations and
should be deleted so a later professional, long-lived program-observability
task starts from a clean baseline.

### Root Reassessment

The original packet incorrectly reasoned from available platform capability to
target architecture:

```text
FC already ships output to SLS
  -> therefore formalize structured output behind a typed sink
```

That inference is invalid. Availability and low migration cost do not prove
long-term architectural fitness. It would preserve the legacy transport,
operational query shape and failure assumptions as compatibility constraints.

### Corrected Consequences

1. SLS-first and FC structured-output adapter proposals are withdrawn.
2. No SLS query/alert artifact will be added.
3. Repository SLS coupling and production structured/debug output become
   deletion inputs.
4. External saved SLS state is separately inventoried because the repository
   cannot prove it.
5. Phase 7 does not implement a replacement program-observability system.
6. Future requirements remain durable; implementation shape does not.
7. `notification_deliveries` retirement moves with the future professional
   replacement rather than being forced by Phase 7.

### Open Boundary Questions

- Whether `operation_logs` should be deleted in the same clean-baseline slice
  after confirming no historical audit-retention need.
- Whether all production runtime request/error console paths are included, or
  only explicitly structured/debug paths. Root recommends including
  production diagnostic paths while retaining CLI/dev/test output.
- Whether the future professional implementation remains outside this refactor
  program or receives a later separately authorized Phase packet. Root
  recommends a separate task rather than extending Phase 7.

## 2026-07-23 — D7-04 Operator Closure

Sir confirms that SLS has no configured saved queries or dashboards and
directs that no further platform-artifact inventory is required for Phase 7.
This closes D7-04 as operator evidence/decision. It does not claim that Codex
accessed SLS, deleted platform state, or verified the deployed FC revision.
