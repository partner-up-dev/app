# Ride Fact-Authority Ledger

| Fact | Current authoritative writer / storage | Read or trigger paths | Current hazard | Target boundary to solidify |
| --- | --- | --- | --- | --- |
| CommerceQuote validity and snapshot | Offer Listing / `commerce_quotes` | listing cache; Trade create resolves quote | provider estimate is also called “quote” | only `CommerceQuote` authorizes create; provider estimate is nested observation |
| Trade Order and PR attachment | Trade / `trade_orders`, PR relation | create, detail, cancellation, Bill readers | provider create is coupled to local transaction; no durable unknown attempt | `CreateOrderAttempt` is distinct from the Trade contract/order |
| Ride dispatch binding | RideHailing / `ride_hailing_orders.dispatchBinding` | sync, cancel, final settlement | provider success before local commit; `providerOrderId` and `externalOrderId` are semantically ambiguous | explicit provider execution key and client correlation token contract |
| Execution phase, driver, vehicle | provider observation normalized into RideHailing durable projection | callback, detail poll, cancellation pre-sync, Order Detail | multiple triggers, unconditional local update, old observation can regress state | one reconciliation command with monotonic/conditional commit rule |
| Latest provider detail | provider system | detail API `live` projection, map | mixed with local durable fields under overlapping names | explicit non-authoritative `providerObservation` projection |
| Provider final fare | terminal provider query -> `finalSettlementInput` | final Bill consequence | conflated with buyer payment settlement; duplicate terminal sync races | `ProviderFinalSettlementObservation` commits once to a Bill target seed |
| Bill target and BillLine settlement | Bill / Bill, BillLine execution tuple | Bill detail, PaymentTx, checkout | terminology says “settlement” for two different facts | `BillTargetAmountSeed` and `BillLineSettlementConfirmation` stay distinct |
| Payment provider lifecycle | external payment provider | signed notify or provider query | browser return/cache hint can be mistaken for truth | BillLine tuple remains the one local payment-attempt identity |
| Cancellation fee preview | provider preview response | browser confirmation only | preview can stale before actual cancellation | preview is never a final-fare or settlement input |

## Source Facts That Must Not Be Lost

- Final Bill creation is deliberately based on committed terminal final-settlement input, not lazy detail rendering.
- Payment attempt tuple CAS already protects stale payment attempts; browser state is only a lookup hint.
- Callback route scenarios cover terminal, cancellation, settlement-miss, and provider-detail-query failure branches.
