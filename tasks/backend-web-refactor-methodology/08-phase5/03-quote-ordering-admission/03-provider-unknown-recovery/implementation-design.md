# 5-2.3 Implementation Design — Provider Unknown Outcome

## Public Behavior

The selected safe behavior is `202 PROCESSING`, followed by the existing Order Detail route. The page states that the
provider is confirming the request, prevents a second create/payment/cancel action, and observes the durable local
projection. It does not fabricate a failure, retry, or another Ride create.

## Correlation And Callback Recovery

Before provider create, the Attempt persists Order ID, provider instance ID, and the expected CaoCao
`externalOrderId` derived from the Order UUID. If a signed callback arrives before a normal create response has bound
a provider order ID, callback handling uses that correlation to find the matching `SUBMITTING` attempt, validates
provider/external identity, binds the returned provider order ID idempotently, and then delegates to ordinary provider
observation reconciliation.

`callback_info` routes provider/environment only; it is not an order identity. A mismatch is a controlled conflict
and an operational signal, not a guess.

## Operational Default Pending Sir Confirmation

The recommended MVP policy is to retain visible `PROCESSING` until callback, later authoritative reconciliation, or
operator resolution. There is no timed automatic failure, cancellation, or retry because any of those may contradict
an already accepted provider order. This is the explicit at-most-once/liveness trade-off; it does not introduce an
outbox or automatic recovery system in this slice.

## Proof

- fake provider accepts, then transport response is lost; one external order exists and the browser receives
  `PROCESSING`;
- reload and repeat with the same key return the same Order Detail target without another create;
- callback binds an unbound attempt and subsequent detail/observation reaches the same Order;
- uncorrelated/mismatched callback cannot bind an attempt.
