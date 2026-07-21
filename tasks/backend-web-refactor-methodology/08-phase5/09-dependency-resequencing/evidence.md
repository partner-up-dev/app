# Dependency Evidence

## `5-4` Is Independent Of `5-2` Admission

The termination entry is an existing `orderId`, not a Placement, Quote, or create-order command:

1. `cancelRentalOrderFromOrderDetail` loads an existing Rental order, its persisted Rental facts, Bill lines, and
   payment state before it requests termination.
2. `finalizeRentalOrderTermination` reconciles the existing Bill to a target amount and triggers refunds only after
   its local transaction commits.
3. The direct verification fixture can seed the existing Rental order and Bill. It must not be presented as proof of
   the deferred D1 Placement path.

The remaining `5-4` gate is independent: the public customer route and UI currently expose
`mock-rental-booking-confirmation`, while the Admin Fulfillment route invokes the actual booking-confirmation command.
The mock's public/product classification must be decided before a safe cutover.

## `5-5` Is Independent Of `5-2` Admission

Both provider observation entry points converge on `syncRideHailingOrderWithProvider`:

- a CaoCao callback authenticates/routes, then queries provider order detail;
- Order Detail polling invokes the same synchronization command;
- terminal final settlement is separately queried and committed before the final Bill consequence.

This consumes an existing Trade order, RideHailing dispatch binding, and provider instance. `5-2` owns Quote intake,
PR admission, and pre-dispatch create-order concurrency; it is not a runtime precondition for reconciliation tests
that seed a valid existing order.

D3 is already ratified. The source gap is not product direction: current final-Bill creation no-ops when a Bill
already exists, so a later authoritative correction lacks the required compensating adjustment/refund path.

## Closure And External Evidence

`5-6` cannot be pulled forward. Its consumer inventory assigns two edges to `5-2`, one to `5-4`, and four to `5-5`;
removing exports earlier would turn an owner boundary into a false clean-up claim.

`5-7a` runtime topology evidence is source-independent but needs approved staging/provider smoke authority. `5-7b`
Phase review must wait for all local behavior slices, because an earlier callback smoke cannot prove a later
reconciliation implementation.
