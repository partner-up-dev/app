# `dispatchBinding` Authority Audit

## Question

Does current source duplicate RideHailing provider-dispatch authority in Trade
choice-set resolution, or is the Phase 5 conflict row stale?

## Persisted Authority

`apps/backend/src/entities/ride-hailing-order.ts` declares the nullable JSONB
column `ride_hailing_orders.dispatch_binding` with the typed
`RideHailingDispatchBindingSnapshot`. No Trade Order field stores the provider
binding.

## Writers

There are two current write paths:

1. `domains/trade/use-cases/create-order.ts` materializes the binding after a
   provider create succeeds, including the provider instance, provider order
   and submitted candidates.
2. `domains/trade/use-cases/confirm-ride-create-attempt.ts` completes the same
   binding from the durable create-attempt seed plus a later provider
   confirmation after response uncertainty.

Both writes target the RideHailing execution row. Neither writes provider
identity into Trade choice-set resolution.

## Readers

- `domains/ride-hailing/use-cases/provider-execution-context.ts` validates the
  provider instance/order identity before provider execution.
- `domains/ride-hailing/adapters/ride-hailing-reconciliation-transaction.ts`
  validates the locked binding, resolves the provider-confirmed final
  candidate and guards final settlement.
- `domains/trade/use-cases/cancel-ride-hailing-order-from-order-detail.ts`
  consumes the synchronized binding for provider query/cancel.
- `domains/trade/use-cases/ride-hailing-ordering-flow.ts` projects the provider
  order ID into local order detail.
- `domains/admin-ride-hailing-management/use-cases/get-admin-ride-hailing-order-workspace.ts`
  projects the binding for operator inspection.

The reconciliation adapter reads the binding to choose the final candidate;
that later choice-set resolution is a result of the provider lifecycle, not a
second provider-binding store.

## Disposition

Current source and durable truth agree. Commit `171319de` already promoted the
same statement in `system-state-and-authority.md` and
`ecommerce-contracts.md`: RideHailing execution storage owns provider
dispatch binding; Trade choice-set resolution owns only the final
vehicle/quote.

`8-5` therefore changes no source, schema or durable wording for
`dispatchBinding`. It annotates the Phase 5 and `8-0` conflict rows as
historical/superseded while retaining their provenance.
