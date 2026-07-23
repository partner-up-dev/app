# `6-4c` Plan

1. Remove the Trade-facing `confirmFee` edge and expose the smallest
   RideHailing-internal operation.
2. Assert that the CaoCao adapter serializes `order_id` and omits both optional
   allowance fields.
3. Register a versioned Job whose payload contains stable local identifiers;
   reload the current order/provider binding before I/O.
4. Map success and failures to generic Job dispositions.
5. Prove success, retry, exhausted retry/permanent failure, stale payload and
   missing-binding behavior.

## Cheapest Credible Verification

Start with captured-fetch adapter tests and fake-server tests, then one handler
disposition suite. No live provider mutation is needed.
