# 5-2.3 Provider Unknown-Outcome Recovery

## Objective

Define the safe behavior when RideHailing provider create may have succeeded but its response is unavailable.

## Scope

- durable processing state/result rather than a blind retry;
- provider idempotency or query-by-external-id capability assessment for future automatic reconciliation;
- explicit user-visible processing path.

## Rehearsal And Proof

If the provider accepts a deterministic external order id and transport fails, a replay cannot create another ride.
The user receives a durable processing result until callback, later authoritative recovery, or support resolution
completes it. If the provider has neither idempotent create nor lookup capability, do not add automatic retry; record
only the automation gap, not a safety failure of the processing state.

## Gate

Sir selected durable processing with no blind retry. Provider capability evidence is required only before claiming
automatic reconciliation, not before implementing the safe processing result.

## Implementation Log — 2026-07-20

Status: implemented and directly rehearsed; automatic provider reconciliation is intentionally not claimed.

- A valid provider business rejection is terminal and persists `CANCELLED`; HTTP, transport, invalid-body, or
  missing-order-id outcomes after create submission persist no false failure and return the durable `PROCESSING`
  result for the claimed attempt/order.
- No timeout changes the attempt to failed, no client replay resubmits provider create, and no retry/cancel affordance
  is introduced for this processing state. The existing Order Detail `INITIATING` projection is the user-visible
  processing surface.
- The deterministic provider external id and pre-submit dispatch seed are stored before provider I/O. The callback
  handler invokes Trade's `confirmRideCreateAttemptFromProvider` seam before the existing provider sync path; it can
  recover the missing dispatch binding and atomically advance Attempt to `SUCCEEDED`, Ride to `DISPATCHING`, and
  Order to `OPEN`.
- Ordinary provider observation/sync behavior was not refactored for this task. Provider create, cancel, and local
  persistence remain at-most-once mutation boundaries; observation remains repeatable.
- Fake CaoCao supports a one-shot “accept create, drop response” control and exposes provider create call count.

Direct proof:

- The response-loss scenario proves the provider accepted one order, the command returned `PROCESSING`, exact replay
  did not issue a second create, callback confirmation recovered the Attempt, and the next replay returned the same
  terminal `CREATED` order while provider create count remained one.
- `commerce_create_order_attempt_recovers_binding_from_provider_confirmation` proves callback recovery is
  idempotent and reconstructs the binding from persisted correlation data.
- CaoCao adapter unit coverage distinguishes a valid provider rejection from an unknown HTTP create outcome; fake
  provider unit coverage proves accept-then-503 behavior and call-count observability.

Remaining evidence boundary: no production-provider lookup-by-external-id or provider-side idempotent-create claim
is made. Such evidence is required before adding automatic create reconciliation, but not for the current safe
durable processing state.
