# Ordering Input Realignment

## Current Problem

Current Ordering inputs are predecessor-coupled:

- route: `/ordering/from-placement?placementInstanceId=&context=pr&contextId=`
- read model source: `{ placementInstanceId, context: { kind: "PR", prId } }`
- evaluate/create input repeats `{ placementInstanceId, context }`
- backend re-enters Placement and PR to resolve Offer, bindings, participants,
  time, route, and active roster.

This keeps Ordering coupled to:

- Placement as predecessor;
- PR as context owner;
- Placement matching context;
- old target/navigation semantics.

## Target Principle

Ordering should start from a resolved Ordering entry payload:

- `source.offerId`: source commercial offer.
- `offerDetail`: Offer-owned ordering projection for SPU/SKU/display/policy
  data needed by concrete Ordering Content.
- `prId?`: optional order association reference when the entry came from a PR.
- `bindings`: locked defaults/resolved context values used only to prefill
  Content state.

Ordering should not know:

- whether the user came from PR Page, Placement, Admin preview, or a future
  surface;
- the original matching context used to choose the Placement;
- `context: { kind: "PR", prId }`.

`prId?` is not a matching context. It is an optional association field on the
create-order path so PR-owned `orders uuid[]` can be updated transactionally.

## Proposed Frontend Entry Transport

Use `/order/new` as the route. This aligns with `/pr/new`; later naming can
consider `NewOrder` / `CreateOrder`.

Preferred transport:

1. On Button Placement click, resolve:
   - matched Placement Instance with `offerId`;
   - PR existing non-terminal order by `prId + offerId + statusIn`;
   - Ordering entry via `POST /api/placements/:instanceId/ordering-entry`.
2. If no existing order exists, write an `OrderingEntryPayload` to
   `sessionStorage`.
3. Navigate to `/order/new` with a short `history.state` or route state key that
   identifies the stored entry.
4. New order page reads the entry and selects the concrete Order Content
   component from `offerDetail.productType`.

Use `sessionStorage` rather than durable `localStorage` by default because this
payload is transient, may contain route/contact-like context, and should not
survive long after the session. Vue Router history state can carry the key or
the payload, but the payload should be recoverable on refresh through
`sessionStorage` if the user reloads during Ordering.

## Ordering Entry Payload

Draft:

```ts
type OrderingEntryPayload = {
  source: {
    offerId: number;
  };
  offerDetail: OrderingOfferDetail;
  prId?: number;
  bindings: Record<string, unknown>;
};
```

No entry attribution is part of this payload.

## Ordering Content

There is no generic `OrderingReadModel`.

The `/order/new` page should:

1. read `OrderingEntryPayload` from transient frontend state;
2. select the concrete Ordering Content component from `offerDetail.productType`;
3. pass `{ source, offerDetail, bindings }` to that Content component;
4. keep `prId` at page level for create-order association only;
5. read `items` and `productTypedExtraProperties` exposed by the Content
   component.

The Content component owns product-family-specific rendering, field locking,
and construction of the command-shaped input. `bindings` only prefill and lock
`items` and `productTypedExtraProperties`; bindings are not submitted as
command input.
`prId` is not passed to Content.

The page-level BottomActionBar owns the final create-order action. Content does
not submit the command; it exposes current `items` and
`productTypedExtraProperties` for the page to evaluate and submit.

## Evaluate/Create Input

`OrderingEvaluationInput` is the same shape as `CreateOrderCommand`.

It should carry:

```ts
type OrderingEvaluationInput = {
  source: {
    offerId: number;
  };
  prId?: number;
  participants: OrderParticipantInput[];
  items: OrderItemInput[];
  productTypedExtraProperties: ProductFamilyOrderingExtraProperties;
};
```

It should not carry `bindings`.

Bindings affect frontend field defaults and lock state only. The emitted input
contains the resulting concrete item selection and extra properties.

## Rental Command Sketch

```ts
type RentalOrderingEvaluationInput = {
  offerId: number;
  prId?: number;
  items: RentalOrderingItemInput[];
  productTypedExtraProperties: RentalOrderingExtraProperties;
};
```

`RentalOrderingExtraProperties` should not include `participantCount`.
Participant count is not submitted as an extra property; it is either implied by
selected items or checked from the optional PR association on the server.

## RideHailing Command Sketch

```ts
type RideHailingOrderingEvaluationInput = {
  offerId: number;
  prId?: number;
  items: RideHailingOrderingItemInput[];
  productTypedExtraProperties: RideHailingOrderingExtraProperties;
};
```

`RideHailingOrderingExtraProperties.riders` should be `userId[]`, not a
frontend-shaped rider snapshot array.

## Consequences

- `getOrderingFromPlacement` should disappear or become only a compatibility
  shim during migration.
- Ordering no longer imports PlacementRepository.
- Ordering no longer imports PartnerRequestRepository just because the entry
  came from PR Page.
- Ordering input is no longer a separate read/evaluate transport. It is the
  create-order command shape, optionally evaluated before submission.
- If `prId` is present, create-order persistence updates PR-owned
  `orders uuid[]` in the same transaction. PR authority checks happen when
  appending to PR.orders; if append fails, the whole order creation rolls back.
  This does not reintroduce PR context into Ordering; it is an optional
  association field on the create-order command.
