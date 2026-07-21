# Impact On 5-2

With R0 selected, `5-2` is RideHailing-focused:

- D1 is implemented as a backend-authored entry outcome: creator/no-order may enter ordering; any participant with
  an existing matching order may open it; non-creator/no-order never enters `/order/new`.
- Quote remains a freshness/authorization token. Its reuse/reservation semantics and create-attempt idempotency are
  separately solidified before implementation.
- PR-owned attachment uses a concurrency-safe mechanism for the `(prId, offerId)` non-terminal invariant.
- Bill-owned unpaid-obligation eligibility remains a pre-create guard.
- Rental listing, fixed quote, order, payment, fulfillment, cancellation, refund, and mock confirmation are not used
  as proof for this slice. Their runtime removal belongs to `5-4`.

R0 deliberately does not ask `5-2` to delete Rental code: both would otherwise edit the create-order/entry surface
at once and obscure whether an admission proof failed because of a boundary change or a retirement change.
