# Current Baseline Confirmation

Date: 2026-06-01

## Scope

This file records the actual current project baseline checked from code, not
from prior task memory.

The worktree is currently dirty with many commerce/order/fulfillment changes
outside this task packet. This baseline treats the current filesystem as the
truth to plan from and does not assume a clean committed state.

No tests were run for this baseline check.

## Frontend Entry Baseline

Current `OrderingEntryPayload` is still minimal:

```ts
type OrderingEntryPayload = {
  offerId: number;
  prId?: number;
  bindings: Record<string, unknown>;
};
```

Current PR Page behavior:

1. Button Placement gives the PR page `offerId`.
2. PR Page checks existing PR orders by `prId + offerId + INITIATING/OPEN`.
3. If one exists, it routes to `/orders/:orderId`.
4. Otherwise PR Page calls Placement bindings resolution.
5. PR Page stores `{ offerId, prId, bindings }` in `sessionStorage`.
6. PR Page routes to `/order/new`.

Baseline gap to target:

- Placement does not yet assemble an expanded `OrderingEntryPayload`.
- Placement does not yet call an Offer-domain service for an Ordering Offer
  Detail projection.
- The payload does not yet contain `source.offerId` or `offerDetail`.

## Frontend Ordering Page Baseline

`OrderingFromPlacementPage.vue` is still the single page owner for:

- reading the minimal session payload;
- calling `useOrderingFromPlacement(offerId, prId)`;
- branching inline between Rental and RideHailing content;
- building product-specific order inputs;
- watching those inputs and calling product-specific evaluate mutations;
- rendering price/availability in the footer;
- submitting product-specific create mutations.

Current frontend command-ish shapes already include participants:

- Rental input:
  - `offerId`
  - `prId`
  - `participants`
  - `items`
  - `extraProperties`
- RideHailing input:
  - `offerId`
  - `prId`
  - `participants`
  - `items`
  - `extraProperties`

Baseline gap to target:

- There is no extracted `OrderingContentInput` /
  `OrderingContentOutput` boundary.
- Content and page-level BottomActionBar responsibilities are still mixed in
  one component.
- Evaluation/create calls are still product-specific.
- `participants` are currently derived from backend read models that themselves
  derive from active PR participants.

## Backend API Baseline

Current public commerce routes still include:

```http
GET  /api/commerce/ordering/from-placement
POST /api/commerce/ordering/rental/evaluate
POST /api/commerce/ordering/ride-hailing/evaluate
POST /api/commerce/orders/rental
POST /api/commerce/orders/ride-hailing
```

Current command schemas already moved closer to target:

- both Rental and RideHailing command schemas include `participants`;
- both use `extraProperties`, not the target name
  `productTypedExtraProperties`;
- both still use bare `offerId`, not `source.offerId`;
- both still require product-specific endpoints.

Baseline gap to target:

- No generic `POST /api/commerce/ordering/evaluate`.
- No generic `POST /api/commerce/orders`.
- No action-preflight-shaped `actions.create_order` response.
- No `source.offerId` command envelope.

## Backend Ordering Read Baseline

Current `getOrderingFromPlacement`:

- reads Offer by `offerId`;
- dispatches by `offer.productType`;
- calls `getRideHailingOrderingFromPlacement` for RideHailing;
- otherwise calls `getRentalOrderingFromPlacement`.

Current Rental read:

- re-enters PR;
- loads active PR participants;
- derives participant count and service time from PR/binding behavior;
- reads Offer/SPU/SKU/cancellation policy;
- returns a Rental-specific read model, now including participants.

Current RideHailing read:

- re-enters PR;
- derives route, departure, riders, and contact defaults from PR;
- reads Offer/SPU/SKU/provider facts;
- obtains provider-backed quote options;
- returns a RideHailing-specific read model.

Baseline gap to target:

- Ordering read still re-enters PR and Placement-era context.
- There is no Placement-built entry payload with embedded Offer Detail.
- Product-specific read models remain the primary data source for the frontend.

## Backend Evaluation Baseline

Current evaluation remains product-specific:

- `evaluateRentalOrdering`
- `evaluateRideHailingOrdering`

Current response shapes are still bespoke:

- Rental returns `availability.createOrderEnabled`,
  `availability.disabledReason`, and `pricePreview`.
- RideHailing returns `quoteExpiresAt`, quote `options`, `priceRange`, and
  `availability`.

Current validation still re-enters PR:

- READY gate;
- PR creator gate;
- PR-derived service time/route/rider context.

Baseline gap to target:

