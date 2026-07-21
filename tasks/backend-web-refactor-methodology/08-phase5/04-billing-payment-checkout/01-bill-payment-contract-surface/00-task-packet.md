# 5-3.1 Bill–Payment Contract Surface

## Status

**Complete.** Bill exposes checkout/execution queries and commands; Payment consumes those surfaces. Trade exposes
only the checkout billing projection and post-settlement command needed by this flow.

## Objective

Make the real Checkout consumers use curated Bill queries/commands and the
one Trade query/command required by the flow. Do not create a shared
`commerce` facade or promote repositories/entities as contracts.

## Inputs Needed

- Checkout target's viewer authorization, order status, and unpaid window.
- BillLine amount, label, provider binding, attempt count, and settled state.
- Trade's post-Bill-settlement command.

## Exit

Payment has no direct BillLine repository dependency in the Checkout flow;
controllers use category surfaces; compatibility roots remain only where
unmigrated consumers still require them. `create-refund-execution` is a separate
refund path and remains intentionally outside this Checkout cut.
