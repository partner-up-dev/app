# 5-3 Exit Evidence

## Owner Cutover

```text
Checkout controller ──> Bill query ──> Trade billing query
Payment charge/poll ──> Bill execution query/commands
Payment callback ─────> Bill settlement command ──> Trade settlement command
Web Checkout ─────────> opaque session lookup ──> PaymentTx reconciliation
```

- `BillLinePaymentExecutionSnapshot` is a Bill projection, not a persistence
  row exported for Payment convenience.
- Bill owns opening, clearing, and settling an execution slot. The settlement
  compare-and-set requires the exact active provider instance and attempt.
- Payment owns provider codec, prepay, poll, and verified callback handling.
  It calls the Trade consequence only after Bill reports a newly settled
  transition.
- Web persists only `billLineId → paymentTxId` in session storage. It retains
  no status, provider result, or Bill settlement assertion.

## Compatibility Disposition

The two core deep-import rows assigned to 5-3 are resolved in the Phase 5
[compatibility ledger](../02-commerce-authority-and-idempotency-matrix/compatibility-ledger.md).
The broader Bill Detail raw-Trade read and Payment refund persistence edge are
not silently reclassified as complete; they remain later compatibility work.

## Deliberate Recovery Boundary

The post-settlement Trade consequence remains synchronous and has no durable
outbox. Exact Bill transition semantics prevent a duplicate immediate
consequence under callback/poll concurrency, but this slice does not claim
exactly-once downstream delivery across a process crash after the Bill
transition.
