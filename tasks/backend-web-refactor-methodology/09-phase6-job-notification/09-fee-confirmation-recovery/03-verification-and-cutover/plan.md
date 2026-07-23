# `6-4d` Plan

1. Run the settlement/Job atomicity and all-zero fixture matrix.
2. Run handler success, transient retry, retry exhaustion/permanent failure and
   stale/missing-binding tests.
3. Prove duplicate callbacks create no duplicate Job and never replay Bill
   settlement.
4. Remove the old synchronous consequence and assert zero remaining
   Trade-facing fee-confirmation references.
5. Verify the forward migration leaves historic settled rows unchanged.
6. Run focused scenario/static gates, then promote only verified current truth.

## Cheapest Credible Verification

One transaction failure/concurrency matrix, one fake-provider handler matrix,
and one migration fixture. No live provider request or production inventory is
required.
