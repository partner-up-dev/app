# Fulfillment Decoupling

## Objective & Hypothesis

Fix the fulfillment coupling where Trade directly hardcodes Rental fulfillment
creation after prepaid Bill settlement.

Hypothesis: Trade should decide whether an Order is eligible for a prepaid
settlement consequence, but the family-specific fulfillment consequence should
be owned and dispatched inside Fulfillment.

## Guardrails Touched

- Trade owns Order and Bill settlement eligibility.
- Fulfillment owns family-specific fulfillment materialization.
- Payment may trigger settlement convergence, but should not know
  family-specific fulfillment details.

## Target State

- `applyBillSettlementToOrder` no longer imports `createRentalFulfillment`.
- A Fulfillment use case handles `OrderFamily -> fulfillment consequence`
  dispatch.
- Rental still creates Rental Fulfillment after all prepaid charge lines settle.
- RideHailing currently has no prepaid-settlement fulfillment consequence,
  because its fulfillment is created during order initiation.

## Verification

- Existing Rental payment/fulfillment scenarios remain passing.
- Unit coverage proves the Fulfillment consequence dispatcher creates Rental
  fulfillment and no-ops for RideHailing.

## Result

- Implemented.
- Trade remains responsible for checking whether the Bill is fully paid and
  whether the Order is eligible.
- Fulfillment owns the family-specific settlement consequence dispatcher.
- `RENTAL` dispatches to Rental Fulfillment creation.
- `RIDE_HAILING` returns no prepaid-settlement consequence because RideHailing
  fulfillment is created during order initiation.
