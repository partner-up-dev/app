# 5-4 Rental Runtime Retirement

## Status

**Complete.** Sir reports that production has no Rental orders and directs a clean cut-off. This replaces the former
Trade–Fulfillment termination-feature proposal. The runtime boundary rejects new Rental
listing/order/fulfillment/payment-consequence traffic with one stable `410` problem, while schema and historical
read data remain intact. Focused retirement proof, the complete backend scenario suite, and the system scenario
suite agree. Its implementation record lives in
[`10-rental-fulfillment-scope/implementation-log.md`](../10-rental-fulfillment-scope/implementation-log.md).

## Objective

Retire the undefined Rental runtime capability cleanly: no new Placement, listing, quote, Order, Bill, payment,
booking, cancellation, or guidance flow may be reachable. This removes the Trade→Fulfillment Rental runtime edge
instead of designing a more elaborate fulfillment/termination model.

## Bounded Plan

1. Record the no-history operational assertion as evidence for runtime behavior only; do not infer data-retention
   authority from it.
2. Remove or reject every customer/Admin Rental write entry at the backend boundary, and remove corresponding Web
   entry points. UI hiding alone is insufficient.
3. Remove Rental booking, confirmation, rejection, cancellation, and guidance runtime paths, including the
   Trade→Fulfillment settlement/termination branch.
4. Remove Rental-only implementation artifacts only after a zero-consumer inventory. Retain schema/migrations unless
   a later data-reclamation slice has explicit authority.
5. Preserve RideHailing and generic Bill/Payment behavior; do not turn runtime retirement into a refund or generic
   order-history redesign.

## Non-Goals

Physical schema/migration deletion, a new Rental refund policy, historical data migration, generic refund redesign,
and Admin workspace redesign.

## Exit Evidence

- retained RideHailing ordering/Bill/payment journeys remain green after the completed 5-2/5-5 work;
- Rental runtime-retirement scenarios prove rejected writes have no Order/Bill/provider side effect while historical
  reads remain compatible;
- PRD/Product TDD now describe runtime retirement rather than an active Rental fulfillment journey.
