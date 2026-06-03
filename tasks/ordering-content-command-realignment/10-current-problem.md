# Current Problem

## Problem Statement

The current implementation still treats Ordering as if it were a backend
product-specific flow reached from Placement/PR. That creates the wrong
ownership direction:

- `getRentalOrderingFromPlacement` and `getRideHailingOrderingFromPlacement`
  fetch PR and Placement-derived context directly.
- Rental and RideHailing have separate evaluation endpoints.
- Product-typed order flows currently coordinate creation and then attach to PR.
- Frontend Ordering Content and the page-level action bar are not cleanly
  separated as contracts.

Under the new target, Ordering Content is not a backend read model owned by
Trade. It is a frontend content component that assembles product-specific
command inputs.

## Current Couplings To Remove

### Placement Coupling

Current shape:

- PR Page stores `offerId`, `prId`, and resolved `bindings`.
- `/order/new` calls `GET /api/commerce/ordering/from-placement`.
- The backend dispatches by `Offer.productType`.

Target pressure:

- Placement should assemble the Ordering entry before Ordering begins.
- Ordering receives an expanded Offer Detail projection, `bindings`, optional
  `prId`, and `offerId` only as a commercial source reference.
- Placement obtains the Offer Detail projection by calling the Offer domain
  service; it does not own the Offer facts itself.
- Product content should not call a backend "from placement" read API.

### PR Coupling

Current shape:

- Rental and RideHailing ordering flows re-read PR for participants, time,
  route, status, creator, and active participant roster.

Target pressure:

- Content should not derive participants from PR.
- PR participants and other predecessor facts may arrive through `bindings`.
- Order participants are distinct from PR participants and are emitted by
  Content.
- `prId?` is only an optional association on evaluation/create commands, used
  by Order/PR attachment authority, not by Content.

### Evaluation Coupling

Current shape:

- Rental uses `evaluateRentalOrdering`.
- RideHailing uses `evaluateRideHailingOrdering`.
- The frontend has product-specific mutations and availability state.

Target pressure:

- OrderingPage owns evaluation through `evaluateOrdering(command)`.
- The command shape should be the same as create-order input.
- Response should include price detail and whether the command can be submitted.

### Creation Ownership Coupling

Current shape:

- `createRentalOrderFromPlacement` resolves Rental selection, creates base
  order, creates typed rental order, creates bill, and attaches to PR.
- `createRideHailingOrderFromPlacement` resolves RideHailing selection, creates
  base order, creates typed ride order, creates fulfillment foundation, calls
  provider, then attaches/updates status.

Target pressure:

- `CreateOrder(prId?, offerId, items, participants, productTypedProperties)`
  should be the coordinator.
- Product-typed order creation is a subordinate operation selected by product
  type/family.
- PR attachment is coordinated by CreateOrder and remains atomic with local
  order creation.

## Current Reality Notes

- The frontend already has a transient `OrderingEntryPayload` containing
  `offerId`, optional `prId`, and `bindings`.
- Existing task
  `tasks/issue-231-placement-boundary-realignment/50-ordering-input-realignment.md`
  already points toward the same entry payload and away from
  `from-placement`.
- The newer corrections expand that direction by explicitly moving evaluation
  and CreateOrder ownership out of product-specific Ordering flows.
