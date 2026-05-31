# Proposed Target Contract

## Component Boundary

Rename the PR-mounted action from `PRCommercePlacementAction` to
`ButtonPlacement`.

The component should be generic with respect to the page that mounts it:

- PR Page owns where the slot is mounted.
- PR Page owns construction of `matchingContext`.
- `ButtonPlacement` owns loading and rendering a Button Placement instance.
- PR Page owns PR-specific click orchestration such as existing-order lookup and
  route transition. `ButtonPlacement` does not know `prId`.

For PR Page, the matching context should be built from:

- PR Detail

PR Page decides whether to mount `ButtonPlacement` by checking whether the
current user is an active PR participant.

## Placement Matching API

Preferred read contract:

```http
POST /api/placements?type=BUTTON
Content-Type: application/json

{
  "matchingContext": { ... }
}
```

Behavior:

- `200` with matched placement instance projection renders the Button
  Placement.
- empty/no-match response hides the mounted PlacementSlot.
- query parameter `type` selects Placement type.
- no `slotKey` anywhere in Placement domain.
- no `context` or `contextType` anywhere in Placement domain.
- body carries `matchingContext`.
- response does not include click target/navigation target.
- response is the matched Placement Instance projection. It should include the
  instance's Offer association because click orchestration needs `offerId`, but
  that association is not a navigation target.

Preferred application boundary:

```ts
matchPlacementInstance(type, matchingContext) -> placements
```

Notes:

- The function should not be named after PR or Commerce.
- The function should not load PR by id.
- Placement matching does not perform active-participant gating. The mounting
  page owns whether the slot should be requested.

## Click Flow

On Button Placement click from PR Page:

1. Read the matched Placement Instance, including its Offer target/source
   reference if needed for click orchestration.
2. Request the current PR's non-terminal order for that Offer:

```http
GET /api/pr/:prId/orders?offerId=:offerId&statusIn=INITIATING&statusIn=OPEN
```

`statusIn` is always an explicit order-status enum array. Do not introduce a
`nonTerminal` alias into the API.

3. If any order in the requested statuses exists, navigate to
   `/orders/:orderId`.
4. If no non-terminal order exists, request binding resolution:

```http
POST /api/placements/:instanceId/bindings
```

Request body:

```json
{
  "matchingContext": { "...": "..." }
}
```

5. Navigate to new-order flow with:
   - `resolveOrderingInput(offerId)`
   - resolved bindings

Ordering route target:

```text
/order/new
```

`/order/new` receives a transient Ordering entry payload through
browser/session state rather than through `context=pr&contextId=...` route query
fields. Future naming can consider `NewOrder` / `CreateOrder`, aligned with
`/pr/new`.

## PR Order Storage Target

Proposed direction:

```ts
type PartnerRequest = {
  orders: string[]; // uuid[]
};
```

This replaces `pr_attached_orders`.

Implementation must preserve:

- finding PR orders by `offerId` and status;
- one non-terminal order per `(prId, offerId)`;
- transactional attach only when PR is READY;
- retry behavior after terminal or failed order.

## Trade Order Offer Reference

Target shape:

```ts
type TradeOrder = {
  offerId: number;
  // existing order-owned snapshots stay explicit and typed
};
```

The current `offerSnapshot` should be removed or decomposed because it is only
carrying source identity/version/product-type facts that have better owners:

- `offerId` is a top-level order reference and query key.
- order family/product type is already expressed by `family` and typed order
  rows.
- concrete item, pricing, cancellation, and fulfillment-driving facts should be
  snapshotted in order-owned fields.
- if offer terms version is still required, keep it as an explicit scalar such
  as `offerTermsVersion`, not an opaque `offerSnapshot`.
