# Impact Map

## Durable Owners

### Merchandising

Likely impacted:

- Offer detail read surface.
- Product SPU/SKU read surface.
- SKU facts validation and pricing model interpretation.

Expected direction:

- Merchandising remains the owner of catalog truth.
- Ordering Content can fetch Offer/SPU/SKU, but does not mutate catalog truth.

### Frontend Ordering

Likely impacted:

- `/order/new` page.
- existing `OrderingFromPlacementPage.vue`.
- commerce query hooks.
- product-specific Ordering Content extraction.
- BottomActionBar ownership of evaluate/create.
- `OrderingEntryPayload` consumption with expanded Offer Detail projection plus
  bindings and optional PR association.

Expected direction:

- Split page shell and content responsibilities.
- Remove content-owned create/evaluate behavior.
- Treat `offerId` as `source.offerId`, not as the full Content input contract.
- Pass expanded Offer Detail projection plus bindings into Content.
- Content emits order participants, items, and product-typed extra properties.

### Trade / Order

Likely impacted:

- create-order backend use cases.
- generic evaluation backend use case.
- base `trade_orders` creation.
- order participant snapshot creation.
- action-preflight-compatible decision/problem substrate for create-order
  availability.

Expected direction:

- Introduce generic `evaluateOrdering(command)`.
- Introduce generic `createOrder(command)`.
- Commands carry `source.offerId`, not bare `offerId` as a content contract.
- Make Trade Order Base the create-order transaction orchestrator.
- Route internally by Offer product type to selected product-typed `create` and
  `init` sibling steps.
- Reuse the action preflight shape for the create-order action instead of
  inventing a separate `availability.disabledReason` transport.
- Keep PR attachment as base trade order behavior that uses PR authority.

### Rental Typed Order

Likely impacted:

- `createRentalOrder`.
- Rental-specific validation and typed record creation.
- Rental bill creation.

Expected direction:

- Rental provides product-typed `create` and `init` steps invoked by Trade Order
  Base.
- `RentalOrder.create` creates typed rental order facts.
- `RentalOrder.init` owns initial Rental management such as prepaid Bill
  creation.
- Rental does not own base trade order creation or PR attachment behavior.

### RideHailing Typed Order

Likely impacted:

- `createRideHailingOrderFoundation`.
- provider-backed order initiation.
- provider failure state handling.
- quote evaluation path.

Expected direction:

- RideHailing provides product-typed `create` and `init` steps invoked by Trade
  Order Base.
- `RideHailingOrder.create` creates typed ride-hailing order facts.
- `RideHailingOrder.init` owns initial RideHailing management such as provider
  initiation.
- RideHailing does not own base trade order creation or PR attachment behavior.

### PR Core

Likely impacted:

- PR attachment authority only.
- existing order lookup from PR Page.

Expected direction:

- PR remains final authority for appending to `partner_requests.orders`.
- Trade Order Base may call PR attachment when `prId` is present.
- Ordering Content does not read PR.
- PR participants are a possible source for order participants, not the same
  entity.

### Placement

Likely impacted:

- Placement click/entry binding resolution.
- Ordering entry payload assembly.

Expected direction:

- Placement calls Offer domain to obtain the Ordering Offer Detail projection.
- Placement combines that Offer Detail projection with resolved bindings,
  optional `prId`, and `source.offerId` into `OrderingEntryPayload`.
- Placement still does not own price, order lifecycle, fulfillment state, or
  Ordering Content layout.

## APIs To Reconsider

Likely remove or demote to compatibility shims:

- `GET /api/commerce/ordering/from-placement`
- `POST /api/commerce/ordering/rental/evaluate`
- `POST /api/commerce/ordering/ride-hailing/evaluate`
- `POST /api/commerce/orders/rental`
- `POST /api/commerce/orders/ride-hailing`

Likely target:

- `POST /api/commerce/ordering/evaluate`
- `POST /api/commerce/orders`

Exact route names remain open for discussion.
