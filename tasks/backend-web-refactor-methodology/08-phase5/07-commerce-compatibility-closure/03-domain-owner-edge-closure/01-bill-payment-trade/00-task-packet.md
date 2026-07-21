# 5-6A.3.1 Bill, Payment, And Trade Owner Edges

## Status

**Complete.** This is deliberately independent of the RideHailing provider-port cut: it moved Bill
materialisation/payment-state facts and the retained Rental payment command without changing provider I/O or
RideHailing lifecycle semantics. The later Rental runtime cut keeps historical compatibility but denies new flow
traffic.

## Files / Ownership

- Bill owns the category surfaces in `domains/bill/{commands,queries}.ts`.
- Payment owns `domains/payment/commands.ts`.
- Trade owns `domains/trade/queries.ts` for the item-name projection.
- Consumers are limited to Bill Detail, Ride final-settlement consequence, Trade bill settlement/detail, and retained
  Rental termination code.

## Chosen Classification

| Symbol / fact | Owner surface | Reason |
| --- | --- | --- |
| create one Bill from a charge allocation | Bill Command | it creates Bill and BillLine truth; its current `Seed` name must not imply a test-only seam |
| derive Bill payment state from BillLines | Bill canonical Query/projection | it reads only Bill-owned input and returns a reusable payment-state projection |
| reconcile a retained Rental Bill target | Bill Command | it creates adjustment/refund lines; this does not introduce a new Ride correction policy |
| execute a retained refund BillLine | Payment Command | provider money movement is Payment-owned |
| render an Order item name | Trade canonical Query/projection | Bill must not derive Trade item semantics itself |

## Rehearsal / Boundaries

See [`rehearsal.md`](./rehearsal.md). In particular, the Ride final-Bill command remains idempotent and the Rental
retirement guards remain untouched; category migration must not accidentally make a future correction/refund flow
appear product-supported.

## Cheapest Credible Verification

1. AST root-import count for these five symbols decreases to zero outside owner internals.
2. Backend typecheck and scoped Oxlint pass.
3. Run the cancelled-terminal Ride callback scenario and Rental historical-read scenario; the former proves final
   Bill materialisation and the latter proves retained historical projection.
