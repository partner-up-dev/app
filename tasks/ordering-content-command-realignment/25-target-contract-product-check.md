# Target Contract Product Check

## Scope

This check compares `20-target-contract.md` against product-design material
under `tasks/issue-231-ecommerce-mvp`.

Included product-design anchors:

- `tasks/issue-231-ecommerce-mvp/00-task-packet.md`
- `tasks/issue-231-ecommerce-mvp/52-basic-frontend-user-journeys.md`
- `tasks/issue-231-ecommerce-mvp/50-system-scenarios.md`
- `tasks/issue-231-ecommerce-mvp/66-pr-ready-ordering-gate.md`
- `tasks/issue-231-ecommerce-mvp/phase5-ride-hailing/40-ordering-content-ia.md`

Excluded from authority for this check:

- implementation plans;
- migration shape;
- repository/service code topology;
- task files that are primarily technical implementation design.

## Result

The target contract is directionally compatible with several product-level
claims, but it conflicts with older product-contract wording about where
Ordering read truth is resolved.

This is not a code-level contradiction. It means the target contract is a
product-contract revision and should later update the durable issue-231 product
docs if accepted.

## Matches

### Route Spine

Product design says the stable user-visible spine is:

```text
PR Page -> Ordering Detail -> Order Detail
```

Target contract preserves this:

- entry surface is outside Ordering;
- `/order/new` / OrderingPage remains the pre-order assembly surface;
- successful creation routes to Order Detail.

### Ordering Is Not Persisted

Product design says Ordering has no `orderingId` and should not become a
standalone persisted model.

Target contract preserves this:

- `OrderingEntryPayload` is transient;
- Ordering Content emits command input;
- no persisted Ordering aggregate is introduced.

### PR Outside Ordering

Product design says how the user entered Ordering is outside the Ordering model
and PR should stay outside Ordering.

Target contract preserves this after the latest correction:

- Content receives expanded Offer Detail projection plus `bindings`, not PR;
- Content does not read PR;
- `prId?` is held by OrderingPage only for command construction and base Trade
  Order attachment behavior.

### CTA Discipline

Product design says:

- before create, primary CTA lives on Ordering Detail;
- after create, primary CTA lives on Order Detail.

Target contract preserves this:

- Content does not submit;
- BottomActionBar owns evaluation display and submit.

### RideHailing Ordering Content Boundary

RideHailing IA says Ordering Content excludes:

- Context Header;
- PR source/back link;
- READY/creator eligibility display;
- create-order CTA;
- Bottom Action Bar;
- page-level Price Detail footer.

Target contract preserves this:

- Content emits data only;
- BottomActionBar and eligibility/evaluation are page-level concerns.

### PR READY Attachment Invariant

Product design says order creation from PR is allowed only after PR is READY,
and order creation plus PR attachment must be atomic.

Target contract preserves the atomicity direction:

- Trade Order Base owns optional PR attachment behavior;
- attachment uses PR authority;
- commit happens only when base order, optional PR attachment, and selected
  product-typed `create/init` steps succeed.

## Conflicts Or Required Product Revisions

### Backend-Resolved Ordering Read Model

Older product wording says backend should complete Ordering read-model
resolution before frontend enters Ordering Detail, and frontend should not run
arbitrary `Offer -> Ordering` adaptation logic inside the page.

Target contract says product-specific Content fetches/composes product-family
data such as Offer/SPU/SKU/provider quote inputs.

This is a real product-contract conflict.

Possible reconciliation:

- revise product design from "backend returns one current Ordering read model"
  to "backend exposes authoritative product/offer/pricing facts, and concrete
  Ordering Content composes command input from those facts plus bindings";
- keep the invariant that backend remains authoritative on final evaluation and
  create, so frontend composition is not a source of contract truth.

### Ordering And Offer Boundary

Older product wording says Ordering should be decoupled from Offer at the
frontend/API contract level, while still allowing Trade's CreateOrderCommand to
carry `offer_id`.

Earlier target draft had Content input `offerId`, which over-promoted Offer into
the Content boundary.

Corrected target:

- `offerId` is only `source.offerId`, a commercial source reference.
- OrderingEntryPayload carries an expanded Offer Detail projection with SPU ids,
  SKU ids, pricing policy, and related display/policy facts.
- Placement assembles the payload by calling Offer domain for that projection.
- Content consumes that projection plus bindings.
- Content may fetch provider quote/pricing-supporting inputs, but the baseline
  product/catalog context is not bare `offerId`.

This resolves the prior boundary error if "decoupled from Offer" means
Ordering is not the Offer Detail page and does not use bare `offerId` as its
content contract. If the older text means no Offer-derived projection in
Ordering at all, then a product wording update is still required.

### PR Participants Versus Order Participants

Product design often talks about PR participants when describing PR-bound
Ordering. The target now distinguishes:

- PR participants: source/context participants from PR lifecycle.
- Order participants: the participants selected for the commerce order.

Target correction:

- frontend order participants are command-authoritative at the Ordering
  boundary;
- PR participants may be one source for order participants through bindings;
- they are not equivalent.

This is a product-contract clarification rather than a direct conflict.
Remaining check: when the entry is PR-scoped, product docs still require the PR
attachment invariant and PR creator/READY checks. Those checks constrain whether
the order can attach to PR; they do not automatically make PR participants equal
order participants.

### Evaluation Naming

Product design says `OrderingAvailability` and price preview are
Ordering-owned computed state. Target contract uses an action-preflight-shaped
`actions.create_order` decision plus price object.

This is compatible if understood as a transport shape revision:

- conceptually still Ordering evaluation;
- presentation remains BottomActionBar-owned;
- backend write path remains authoritative.

It should not be renamed into a separate persisted preflight concept.

## Product-Level Corrections To Target

Based on this check, the target contract should carry these explicit product
constraints:

1. Ordering Detail must remain distinct from Offer Detail even if Content loads
   Offer/SPU/SKU data.
2. `offerId` is only a commercial source reference; OrderingEntryPayload carries
   the expanded Offer Detail projection that Content consumes.
3. Content displays and modifies order participants, order items, and
   product-typed extra properties.
4. Frontend order participants are authoritative command input at the Ordering
   boundary, while PR participants are only one possible source.
5. Backend evaluation/create still re-read authoritative product truth and PR
   attachment truth where applicable.
6. Product-typed `create -> init` is serial inside each family branch.
7. The accepted target will require updating older issue-231 product docs that
   currently require a backend-resolved Ordering read model.
