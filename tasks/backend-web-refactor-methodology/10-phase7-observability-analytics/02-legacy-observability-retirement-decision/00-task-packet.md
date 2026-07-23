# `7-1` — Legacy Observability Retirement Decision

## Status

**Complete. Source remains unstarted until Sir explicitly starts `7-2`.**

Sir has ratified the deletion boundary: SLS queries and structured output are
legacy errors; repository SLS coupling and production pseudo-observability are
deleted while CLI/dev/test output is retained; `operation_logs` is
forward-retired; the professional replacement remains a separate future task.

## Planned Work

1. Classify every candidate as:
   - delete in `7-2`;
   - retain because it is CLI/dev/test UX rather than application
     observability;
   - decide separately because it carries data/audit/behavior semantics; or
   - external state requiring authorized platform evidence.
2. Ratify repository FC/SLS configuration and environment-plumbing deletion.
3. Ratify production-runtime diagnostic output scope.
4. Decide `operation_logs` retention/retirement independently.
5. Record external SLS saved-query/dashboard/alert cleanup responsibility.
6. Confirm that professional replacement implementation is a separate future
   task.

## Outputs

- Ratified decision log.
- Complete reference ledger consumed by `7-2`.
- External cleanup checklist.
- Explicit future program-observability requirement handoff boundary.

## Exit Gate

The architectural branches are closed. `7-2` still freezes an exact
current-HEAD path ledger before mutation and may record inaccessible external
SLS state as a blocker.

## Cheapest Credible Verification

- Reference and import search against the then-current `HEAD`.
- Decision consistency review against deployment and authority docs.
- No build/test: no executable behavior changes in `7-1`.
