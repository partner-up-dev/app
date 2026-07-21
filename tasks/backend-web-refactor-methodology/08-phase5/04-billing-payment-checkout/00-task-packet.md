# 5-3 Bill–Payment Checkout

## Status

**Complete — D2 is source-realized and verified.** Attempt identity is the canonical tuple
`(kind, billLineId, paymentProviderInstanceId, attemptCount)` with distinct backend and provider projections.
Bill owns the execution-slot transition; Payment owns provider observation; Checkout owns only a same-session lookup
hint and backend reconciliation.

## Objective

Converge the buyer-facing checkout path around Bill-owned target/settlement truth and Payment-owned provider
execution, without turning the payment client callback or transient `PaymentTx` into durable product truth.

## Bounded Plan

1. Replace Payment's raw BillLine/repository dependency with Bill-owned checkout/execution queries and commands;
   add only the Trade checkout query and settlement command needed by this flow.
2. Enforce exact provider-instance and attempt matching for a BillLine settlement transition. A superseded attempt
   must never settle a newer attempt.
3. Keep callback/poll as competing observations of one backend settlement transition; a browser client result remains
   only a reconciliation trigger.
4. Add a Payment-owned, session-scoped resume hint so a return or reload can re-query the canonical `PaymentTx`
   projection without turning browser storage into payment truth.
5. Prove the focused backend tuple/retry cases, Web resume state, and one existing Bill Detail → Checkout browser
   journey before recording compatibility progress.

## Non-Goals

No persisted `PaymentTx` mirror, no generic checkout domain, no H5/real-WeChat-SDK expansion, no provider
configuration redesign, and no broad Commerce barrel cleanup.

## Completion Result

- Payment Checkout now consumes Bill category queries/commands rather than raw BillLine persistence; Bill queries
  Trade only through its checkout projection, and settlement uses a Trade command surface.
- Exact provider-instance and attempt matching prevents an older observation from settling a newer attempt. The
  resulting `PAYMENT_ATTEMPT_SUPERSEDED` response is a recovery signal, not a payment result.
- Checkout saves only an opaque same-session `PaymentTx` lookup before client handoff and uses backend result to
  select success return, terminal retry, or explicit re-confirmation after a query error.
- Focused source inventory, unit/scenario proof, the existing callback-backed browser path, and durable-doc
  promotion are recorded in [exit evidence](./exit-evidence.md) and the
  [verification log](./verification-log.md).

## Executable Subtasks

- [`01-bill-payment-contract-surface/`](./01-bill-payment-contract-surface/) — curated owner surfaces and tuple
  boundary.
- [`02-provider-observation-settlement/`](./02-provider-observation-settlement/) — strict settlement transition,
  stale-attempt safety, and callback/poll proof.
- [`03-web-return-reconciliation/`](./03-web-return-reconciliation/) — session-scoped resume hint and Checkout
  state-machine behavior.
- [`04-proof-and-promotion/`](./04-proof-and-promotion/) — focused verification, ledger, and durable-doc promotion.
