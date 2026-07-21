# 5-3 Implementation Decision

## Authoritative Split

- **Bill** owns the payable target, BillLine execution slot, and the exact
  settlement transition for an obligation line.
- **Payment** owns provider selection, provider protocol/codec, prepay action,
  and provider observation. It never treats a browser callback as settlement.
- **Trade** owns the order visibility/payment-window projection consumed by
  Bill and owns the post-Bill-settlement command.
- **Web Payment** owns a session-scoped hint that asks the backend to resume a
  particular temporary PaymentTx projection. The hint carries no status or
  settlement claim.

## Chosen Cut

1. Introduce category-named public entrypoints only for the consumers in this
   slice; leave unrelated wildcard compatibility roots in place.
2. Replace Payment's raw `BillLineRepository` operations with Bill execution
   commands and snapshots.
3. Make settlement require the exact `(providerInstanceId, attemptCount)`
   currently bound to the BillLine. A stale provider observation cannot mutate
   the newer attempt.
4. Persist a same-session `billLineId -> paymentTxId` resume hint before a
   client action. On a later Checkout mount, fetch the PaymentTx and let only
   backend status select success, terminal retry, or further reconciliation.

## Deliberate Boundary

This slice does not introduce a persistent PaymentTx row or cross-device
return correlation. A provider return is recoverable when it re-enters the
same browser session and Checkout route; a wider provider-return contract is
outside the existing H5/non-SDK non-goal.
