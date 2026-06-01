# Modification Plan

## Purpose

Define the implementation sequence for the Ordering Content / Command
realignment after the target contract discussion.

This plan was the reviewable path for execution. Implementation started after
explicit approval and completed on 2026-06-01.

Implementation outcome:

- Slices 1-6 are implemented.
- Slice 7 baseline verification ran through backend typecheck, frontend build,
  backend lint, backend unit tests, and legacy API name searches.
- Additional contract/scenario tests remain useful follow-up coverage, but they
  are not blocking this cleanup slice.

## Slice 0: Contract Freeze And Naming

Goal:

- Freeze the names and top-level contracts before touching code.

Work:

- Promote the target terms:
  - `OrderingEntryPayload`
  - `OrderingOfferDetail`
  - `OrderingContentInput`
  - `OrderingContentOutput`
  - `CreateOrderCommand`
  - `OrderingEvaluation`
- Remove `OrderingPageEntry` from discussion and code plans.
- Define `source.offerId` as the commercial source reference.
- Define `offerDetail` as the expanded Offer-domain projection consumed by
  Ordering Content.
- Define `participants` as order participants, not PR participants.

Exit criteria:

- `20-target-contract.md` has no unresolved naming contradiction.
- `40-open-questions.md` only contains genuinely open implementation choices.

## Slice 1: Placement Builds OrderingEntryPayload

Goal:

- Move entry assembly to Placement, while keeping Offer facts owned by Offer.

Work:

- Add or expose an Offer-domain service that returns the Ordering Offer Detail
  projection:
  - `source.offerId`;
  - Offer `productType`;
  - SPU ids;
  - SKU ids;
  - pricing policy;
  - terms/version fields;
  - display/policy fields needed by Ordering Content.
- Change Placement entry resolution so it:
  - resolves bindings;
  - calls the Offer-domain service;
  - assembles `OrderingEntryPayload`;
  - returns or stores that payload for `/order/new`.
- Keep Placement from owning Offer facts, price, order lifecycle, fulfillment,
  or Ordering Content layout.

Exit criteria:

- PR Page no longer needs to assemble a minimal `{ offerId, prId, bindings }`
  payload by itself.
- The entry payload available to OrderingPage already contains `offerDetail`.
- Placement candidate matching remains generic and product-type agnostic except
  for calling the Offer-owned projection service at entry assembly time.

## Slice 2: Extract OrderingPage And Content Boundary

Goal:

- Separate page-level command/evaluation/create ownership from concrete
  product Content.

Work:

- Refactor `/order/new` so OrderingPage:
  - reads `OrderingEntryPayload`;
  - selects Content by `entry.offerDetail.productType`;
  - passes `{ source, offerDetail, bindings }` to Content;
  - reads Content output;
  - builds `CreateOrderCommand`;
  - owns BottomActionBar.
- Extract Rental Ordering Content:
  - input: `{ source, offerDetail, bindings }`;
  - output: order participants, items, Rental extras.
- Extract RideHailing Ordering Content:
  - input: `{ source, offerDetail, bindings }`;
  - output: order participants/riders, items, RideHailing extras.
- Ensure Content does not receive `prId`, does not know Placement, and does not
  submit create/evaluate commands.

Exit criteria:

- Content components expose only `OrderingContentOutput`.
- BottomActionBar has no product-specific backend route knowledge.
- PR participants and order participants are clearly separate in frontend
  models.

## Slice 3: Generic Ordering Evaluation

Goal:

- Replace family-specific public evaluation endpoints with one Ordering
  evaluation command.

Work:

- Add `evaluateOrdering(command)` using the same input shape as
  `CreateOrderCommand`.
- Return:
  - `evaluatedAt`;
  - `actions.create_order.allowed/problem/nextRelevantAt`;
  - price total/range/explanations.
- Reuse the action-preflight transport shape for create-order availability.
- Keep evaluation advisory.
- Internally dispatch by re-read Offer product type.
- Reuse family-specific pricing logic behind the generic use case where useful.

Exit criteria:

- Public frontend evaluation no longer calls
  `evaluateRentalOrdering` / `evaluateRideHailingOrdering`.
