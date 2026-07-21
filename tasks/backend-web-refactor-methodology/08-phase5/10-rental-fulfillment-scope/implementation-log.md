# R0 implementation log

## Runtime cutoff

- Rental offer listing now returns the stable `410 RENTAL_RUNTIME_RETIRED` problem before quote/session writes.
- Direct create-order calls backed by a Rental quote are rejected before Order/Bill/RentalOrder creation.
- Rental cancellation, customer mock booking confirmation, Admin booking decisions, cancellation decisions, and entry guidance no longer mutate fulfillment state.
- Prepaid bill settlement now rejects Rental before the legacy Trade-to-Fulfillment consequence can read or activate booking state.
- Active Rental placements are excluded from matching; stale ordering handoffs render a retired placeholder in Web.
- Customer mock-booking action and Admin Rental fulfillment mutation controls are removed/hidden. Historical fulfillment records remain readable.
- No payment files, RideHailing flow, schema, migration, or historical data were changed.

## Verification

- `pnpm exec vitest run --config vitest.backend.config.ts --project backend-unit apps/backend/src/lib/rental-runtime-retirement.test.ts` — passed (1 test).
- Targeted Oxlint over changed backend/Web files — passed.
- At the initial runtime-cutoff checkpoint, backend/Web type checks were blocked by then-in-flight Phase 5-2
  RideHailing edits. The closure checkpoint below supersedes that observation for backend type checking.

## Legacy source and test closure

- Removed the public `createRentalOrder` API and `CreateRentalOrderInput` from `create-order.ts` together with the
  now-unreachable Rental selection, validation, item-snapshot, timeout, typed-row, and billing helpers. The public
  `createOrderCommand` still accepts a legacy Rental/FIXED quote shape only to return the stable retirement problem
  before PR, Order, Bill, RentalOrder, or create-attempt writes.
- Replaced the backend active-Rental persistence suite with two non-skipped contracts: quote-backed create is 410
  with no writes, while a repository-seeded historical Rental Order remains readable through the real Order Detail
  HTTP route. Schema, repositories, and historical projections remain intact.
- Replaced nine active-Rental browser journeys with one retirement journey proving that even a valid ACTIVE Rental
  Placement is absent from the PR action surface.
- Replaced the Payment provider suite's Rental creator fixture with a Payment-owned Ride-family Trade Order,
  RideHailing typed row, Bill, and BillLine seed. It does not invoke Ride provider/fulfillment behavior and keeps the
  PaymentTx assertions independent of retired Rental creation.
- The first browser fixture rehearsal was rejected before rendering because Rental Placement creation still requires
  `participantCount`, `serviceStartAt`, and `serviceEndAt` bindings. Adding the valid historical bindings made the
  intended match-time retirement assertion pass; production behavior was unchanged.

### Closure verification

| Command | Result |
| --- | --- |
| `pnpm check:type:backend` | pass |
| `pnpm check:lint:backend` | blocked only by two pre-existing/in-flight `vi.fn` type-parameter errors in `ride-hailing-ordering-flow.test.ts` |
| scoped Oxlint over the four changed TypeScript files | pass |
| backend `rental-order-persistence.scenario.test.ts` | pass — 2 tests |
| backend `payment-provider-ssot.scenario.test.ts` | pass — 1 test |
| system `rental-ordering.scenario.test.ts` | pass — 1 test |
| system `rental-runtime-retirement.scenario.test.ts` | pass — 1 test |
| selected `commerce_ride_hailing_ordering_reaches_order_detail_for_active_pr` | pass — 1 selected, 8 skipped |
| scoped `git diff --check` | pass |
