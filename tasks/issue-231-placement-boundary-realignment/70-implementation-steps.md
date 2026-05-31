# Implementation Steps

## Slice 1: Placement Domain Shape

- Remove `slotKey` from Placement domain model, database schema, repository
  queries, admin input, and frontend admin display.
- Replace persisted `target` JSON with a direct Offer association such as
  `offerId`.
- Shrink Button creative to `{ ctaLabel, description? }`.
- Introduce generic `matchPlacementInstance(type, matchingContext)`.
- Add `POST /api/placements?type=BUTTON`.
- Add `POST /api/placements/:instanceId/bindings`.
- Remove PR-specific `resolveCommercePlacementForPr`.

## Slice 2: PR Page Button Placement Mount

- Rename `PRCommercePlacementAction` to `ButtonPlacement`.
- Make PR Page decide whether the current user is an active participant before
  mounting `ButtonPlacement`.
- Build `matchingContext` from PR Detail only.
- Keep `prId` outside `ButtonPlacement`.
- On click, PR Page checks existing PR orders with explicit `statusIn` values.
- If no requested-status order exists, resolve bindings and store
  `{ offerId, prId?, bindings }` for `/order/new`.

## Slice 3: PR Orders Ownership

- Add `orders uuid[]` to `partner_requests`.
- Add top-level `offerId` to `trade_orders`.
- Remove `pr_attached_orders` and its repository.
- Rework append-order-to-PR behavior so authority checks happen when appending
  order id to `PR.orders`.
- Ensure append rejection rolls back the whole order creation transaction.
- Preserve one requested-status order per `(prId, offerId)`.

## Slice 4: New Order Route

- Add `/order/new`.
- Retire `/ordering/from-placement` after compatibility migration.
- Load Offer by `offerId`.
- Select Order Content by Offer SPU `productType`.
- Pass only `offerId + bindings` to Order Content.
- Do not pass `prId` to Order Content.
- Order Content exposes `items + productTypedExtraProperties`.
- BottomActionBar owns evaluate/create actions.

## Slice 5: Command Shape

- Replace `placementInstanceId + context + request` inputs with
  `{ offerId, prId?, items, productTypedExtraProperties }`.
- Remove `bindings` from evaluate/create payloads.
- Rename product-family request payloads to
  `ProductTypedOrderingExtraProperties`.
- Remove `participantCount` from Rental extra properties.
- Make RideHailing extra properties use `riders: userId[]`.
- Treat `OrderingEvaluationInput` as the create-order command shape.

## Slice 6: Verification

- Backend unit tests:
  - Placement matching by type and matching context.
  - Placement binding resolution by instance id and matching context.
  - PR order append authority and rollback.
  - TradeOrder top-level `offerId` query behavior.
- Frontend unit tests:
  - PR Page does not mount ButtonPlacement for non-active participants.
  - ButtonPlacement renders matched creative and hides on no match.
  - `/order/new` loads content by Offer product type.
  - Content exposes `items + productTypedExtraProperties`; BottomActionBar
    submits command.
- Scenario tests:
  - Rental PR placement to `/order/new` to order detail.
  - RideHailing PR placement to `/order/new` to order detail.
  - Returning to PR after an existing requested-status order navigates to order
    detail instead of opening `/order/new`.
