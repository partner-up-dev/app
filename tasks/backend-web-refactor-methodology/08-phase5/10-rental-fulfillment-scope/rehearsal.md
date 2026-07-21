# Scope-Replacement Rehearsal

| Branch | Expected result | Abort condition |
| --- | --- | --- |
| new Rental Placement under R0 | no customer ordering entry is offered | a user can still obtain a valid Rental quote through another public path |
| direct new Rental listing/create/payment/booking under R0 | backend rejects without creating Order, Bill, quote, provider, or booking side effect | UI hiding is the only guard |
| former Admin/customer fulfillment action | route/action is removed or returns the stable retired result | a public mock or admin mutation can still progress a Rental state |
| schema/migration cleanup request | deferred to a separately authorised data-reclamation slice | runtime retirement silently drops schema/history |
| RideHailing 5-2 | D1, quote, PR admission, and unpaid guard proof remain intact | Rental retirement causes a shared Commerce entry regression |

## Legacy source and test closure rehearsal

| Mutation | Expected result | Protected boundary / abort condition |
| --- | --- | --- |
| remove `createRentalOrder` and its private selection/create helpers from `create-order.ts` | the Trade public barrel no longer exports a callable Rental creator; `createOrderCommand` keeps the early stable 410 guard | abort if a production consumer still calls the removed symbol, or if RideHailing order creation loses a shared helper |
| replace backend active-Rental persistence scenarios | one quote-backed command proves retirement with zero Order/Bill/RentalOrder writes; one repository-seeded historical row proves retained read compatibility | do not recreate a test-only production service; fixture writes must stay local to the scenario |
| replace active-Rental browser journeys | the former suite proves that an active Rental Placement is absent from PR ordering entry | do not edit Web behavior or weaken the existing HTTP retirement proof |
| replace the Payment provider Rental fixture | Payment SSoT uses a neutral surviving-family Trade Order plus Bill/BillLine seed | abort if Payment behavior starts depending on Ride fulfillment/provider state |
| schema and repository retention | `rental_orders` and repository reads remain unchanged | no migration, schema deletion, or historical data mutation |

### Dependency conclusion

The old Rental functions are not runtime dependencies: both quote product type `RENTAL` and fixed quote items are
rejected before selection or creation. Their only direct consumers are the legacy scenario tests covered above.
`createBaseOrder`, billing eligibility, and RideHailing creation remain shared/surviving code and are not part of the
deletion set.