- Evaluation is not generic.
- Evaluation does not use action-preflight-shaped `actions.create_order`.
- Evaluation is still coupled to product-specific Ordering use cases.

## Backend Create Baseline

Current public create routes are still product-specific:

- `createRentalOrderCommand`
- `createRideHailingOrderCommand`

Current create flows already accept frontend participants:

- submitted `participants` are mapped into order participant snapshots;
- `joinedVia` is currently `"API"`.

Important current coupling:

- Both create commands still re-resolve PR context through their selection
  paths.
- Both call `attachOrderToPr` inside product-specific orchestration.
- Product-specific create commands still own the transaction wrapper that
  combines typed order creation and PR attachment.

RideHailing-specific current detail:

- order participants come from submitted `participants`;
- rider snapshots still come from active PR participants filtered by
  `extraProperties.riders`;
- provider initiation happens after the local transaction;
- provider hard failure marks the base order `FAILED`.

Rental-specific current detail:

- order participants come from submitted `participants`;
- registrant count is checked against submitted participants;
- service start/end are still persisted from PR-derived selection values, not
  directly from frontend `extraProperties`.

Baseline gap to target:

- Trade Order Base does not yet own a generic create-order transaction boundary.
- PR attachment is still called from product-specific command orchestration.
- Product-typed `create -> init` steps are not yet explicit.
- RideHailing provider initiation is not modeled as
  `RideHailingOrder.init`.
- Rental prepaid bill creation is still inside `createRentalOrder`, not an
  explicit `RentalOrder.init` step.

## Persistence Baseline

Current base `trade_orders` owns:

- family;
- offer id;
- creator;
- status;
- participants;
- split rule snapshot;
- item snapshots;
- timeout;
- termination attempts.

Current `rental_orders` now owns more than original reservation facts:

- service start/end;
- contact phone;
- registrants;
- booking status;
- cancellation handling status;
- supplier cancellation outcome;
- entry guidance;
- booking/cancellation notes;
- service ended time.

Current `ride_hailing_orders` now owns provider/execution facts:

- route snapshot;
- departure;
- riders;
- contact phone;
- provider instance id;
- provider order id;
- execution phase;
- driver snapshot;
- vehicle snapshot;
- final settlement input.

Current migrations show fulfillment table merge direction:

- `0079_order_item_snapshot_and_fulfillment_merge.sql` migrates Rental and
  RideHailing fulfillment facts into typed order tables and drops fulfillment
  tables.
- `0080_spu_pricing_and_ride_execution_cleanup.sql` removes SPU pricing policy
  and adds RideHailing execution fields.

Baseline implication:

- The current actual codebase is already moving toward typed order owning more
  family execution facts.
- The target plan should not assume `rental_fulfillments` or
  `ride_hailing_fulfillments` still exist as primary persistence owners.

## PR Attachment Baseline

`attachOrderToPr` currently owns:

- PR existence check;
- READY check;
- PR creator check;
- creator still active participant check;
- duplicate active order check for `(prId, offerId)` over `INITIATING/OPEN`;
- appending order id to `partner_requests.orders`.

Current callers:

- product-specific Rental create command;
- product-specific RideHailing create command.

Baseline gap to target:

- PR attachment policy is already concentrated in PR Core.
- The call site is not yet Trade Order Base; it is still product-specific
  command orchestration.

## Offer Detail Baseline

Current search did not find a dedicated Ordering Offer Detail service.

Offer is still read ad hoc from repositories inside:

- product-specific Ordering flows;
- admin-commerce flows;
- merchandising placement matching / creation flows.

Baseline gap to target:

- Need a new or repurposed Offer-domain projection service for Placement to
  build `OrderingEntryPayload`.

## Baseline Summary

Actual current baseline:

- Minimal frontend `OrderingEntryPayload` exists.
- `/order/new` still fetches backend `from-placement` read models.
- Rental/RideHailing UI is still inline in one page.
- Public evaluate/create APIs are still product-specific.
- Commands already include frontend participants and `extraProperties`.
- Backend read/evaluate/create still re-enters PR.
- Product-specific create commands still call PR attachment.
- Typed order tables now own more family execution facts; fulfillment tables
  appear to be in the process of being removed.

Therefore the first implementation slice should not start at schema cleanup.
The real first cut is the contract/entry/API boundary:

1. introduce the expanded `OrderingEntryPayload` assembled by Placement using
   Offer-domain projection;
2. extract Content/page boundaries;
3. introduce generic evaluation/create commands;
4. only then refactor product-specific create/init ownership.
