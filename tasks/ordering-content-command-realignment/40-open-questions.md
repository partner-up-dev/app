# Open Questions

## Command Participant Shape

The latest target says:

```ts
CreateOrder(source.offerId, prId?, participants, items, productTypedProperties)
```

Need to define `participants`:

- Are they user ids only?
- Are they full order participant inputs with role/joinedVia?
- Do they include display/contact snapshots?
- What exact fields make the frontend order participants authoritative command
  input without confusing them with PR participants?

Current hypothesis:

- Content should output order participants, usually initialized from bindings.
- PR participants are only one possible source.
- Backend CreateOrder should construct canonical `OrderParticipantSnapshot`
  from submitted order participants and still validate PR association if `prId`
  is present.

## Binding Schema Ownership

Need to define where product-specific binding schemas live:

- Rental bindings: participant roster, service start/end, maybe locked zone?
- RideHailing bindings: participant roster, route, departure time, contact
  defaults?
- Binding schemas may provide PR participants as source facts, but should not
  imply PR participants are identical to order participants.

Open decision:

- Should binding schemas be declared by Placement rules, by product family, or
  by a shared Ordering entry contract?

## Offer/Product Fetch Surface

Need to decide exact Offer domain service contract used by Placement to assemble
OrderingEntryPayload:

- service name and projection shape;
- whether the projection is public-route shaped or Placement-entry shaped;
- cache/versioning behavior if Offer/SPU/SKU changes while the user is on
  Ordering Detail.

Important constraint:

- Avoid recreating `getRentalOrderingFromPlacement` under a new name.
- If accepted, this revises older issue-231 product wording that expected
  backend to return one already-resolved Ordering read model before the frontend
  enters Ordering Detail.
- `offerId` alone is insufficient as Content input. It is only a commercial
  source reference.
- Placement, not OrderingPage, should call the Offer domain service when
  assembling `OrderingEntryPayload`.

## Evaluation Internal Dispatch

Need to decide how generic `evaluateOrdering(command)` dispatches:

- by `Offer.productType`;
- by selected SPU product type;
- by explicit family inferred from command validation.

Current hypothesis:

- Re-read Offer, require all selected SPUs belong to the Offer and share
  `Offer.productType`, then dispatch by `Offer.productType`.

## Ordering Action Problem Registry

Ordering evaluation should reuse the action-preflight substrate:

- `allowed`
- `problem.type`
- `problem.code`
- `problem.title`
- `problem.detail`
- `nextRelevantAt`

Need to define the Commerce/Trade-owned code registry for `create_order`.

Candidate code families:

- auth / identity missing;
- Offer unavailable;
- selected item not in Offer;
- selected SKU inactive or incompatible;
- participant input invalid;
- optional PR attachment not allowed;
- duplicate active PR order for the same Offer;
- Rental service policy unavailable;
- RideHailing provider/quote unavailable;
- price expired or cannot be evaluated.

Open decision:

- Should `evaluateOrdering` return only `create_order`, or reserve an
  `actions` map so future actions such as `refresh_quote` or
  `request_manual_review` fit the same substrate?

## CreateOrder Transaction Boundary

Need to define exact transaction semantics for product-typed `create` and
`init` steps:

Open decision:

- What is the exact contract between Trade Order Base and each product-typed
  `create` step?
- What is the exact contract between Trade Order Base and each product-typed
  `init` step?
- How should RideHailing provider initiation fit the create-order transaction
  boundary, given the provider call is an external side effect?
- If RideHailing provider initiation hard-fails, what is the exact transactional
  rollback or retry/release behavior?

Current corrected direction:

- Trade Order Base orchestrates the entire create-order transaction.
- Trade Order Base owns base `trade_orders` creation and optional PR attachment
  behavior.
- `RentalOrder.create` / `RentalOrder.init` and
  `RideHailingOrder.create` / `RideHailingOrder.init` are sibling
  product-typed responsibilities invoked by Trade Order Base, but within each
  family branch `create` runs before `init`.
- Create-order execution does not include an "authoritative preflight" step;
  it relies on transactional validation/atomicity.

## Product Contract Revision Needed

The target contract conflicts with older issue-231 product wording that says:

- backend should complete Ordering read-model resolution before frontend enters
  Ordering Detail;
- frontend should not run arbitrary Offer-to-Ordering adaptation logic.

Need product decision:

- Accept the new target as a revision, where concrete Ordering Content composes
  from authoritative product/offer/pricing reads plus bindings; or
- keep the older backend-resolved read-model contract and narrow the target
  accordingly.

## Backward Compatibility Strategy

Need to decide migration style:

- big-bang route/API switch;
- compatibility wrappers around old endpoints;
- scenario-first vertical slice for one family then generalize.

No implementation should start before this is agreed.
