# Rental Fulfillment Scope Contraction

## Status

**Implemented and locally proven; durable promotion remains pending.** Sir reports that production has no Rental
orders and directs a clean cut-off. The selected scope is a forward-only runtime retirement: stop all new Rental
traffic rather than retaining an order/payment path without a fulfillment policy. Runtime entry points now enforce
the stable retirement result; schema and historical read compatibility remain deliberately retained.

## Objective

Remove undefined Rental fulfillment from the active product/runtime topology without smuggling a customer-visible
mock into a permanent contract or creating a paid-without-service path.

## Decision Boundary

The selected scope is **R0: runtime clean cut-off** in [`options.md`](./options.md): no new Rental Placement,
listing, quote, order, payment, booking, cancellation, or guidance operation remains reachable. No production Rental
order is reported, so a historical runtime read/placeholder path is not part of the delivery requirement. Physical
schema/migration deletion is still out of scope until a separate data-reclamation decision.

## Guardrails

- A public route or Web action is a real consumer even if its name includes `mock`.
- Do not accept payment for a product that deliberately has no fulfillment policy.
- Do not infer physical data-retention authority from the reported absence of Rental orders.
- Do not turn a product retirement into an opportunistic physical schema deletion.

## Verification

- New Rental Placement/listing/create/payment/booking writes are rejected or absent.
- No Rental Order, Bill, provider request, or booking mutation can be created through direct HTTP input after the
  cut-off.
- RideHailing `5-2` admission proof remains independent of Rental fulfillment.

## Durable-Documentation Disposition

The selected product scope must update the PRD; its technical realization belongs in the Commerce TDD. Runtime
proof now exists, so promotion may state the active capability cut-off and retained historical data/schema boundary;
it must not imply physical data reclamation or invent a Rental refund policy.
