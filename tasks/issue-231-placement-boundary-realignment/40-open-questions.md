# Open Questions

## Matching Context Authority

Decision: PR Page constructs `matchingContext = PR Detail`.

Placement matching does not receive `userId`, `contextType`, PartnerRoster, or
an authority envelope. PR Page decides whether the current user is an active
participant and only mounts `ButtonPlacement` when allowed.

## POST No-Match Shape

Need decide whether no match is:

- `200 { placements: [] }`
- `200 { placement: null }`
- `204 No Content`

The user said "200 then render, otherwise hide"; this needs a concrete API
shape before implementation.

## Singular Or Plural Match

`matchPlacementInstance(type, matchingContext) -> placements` suggests
plural. Current UI renders one Button Placement in Utility Actions. Need decide:

- return top-priority one only
- return ordered list and let the mounted slot choose capacity
- allow mounted slot props such as `limit=1`

## Offer Visibility In Placement Response

Resolved: Placement match response returns the Placement Instance projection.
That instance should expose the Offer association needed by click
orchestration. This is not a navigation `target`.

## PR Orders Array Implementation

Decision: remove `pr_attached_orders`; PR owns `orders uuid[]`.

Implementation still needs a concrete query/index strategy. Decision:
`trade_orders` gets a top-level `offerId`, and `offerSnapshot` should be
removed or decomposed into explicit order-owned fields.

Non-negotiable invariants:

- one non-terminal order per `(prId, offerId)`;
- order attach/update is transactional with order creation;
- PR READY and creator/active-participant gates stay authoritative;
- failed or terminal orders allow retry according to existing behavior.

## Ordering Input Shape

Current shape is still predecessor-coupled:

- Ordering page route: `/ordering/from-placement?placementInstanceId=&context=pr&contextId=`
- Ordering read query: `GET /api/commerce/ordering/from-placement`
- Rental read source returns `{ placementInstanceId, context: { kind: "PR", prId } }`
- RideHailing read source returns the same source shape.
- Rental evaluate/create input carries:
  - `placementInstanceId`
  - `context: { kind: "PR", prId }`
  - selected items
  - request fields
- RideHailing evaluate/create input carries:
  - `placementInstanceId`
  - `context: { kind: "PR", prId }`
  - selected SKU
  - route/departure/riders/contact fields

Target redesign is captured in `50-ordering-input-realignment.md`:

- route becomes `/order/new`;
- page receives transient `{ offerId, prId?, bindings }`;
- Order Content receives `offerId + bindings`, not `prId`;
- Order Content exposes `items + productTypedExtraProperties`;
- BottomActionBar submits
  `{ offerId, prId?, items, productTypedExtraProperties }`;
- `bindings` do not enter evaluate/create payloads.
