# Implementation Evidence After Realignment

Updated after the execution slice.

## Backend Command Boundary

Current backend exposes:

- `GET /api/commerce/ordering/from-placement`
- `POST /api/commerce/ordering/rental/evaluate`
- `POST /api/commerce/ordering/ride-hailing/evaluate`
- `POST /api/commerce/orders/rental`
- `POST /api/commerce/orders/ride-hailing`

The create routes now call Order-owned command use cases:

- `createRentalOrderCommand`
- `createRideHailingOrderCommand`

Command payload uses:

- `offerId`
- optional `prId`
- user-editable `participants`
- selected SKU `items` as `{ skuId, quantity }`
- family `extraProperties`

Placement remains an entry and prefill surface. It is not part of the create
command identity.

## PR Attachment Boundary

For PR-scoped order creation, the local Order row, typed family row, Bill when
applicable, and `attachOrderToPr` run in the same transaction.

Order commands do not own a separate proactive PR status check for persistence.
PR authority validates attachability through `attachOrderToPr`; failure rolls
back the local order creation.

## Rental Creation And Execution

Rental write path:

1. resolve Offer and selected SKU
2. build persisted `trade_orders.items` from SKU snapshot plus quantity
3. create `trade_orders`
4. create `rental_orders`
5. create prepaid Bill and charge lines
6. attach order to PR in the same transaction
7. after successful prepaid settlement, Rental booking state is actionable on
   `rental_orders`

`rental_fulfillments` has been removed from target code and migration cleanup.
Rental execution fields live on `rental_orders`.

## RideHailing Creation And Callback

RideHailing write path:

1. resolve Offer and selected ride SKU
2. create local `trade_orders` in `INITIATING`
3. create `ride_hailing_orders` with provider instance binding and
   `executionPhase = INITIATING`
4. attach order to PR in the same local transaction
5. call provider `createRide`
6. on provider success, persist `providerOrderId`, set execution phase to
   `DISPATCHING`, and open the base Order
7. on provider hard failure, fail the base Order

Provider callback path:

1. load provider instance
2. parse provider callback and dynamic external order id
3. resolve local `RideHailingOrder`
4. persist provider order id, execution phase, driver snapshot, and vehicle
   snapshot
5. open the base Order if it is still `INITIATING`
6. when final amount is present, commit final settlement input and create the
   final Bill

`ride_hailing_fulfillments`, `providerCreationStatus`,
`providerExecutionRef`, and persisted provider external order id have been
removed from target code and migration cleanup.

## Bill Timing

Rental:

- Bill is created immediately during order creation.
- Bill lines are generated from frozen participants and pricing resolution.

RideHailing:

- no Bill is created at order creation.
- final Bill is created from committed provider final settlement input in the
  provider callback path.
- Order Detail no longer creates final Bill as a passive read side effect.
