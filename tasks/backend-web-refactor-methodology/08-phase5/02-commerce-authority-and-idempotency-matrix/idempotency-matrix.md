# Current Idempotency And Recovery Matrix

| Flow | Current durable key / guard | Current gap or race | Later owner slice / required proof |
| --- | --- | --- | --- |
| Offer Listing / Quote | fresh quote UUIDs and listing sessions; TTL/active-offer/SKU/session validation | listing is intentionally repeatable; quote is not consumed and repeated submit is not separately idempotent | 5-2 must state reusable-quote versus reservation semantics and prove duplicate submit behavior |
| PR-attached create order | `attachOrderToPr` checks current PR `orders[]` for active matching Offer; order/bill IDs are independent | read-then-append has no concurrent unique guard; provider-create unknown outcome has no full recovery contract | 5-2 must make the one-active-order invariant concurrency-safe and establish command idempotency/recovery |
| initial Bill / charge lines | `bills.source_order_id` is unique | bill-line materialization has no attempt/allocation uniqueness under concurrent reconciliation | 5-2/5-4 must prove transaction/retry behavior |
| Payment charge | canonical tuple `(kind, billLineId, providerInstanceId, attemptCount)`; BillLine slot claim, monotonic attempt count, and exact active-tuple settlement compare-and-set | durable recovery after provider-prepay response loss and a process crash after Bill settlement has no outbox | 5-3 complete: focused stale/retry proof and callback-backed browser proof; keep the remaining recovery boundary for 5-7/phase review |
| Payment refund | deterministic refund reference plus line slot / settled checks | provider create-refund unknown outcome has no polling or job recovery policy | 5-4 must decide query/retry/release-slot recovery |
| Rental termination | JSON `terminationAttempts[]` and state-machine checks | read-modify-write lacks compare-and-set; concurrent requests can compete or overwrite | 5-4 must define attempt identity and persistence-safe exactly-once/at-most-once semantics |
| RideHailing provider sync | provider binding, signature/callback-info checks, final settlement input, unique `bills.source_order_id` | old provider observation can overwrite newer local state; terminal race may surface unique conflict rather than idempotent result; no correction path yet | 5-5 must add monotonic observation/consequence semantics and implement D3 |

## Ratified Reading Of Existing Contract

- A Quote is a freshness and authorization token, not implicitly a one-time
  reservation. Reuse is therefore not prohibited by current durable truth.
- The PRD's “at most one non-terminal order for one PR/Offer” is a product
  invariant, so its later implementation must hold under concurrent requests;
  a read-only guard is not sufficient proof.
- Payment's canonical tuple already has the intended meaning. `PaymentTx` and
  the provider merchant reference remain projections of it.

## New Implementation Decision Gates

These are not yet durable Current behavior:

1. create-order idempotency key, result-retention window, and provider-create
   unknown-outcome reconciliation;
2. concurrency mechanism for the PR/Offer active-order invariant;
3. Rental termination attempt identity and concurrent finalize behavior;
4. refund unknown-outcome recovery;
5. RideHailing provider-observation monotonicity and terminal-race handling;
6. D3's compensating adjustment/refund command, key, and user-visible read.

No later slice may quietly decide one of these inside a large refactor.
