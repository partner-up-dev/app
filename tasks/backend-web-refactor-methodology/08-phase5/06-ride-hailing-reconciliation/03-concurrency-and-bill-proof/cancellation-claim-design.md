# Cancellation Claim Rehearsal

## Confirmed Gap

The current cancellation flow reconciles, then calls the provider, and only afterwards appends/persists its Trade
termination attempt. Two concurrent cancel requests can therefore both reach the provider. The old Order Detail
read-triggered sync hid this gap rather than establishing a cancellation claim.

## Owner And Boundary

| Fact / decision | Owner | Required operation |
| --- | --- | --- |
| whether a cancellation may start | Trade termination attempt | short transaction that locks the Trade order, then the Ride row, and persists one pending attempt |
| provider cancellation request | RideHailing provider port | remote call after the claim transaction; no database lock spans it |
| observed provider cancellation | RideHailing reconciliation | same locked Trade/Ride transition may approve the pending Trade attempt |
| final local termination state | Trade + Ride projection | short completion transaction, conditional on the owned claim |

## Intended Sequence

```text
viewer cancel
  -> explicit reconcile (provider read; no held DB lock)
  -> Trade/Ride claim transaction (lock order then Ride; append PENDING attempt)
  -> provider cancel request (no DB lock)
  -> completion transaction (same lock order; approve claim and set Ride CANCELLED)

callback during provider cancel
  -> explicit reconcile
  -> same Trade/Ride lock order; approves the existing PENDING claim
  -> later local completion observes already-approved terminal state, never repeats provider cancel
```

## Mental Rehearsal

| Branch | Expected result | Must not happen |
| --- | --- | --- |
| two browser cancel requests | first persists one pending claim; second receives controlled conflict before provider I/O | two `cancelRide` calls |
| callback arrives after claim, before provider response | callback reconciles/approves the existing claim; completion is idempotent | a synthetic second termination attempt or phase regression |
| provider cancel transport failure | owned pending claim is denied/released in a short transaction; user may explicitly retry later | permanently stuck pending attempt or blind automatic retry |
| provider detail says terminal before claim | preflight rejects local cancellation | provider cancel after terminal observation |
| delayed active observation after cancellation | monotonic Ride rule preserves `CANCELLED` | active phase rewrites terminal state |

## Low-Cost Proof

1. Real-DB fake-CaoCao scenario with two concurrent cancel HTTP requests and a provider cancel counter: exactly one
   provider cancel request and one terminal attempt/state.
2. Scenario branch where callback closure is injected after the durable claim but before cancel completion; assert one
   terminal order/Ride state and no second provider request.
3. Focused pure termination-service tests remain the vocabulary proof; no transaction is held across fake-provider
   I/O. The existing Ride scenario remains the broader regression boundary.
