# Current RideHailing Sequence

```mermaid
sequenceDiagram
  actor User
  participant Web as Ordering / Order Detail
  participant Trade as Trade create/order detail
  participant Ride as RideHailing persistence + sync
  participant CaoCao as Provider
  participant Bill as Bill / BillLine
  participant Payment as Payment / WeChatPay

  User->>Web: list candidates and submit quote-only order input
  Web->>Trade: POST create order
  Trade->>Trade: resolve CommerceQuote, PR, unpaid eligibility
  Trade->>Ride: create INITIATING Order and Ride row in transaction
  Trade->>CaoCao: create ride with candidate set
  alt provider response known
    CaoCao-->>Trade: providerOrderId
    Trade->>Ride: persist dispatch binding and execution projection
    Trade-->>Web: CREATED / orderId
  else provider accepted but response lost
    Trade-->>Web: target: durable PROCESSING, never blind retry
  end

  par callback trigger
    CaoCao->>Ride: signed callback -> provider-detail sync
  and controlled browser observation
    Web->>Ride: POST reconcile (bound active Ride only)
    Ride->>CaoCao: provider-detail sync
    Ride-->>Web: transient providerObservation + one active Detail invalidation
  and PROCESSING detail refresh
    Web->>Trade: GET order detail (pure local projection only)
  and cancel pre-sync trigger
    Web->>Trade: preview/cancel
    Trade->>Ride: provider-detail sync
  end
  Ride->>Ride: persist execution snapshot / terminal finalSettlementInput
  Ride->>Bill: first committed final settlement creates Bill target
  User->>Payment: start charge for BillLine
  Payment->>Bill: claim tuple (provider, attemptCount)
  Payment->>CaoCao: provider payment lifecycle
  CaoCao-->>Payment: notify or later query
  Payment->>Bill: tuple-checked settlement confirmation
```

## Evidence Anchors

- Create/listing: `apps/backend/src/controllers/commerce.controller.ts`,
  `domains/trade/use-cases/offer-listing.ts`, `domains/trade/use-cases/create-order.ts`, and
  `tests/scenario/commerce/ride-hailing-ordering.scenario.test.ts`.
- Detail/reconcile: `apps/web/src/domains/commerce/queries/useCommerce.ts`,
  `domains/commerce/queries/ride-hailing-reconciliation.ts`,
  `domains/trade/use-cases/ride-hailing-ordering-flow.ts`, and
  `domains/ride-hailing/use-cases/sync-ride-hailing-order-with-provider.ts`.
- Callback: `controllers/ride-hailing-provider.controller.ts`,
  `handle-caocao-order-status-callback.ts`, and
  `apps/backend/tests/ride-hailing/caocao-callback-route.scenario.test.ts`.
- Payment: `PaymentCheckoutFlow.vue`, `payment-contract.ts`, `payment-execution.ts`,
  `payment-notifications.ts`, and `payment-provider-ssot.scenario.test.ts`.

The sequence is current-source evidence. The provider response-loss branch is a durable `PROCESSING` posture; it
never triggers blind browser create retry and waits for callback/reconciliation or operator handling.
