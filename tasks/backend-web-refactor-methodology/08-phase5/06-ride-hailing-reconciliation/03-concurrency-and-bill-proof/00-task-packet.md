# 5-5.3 Concurrency, Final-Bill, And Correction Boundary

## Status

**Complete.** This proof subtask establishes the durable part of reconciliation, not a new refund or operator
workflow. Focused sync characterization plus complete backend/system scenarios pass.

## Required Invariants

- a stale observation cannot move an execution snapshot backward;
- cancellation, callback, and browser observation all use the same reconcile semantics before a destructive action;
- `finalSettlementInput` is written once from an authoritative provider final-fare query;
- exactly one Bill target exists for a source Order, including concurrent terminal triggers;
- later provider fare disagreement is reported as correction-required / observable state, never silently rewrites a
  settled Bill or creates a refund.

## Verification Matrix

| Case | Cheapest credible proof |
| --- | --- |
| delayed callback after browser poll | fake provider + real DB, assert phase remains monotonic |
| duplicate terminal callbacks | same scenario, assert one final input and one Bill |
| final fare missing then later available | fake provider: no Bill first, one Bill after later reconcile |
| provider-detail failure | callback/reconcile returns controlled error; no snapshot/Bill mutation |
| cancellation / callback overlap | one cancel claim; no duplicate provider cancellation; final status is non-regressive |
| fare correction after Bill | focused test records non-mutating correction-needed result |

## Explicit Non-Goals

No adjustment allocation, refund execution, generic retry scheduler, provider outbox, or historical financial rewrite
is introduced here. Those require the D3 product policy slice.