- Create-order disabled reasons are exposed through preflight-shaped
  `problem.type/code/title/detail`.
- Backend create command still performs authoritative transactional validation.

## Slice 4: Generic CreateOrder Command Boundary

Goal:

- Move create-order public API to Trade Order Base.

Work:

- Add generic `POST /api/commerce/orders`.
- Accept:

```ts
type CreateOrderCommand = {
  source: {
    offerId: number;
  };
  prId?: number;
  participants: OrderParticipantInput[];
  items: OrderItemInput[];
  productTypedExtraProperties: ProductTypedExtraProperties;
};
```

- In Trade Order Base:
  - re-read Offer/SPU/SKU truth from `source.offerId`;
  - validate common order invariants;
  - create base `trade_orders`;
  - attach to PR when `prId` exists, using PR authority as base trade order
    behavior;
  - dispatch product-typed steps by Offer product type;
  - commit only if base, optional PR attachment, and product-typed steps all
    succeed.

Exit criteria:

- Family-specific public create endpoints are unused or reduced to temporary
  compatibility wrappers.
- PR attachment is not implemented inside Rental/RideHailing typed order
  creation.
- Transaction tests prove rollback leaves no partial order when PR attachment
  rejects.

## Slice 5: Product-Typed Create And Init Steps

Goal:

- Express Rental and RideHailing typed behavior as serial
  `create -> init` steps orchestrated by Trade Order Base.

Work:

- Rental:
  - `RentalOrder.create`: create typed rental order facts.
  - `RentalOrder.init`: initialize rental order management and create prepaid
    Bill.
- RideHailing:
  - `RideHailingOrder.create`: create typed ride-hailing order facts.
  - `RideHailingOrder.init`: initialize ride-hailing management and initiate
    ride provider boundary.
- Ensure `create` runs before `init` in each family branch.
- Keep base trade order creation and PR attachment outside product-typed order
  ownership.

Exit criteria:

- Product-typed order code no longer coordinates base order creation or PR
  attachment.
- Rental prepaid Bill creation is triggered from `RentalOrder.init`.
- RideHailing provider initiation is triggered from `RideHailingOrder.init`.

## Slice 6: Remove From-Placement Ordering Read Paths

Goal:

- Retire backend Ordering read APIs that re-enter PR and Placement to build
  product-specific read models.

Work:

- Remove or demote compatibility use of:
  - `GET /api/commerce/ordering/from-placement`;
  - `getRentalOrderingFromPlacement`;
  - `getRideHailingOrderingFromPlacement`.
- Remove frontend dependency on `useOrderingFromPlacement`.
- Ensure existing entry surfaces receive `OrderingEntryPayload` from Placement
  entry resolution instead.

Exit criteria:

- Ordering Content no longer relies on backend `from-placement` read models.
- Backend product-specific Ordering read use cases are not part of the primary
  path.

## Slice 7: Scenario And Contract Verification

Goal:

- Prove the new topology preserves user-visible product behavior.

Work:

- Update or add backend contract tests for:
  - Placement entry assembly;
  - generic `evaluateOrdering`;
  - generic `createOrder`;
  - PR attachment rollback;
  - Rental create/init;
  - RideHailing create/init.
- Update system scenarios for:
  - Rental PR placement to Ordering Detail to order creation;
  - RideHailing PR placement to Ordering Detail to provider-backed order
    creation.
- Keep browser assertions black-box and user-visible.

Exit criteria:

- Rental system scenario passes.
- RideHailing system scenario passes or the accepted slice-specific subset
  passes.
- Backend typecheck and lint pass.

## Documentation Follow-Up

If implementation follows this target, update older issue-231 product docs that
still say:

- backend must complete a whole Ordering read model before frontend enters
  Ordering Detail;
- Ordering is decoupled from Offer in a way that could be read as forbidding an
  Offer Detail projection in `OrderingEntryPayload`.

The revised product claim should say:

- OrderingEntryPayload is assembled by Placement from bindings plus an
  Offer-domain Ordering Offer Detail projection.
- Ordering Content consumes that payload to display and modify order
  participants, order items, and product-typed extra properties.
- Backend evaluation/create re-read authoritative product truth and enforce
  create-order transaction invariants.
