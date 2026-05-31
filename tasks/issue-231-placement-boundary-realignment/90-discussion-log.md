# Discussion Log

## 2026-05-31

- User proposed a Placement boundary correction after inspecting current PR Page
  Utility Actions behavior.
- Confirmed local task packet is `tasks/issue-231-ecommerce-mvp`; the referenced
  `tasks/issue-321-ecommerce-mvp` does not exist in this workspace.
- Current `PRCommercePlacementAction` is mounted in PR Page Utility Actions and
  queries `GET /api/commerce/placements?context=pr&contextId=:prId&type=BUTTON`.
- Current backend resolver `resolveCommercePlacementForPr` performs PR lookup,
  active participant gating, placement matching, Offer validation, PR-attached
  non-terminal order lookup, and runtime target projection.
- User's preferred direction:
  - rename `PRCommercePlacementAction` to `ButtonPlacement`;
  - have PR Page provide matching context from PR Detail and PartnerRoster;
  - move placement APIs to `/api/placements`;
  - replace `resolveCommercePlacementForPr` with generic
    `matchPlacementInstance(type, matchingContext, userId) -> placements`;
  - remove `contextType` and `slotKey`;
  - return Placement Instance without target/navigation;
  - resolve existing PR order and Placement bindings on click;
  - replace `pr_attached_orders` with `partner_requests.orders uuid[]`.
- Initial assessment: most Placement boundary changes align with existing
  issue-231 direction that Placement is not PR-owned. The PR orders array change
  is larger and needs separate invariant design because current non-terminal
  uniqueness and `(prId, offerId)` lookup depend on the attachment relation.

## 2026-05-31 Follow-Up

- User confirmed `POST /api/placements/:instanceId/bindings`.
- User clarified that Placement match response should return the Placement
  Instance itself. The instance should expose `offerId`; the current model hides
  it under `target: { kind: "OFFER", offerId }`.
- User clarified `target` should be removed and should not be a
  PlacementInstance persisted attribute.
- User settled `pr_attached_orders -> partner_requests.orders uuid[]`; no
  further direction discussion needed. Implementation must adapt lookup and
  uniqueness mechanics.
- User clarified ButtonPlacementCreative target shape: `ctaLabel` and optional
  `description` only.
- User clarified `slotKey` and `contextType` removal applies to the entire
  Placement domain.
- Current Ordering input was inspected. It is still coupled to
  `placementInstanceId + context: { kind: "PR", prId }` for read, evaluate, and
  create paths.

## 2026-05-31 Ordering Input Follow-Up

- User decided `trade_orders` should add top-level `offerId`.
- User stated current `offerSnapshot` is unnecessary because concrete pricing
  strategy, cancellation policy, item, and order facts should be snapshotted in
  their own order fields.
- User proposed Ordering page route should become `/ordering` and receive
  `offerId` plus resolved bindings through localStorage or Vue Router state
  instead of route query context.
- User clarified Ordering must be decoupled from PR, Placement `contextType`,
  and Placement `matchingContext`.
- Added `50-ordering-input-realignment.md` with a proposed `/ordering` entry
  payload, session-state transport, `POST /api/ordering/read`, and stateless
  evaluate/create inputs carrying `offerId + bindings`.

## 2026-05-31 Ordering Input Correction

- User clarified `statusIn` must be an explicit order status enum array; no
  `nonTerminal` alias.
- User removed entry attribution from `OrderingEntryPayload`.
- User clarified `OrderingEvaluationInput` should not carry bindings. Bindings
  only drive frontend field defaults and locking.
- User clarified there should be no generic `OrderingReadModel`.
- `/ordering` should load the Offer, select the concrete Content component by
  Offer SPU productType, pass `offerId + bindings` into that component, and let
  the component emit `OrderingEvaluationInput`.
- User clarified `OrderingEvaluationInput` is effectively the
  `CreateOrderCommand`: `offerId + items + request`.

## 2026-05-31 Command Shape Correction

- User rejected `OrderingRequestInput` and `CreateOrderRequest` naming.
- User proposed `OrderingExtraProperties` or promoting those fields to the
  command's top level.
- User clarified bindings only prefill `items` and the field then called
  `extraProperties`; bindings are not command input.
- User rejected a separate `CreateOrderFromPrEntryCommand` as PR coupling.
- Target command direction is now:
  `CreateOrderCommand = { offerId, prId?, items, extraProperties }`, with
  product-family-specific `OrderingExtraProperties`.

## 2026-05-31 Extra Properties Correction

- User removed `participantCount` from `RentalOrderingExtraProperties`.
- User clarified `RideHailingOrderingExtraProperties.riders` should be
  `userId[]`.

## 2026-05-31 Target Sequence Correction

- User changed route from `/ordering` to `/order/new`, aligned with `/pr/new`.
- User clarified `ButtonPlacement` does not know `prId`.
- PR Page decides active-participant visibility and only mounts
  `ButtonPlacement` when allowed.
- PR Page supplies `matchingContext = PR Detail`; PartnerRoster is not part of
  matching context.
- `matchPlacementInstance` no longer receives `userId`.
- `prId` is not passed to Order Content.
- Order Content exposes `items` and the field then called `extraProperties`;
  page-level
  BottomActionBar submits the create-order command.
- PR authority checks happen when appending the new order id to `PR.orders`;
  append failure rolls back the whole order creation transaction.
- Added target sequence diagram and implementation steps files.

## 2026-05-31 Naming Correction

- User renamed `extraProperties` to `productTypedExtraProperties`.
