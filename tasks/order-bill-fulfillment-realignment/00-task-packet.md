# Order / Bill / Fulfillment Realignment

## Objective & Hypothesis

Explore, solidify, and implement the intended topology after user order
creation across:

- `Order`
- `Bill`
- family execution state currently called `Fulfillment`
- `Rental`
- `RideHailing`

Result: family execution state has been folded into `RentalOrder` /
`RideHailingOrder`; backend create paths are Order-owned commands; `Ordering`
remains a frontend assembly concept plus read/evaluate support.

## Guardrails Touched

- Trade / Order owns commercial contract creation and order status.
- Bill owns payable / refundable monetary lines and settlement state.
- Rental and RideHailing own family-specific execution truth.
- Provider integrations should sit behind RideHailing execution, not behind
  frontend ordering terminology.
- PR attachment remains a cross-domain side effect that must stay atomic with
  local order creation when the order is PR-scoped.

## User Corrections Applied

- `createRentalOrderFromPlacement` / `createRideHailingOrderFromPlacement`
  were replaced by Order-owned command use cases.
- `RentalFulfillment` / `RideHailingFulfillment` attributes were merged into
  `RentalOrder` / `RideHailingOrder`.
- Provider `createRide` should be invoked by RideHailing execution, not by a
  backend "RideHailing Ordering API".
- Backend should not treat "RideHailing Ordering" as a durable backend domain.
  Ordering is likely a frontend assembly surface.
- Need to list core data models across Order, Bill, family execution,
  RideHailing, and Rental before deciding mutations.
- `executionRef` needs semantic clarification; it is not just provider instance
  id.
- `providerCreationStatus` was removed; Order status plus RideHailing
  execution phase express the boundary.
- RideHailing detail payload should distinguish stable `OrderDetail` data from
  high-frequency `LiveTracking` data.
- Existing sequence diagrams must include provider callback flow.

## Verification

Implemented verification scope:

- backend unit tests for model transition reducers / family execution rules
- backend scenario tests for Rental prepaid order -> paid -> execution
- backend scenario tests for RideHailing create -> callback -> trip finished ->
  final bill
- frontend scenario tests for Order Detail and RideHailing live tracking
  payload boundaries

Latest verification results should be recorded in `90-discussion-log.md`.

## Packet Files

- `10-current-implementation.md`: evidence from current code and docs.
- `20-core-data-models.md`: current model inventory and target-shape notes.
- `30-target-sequences.md`: working sequence diagrams, including callbacks.
- `40-open-questions.md`: decisions still needing discussion.
- `50-target-contract.md`: current target contract after user corrections.
- `60-modification-plan.md`: implementation plan before code mutation.
- `90-discussion-log.md`: chronological decisions and corrections.
