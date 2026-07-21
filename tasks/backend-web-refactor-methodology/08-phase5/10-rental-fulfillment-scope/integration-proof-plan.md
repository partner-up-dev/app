# Rental Runtime Retirement Integration Proof Plan

## Status

**Complete.** Production retirement source remained read-only. One focused
system scenario now proves the HTTP cut-off and task-local verification records
the active Ride boundary plus the legacy Rental-suite conflict.

## Objective

Prove the R0 cut-off at real HTTP ingress rather than by calling the retirement
helper directly:

1. Rental offer listing returns the stable `410 RENTAL_RUNTIME_RETIRED` problem
   before creating a quote.
2. Direct create-order backed by a valid, fixture-seeded Rental quote returns
   the same problem before creating an Order, Bill, RentalOrder, create attempt,
   or provider effect.
3. Former customer and Admin Rental fulfillment writes return the same problem
   without creating or mutating fulfillment state.

## Protected Boundaries

- Do not modify Rental production source.
- Do not restore an active Rental quote/order/fulfillment behavior for a test.
- Do not modify Ride, Placement, Payment, or durable documentation.
- Preserve the shared dirty worktree and do not stage or commit.
- Treat fixture-seeded catalog/quote rows only as setup; take the side-effect
  baseline after required seeds so they cannot be mistaken for runtime writes.
- Existing active-Rental browser scenarios are legacy compatibility evidence,
  not the new runtime contract; report them separately rather than rewriting
  them in this slice.

## Observable Effect Snapshot

The focused scenario will compare before/after values for:

- Commerce quote count around the listing request;
- Trade Order, Bill, RentalOrder, and CreateOrderAttempt counts around all
  rejected requests;
- fake WeChatPay transaction/refund counts;
- fake Caocao provider order/create-request/fee-confirm counts.

## Low-Cost Verification

1. Run only the new Rental retirement system scenario.
2. Run the existing selected Ride ordering/Checkout scenario as the active
   Commerce regression boundary.
3. Run scoped lint for the new TypeScript scenario and scoped diff check.
4. Reuse root scenario compilation/runtime as the meaningful type boundary;
   run backend type only if the new test exposes an imported contract mismatch.
5. Optionally run one legacy Rental scenario to characterize the expected
   active-Rental compatibility failure; do not count it as a retirement defect.

## Completion Criteria

- all tested HTTP surfaces return status 410, code
  `RENTAL_RUNTIME_RETIRED`, and the stable problem type;
- listing creates zero quotes;
- create/fulfillment attempts add zero Order/Bill/RentalOrder/create-attempt
  rows and produce zero provider state delta;
- the selected Ride scenario remains green;
- the legacy active-Rental suite conflict is explicitly recorded.
