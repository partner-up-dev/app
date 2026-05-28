# Merchandising: Placement And Offer

## Scope

This document narrows the internal technical design for Merchandising in issue
231. Merchandising owns Product Catalog, Offer, and Placement, but this page
focuses on Placement and Offer because they form the PR-page commercial entry.

In scope:

- Placement Instance selection from PR data / PR Context DTO.
- Button-type Placement creative rendered in the PR Page Button Placement slot.
- Offer detail as the independent user route.
- Admin CRUD for Offer and Button Placement Instance.
- Backend-authored placement matching, creative payload, and target resolution.
- SPU type selection of ordering, order, and fulfillment families.

Out of scope:

- Below-Utility-Actions placement card.
- User-facing TradeProposal route.
- Voucher Entitlement, GoodsOrder, and redemption flows.
- Real ride-hailing provider dispatch.

## Design Thesis

Placement answers: "Given PR data, which Placement Instance, if any, should be
shown, what marketing creative should be shown, and what does clicking it
target?"

Offer answers: "What sellable SPU set is being offered, what commercial
terms affect pricing, and which Ordering surface(s) should be assembled next?"

Placement owns marketing content because different Placement types need
different creative payloads. Button Placement and Banner Placement are different
rendering types and should not share a forced generic copy/media model.

Offer must not own marketing copy, media, PR visibility rules, or existing-order
target selection. Placement must not own order lifecycle or fulfillment.

## Product Type Contract

SPU is the source of the ordering/order/fulfillment contract, SKU selection
policy, quantity policy, and product-native pricing policy used by Offer. The
stored source key should be `productType`, with the rest derived from it:

```ts
type ProductType = "RENTAL" | "RIDE_HAILING";

type PricingModel =
  | { type: "FIXED_TOTAL"; amountFen: number }
  | { type: "DYNAMIC_QUOTE"; calculatorSpec: unknown };

type SpuSkuSelectionPolicy = {
  type: "EXACTLY_ONE";
};

type SpuQuantityPolicy =
  | { type: "FIXED"; quantity: number }
  | { type: "PER_PARTICIPANT" }
  | { type: "USER_SELECTED"; min: number; max: number };

type PricingPolicy = {
  rules: PricingRule[];
};

type SpuCommerceContract = {
  spuId: number;
  productType: ProductType;
  orderingKind: "RENTAL" | "RIDE_HAILING";
  orderFamily: "RentalOrder" | "RideHailingOrder";
  fulfillmentFamily: "RentalFulfillment" | "RideHailingFulfillment";
  skuSelectionPolicy: SpuSkuSelectionPolicy;
  quantityPolicy: SpuQuantityPolicy;
  pricingPolicy: PricingPolicy;
};
```

Offer can contain multiple SPUs, but all SPUs inside one Offer must share the
same `productType` and therefore the same ordering family. Each SPU's selected
SKU derives the concrete variant facts and base pricing model, while the SPU
derives the `orderingKind`, order family, fulfillment family, SKU selection
policy, and quantity policy. The frontend maps `orderingKind` to concrete Vue
ordering components. Backend contracts should not expose frontend component
names.

Pricing is affected by SKU, SPU, and Offer:

- SKU declares the variant facts and base pricing model.
- SPU declares product-native sales policy and pricing policy. SPU pricing
  rules may target only SKU-level data because SPU policy should only affect
  internal product content.
- Offer supplies an ordered pricing-rule array for campaign/commercial overlay.
- Offer pricing conditions are evaluated against target data, not PR Context.
  Target data is scoped to the rule target level: SKU, SPU, or Order. Examples
  include selected ride-hailing SKU, vehicle class, route being inside
  Guangzhou, and service/quote time within a campaign window such as June 2026
  to August 2026.
- Trade snapshots the resolved SKU + Offer terms when creating an order.

Cancellation policy is SKU base only for the current task. Offer cancellation
overlay is a future extension and should not be implemented in issue 231.

## Offer Model

Recommended source model:

```ts
type OfferStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

type Offer = {
  id: number;
  status: OfferStatus;
  productType: ProductType;
  spuIds: number[]; // ordered display/composition list
  pricingPolicy: OfferPricingPolicy;
  termsVersion: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

type CommonPricingRuleDsl = {
  id: number;
  conditionRule: OfferPricingConditionRuleJson;
  action: PricingRuleAction;
  label: string;
  description: string;
  continue: boolean;
};

type OfferPricingRule = CommonPricingRuleDsl & {
  target: PricingRuleTarget;
};

type OfferPricingPolicy = {
  rules: OfferPricingRule[];
};

type OfferPricingConditionRuleJson = unknown; // validated JsonLogic-compatible JSON

type PricingRuleTarget =
  | { level: "SKU"; skuId: number }
  | { level: "SPU"; spuId: number }
  | { level: "ORDER" };

type PricingRuleAction =
  | {
      type: "RESET";
      payload: {
        pricingModel: PricingModel;
      };
    }
  | {
      type: "MINUS";
      payload: {
        amountFen: number;
      };
    }
  | {
      type: "RATIO";
      payload: {
        ratioBps: number;
      };
    };

type PricingRuleTargetData = {
  // Data passed to json-logic-js for one target. Shape depends on target level.
  target: PricingRuleTarget;
  pricingModel: PricingModel;
  amountFen: number | null;
  sku?: {
    id: number;
    facts: unknown;
  };
  spu?: {
    id: number;
    facts: unknown;
    skuSelectionPolicy: SpuSkuSelectionPolicy;
    quantityPolicy: SpuQuantityPolicy;
  };
  order?: {
    selectedSkuIds?: number[];
    route?: unknown;
    serviceTime?: string | null;
    quoteTotalFen?: number | null;
  };
};
```

Offer does not model a separate line abstraction in MVP. Offer's SPU list
controls which sellable product bodies are included in the Offer. SKU selection
and quantity limits belong to SPU. This avoids duplicating catalog sales policy
in every Offer.

Offer must validate:

- every referenced SPU is active
- every referenced SPU belongs to the Offer's `productType`
- the resulting Offer still maps to one ordering family

Pricing rules target SKU, SPU, or Order data. The same SPU can appear in
multiple Offers, and each Offer can carry its own ordered commercial overlay
rules.

Pricing rule behavior:

1. Evaluate rules in the order they appear in `pricingPolicy.rules`.
2. A rule only evaluates against the data for its declared target.
3. `conditionRule` is evaluated with json-logic-js against that target data.
4. If the rule does not match, move to the next rule.
5. If it matches, apply `action` to the current pricing state for that target:
   - `RESET`: replace the target's current pricing model with
     `payload.pricingModel`.
   - `MINUS`: subtract positive `payload.amountFen` from the resolved amount.
   - `RATIO`: multiply by `payload.ratioBps / 10000` and round to integer fen.
6. Record `label` and `description` as user-facing price explanation.
7. If `continue` is true, continue evaluating later rules for the same target
   against the updated pricing state. If false, stop evaluating later rules for
   that same target.

All monetary values are stored as integer fen. No decimal currency values should
be persisted.

Pricing state semantics:

- Each SKU pricing target starts from the SKU base pricing model.
- SPU pricing policy is then applied as product-native pricing behavior.
- Offer pricing rules are applied after SPU pricing policy as
  campaign/commercial overlay.
- Order pricing target starts from the aggregate Order pricing model derived
  from selected SKUs.
- `amountFen` is the current resolved total amount for that pricing target, not
  a unit price. It may be `null` before a dynamic quote model is resolved.
- For a 6C SKU such as "2 seats + baking zone", the SKU base pricing model can
  be `FIXED_TOTAL` with `amountFen = 6000`. If UI needs "30 yuan/person", it
  derives that display from SKU facts such as participant count.
- For ride hailing, the SKU base pricing model can be `DYNAMIC_QUOTE`. An
  `ORDER` target can resolve the quote into `amountFen`, then apply a `RATIO`
  rule such as `8000` basis points for an 80% final price.
- A `RESET` rule replaces the current pricing model. For ride hailing this does
  not mean "overwrite quote with one amount"; it means "use another pricing
  model for this target".
- If a target's pricing model cannot resolve an amount with the available
  order data, that target has no payable customer price yet.

Offer deliberately has no title, subtitle, description, or media fields.
Marketing copy and media belong to Placement creative payloads. Product Catalog
may still own product-level media and parameters, but those are product facts,
not Offer marketing creative.

Offer detail should return:

- SPU list resolved to SPU/SKU projections
- one Offer `productType` / `orderingKind`
- resolved amount and pricing-rule explanations after applying SKU base pricing
  model, SPU pricing policy, and Offer overlay rules
- SKU base cancellation policy where applicable
- context echo, such as `prId`, when opened from a PR placement

Offer pricing conditions must not be modeled as PR matching rules. A PR may
provide default route/time values into Ordering, but Offer pricing evaluates
target data from the selected SKU/SPU/order context, not whether the PR itself
matched a Placement. Offer top-level availability is limited to status and
active window unless a later design adds an explicit Offer applicability rule.

Offer Detail should assemble one ordering root per Offer because an Offer is now
restricted to one `productType` / ordering family. The page may still show
multiple SPUs or SKU groups inside that one ordering flow. A single SPU must
never contain mixed SKU product types, and one Offer must never mix SPUs from
different product types.

## Placement Instance Model

This task implements only Button-type Placement Instance:

```ts
type PlacementType = "BUTTON" | "BANNER";
type PlacementSlotKey = "PR_UTILITY_ACTION_BUTTON";
type PlacementStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";

type PlacementInstance = {
  id: string;
  status: PlacementStatus;
  type: PlacementType;
  slotKey: PlacementSlotKey;
  offerId: number;
  creative: PlacementCreative;
  matchingRule: PlacementMatchingRuleJson;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

type PlacementCreative =
  | ButtonPlacementCreative
  | BannerPlacementCreative; // future type, not implemented in this task

type ButtonPlacementCreative = {
  type: "BUTTON";
  label: string;
  title?: string | null;
  iconKey?: string | null;
};
```

The frontend renders the returned projection. It must not infer matching rules,
or whether to route to Offer or Order.

`PlacementSlot` and `PlacementInstance` are distinct concepts:

- `slotKey` identifies the UI slot or placement container
- `PlacementInstance` is one configured merchandising record competing for that
  slot

Button Placement is a UI rendering form, not a separate placement selection
model. The selection flow is still: query suitable Placement Instances by PR
data, then render the selected instance only when its type is `BUTTON` and its
creative payload is valid for the PR Page Utility Actions Button Placement row.

## Placement Matching Rule

Placement Matching Rule is a persisted JSON rule evaluated by a rule engine.
Its only output is display or do-not-display for one Placement Instance and one
PR data input.

```ts
type PlacementMatchingRuleJson = unknown; // validated JsonLogic-compatible JSON

type PRContextData = {
  // Plain PR data for the rule engine. This is not a rich domain model and
  // carries no behavior, ecommerce purpose, or invariants.
  // It should use existing PR fields such as type, time, location,
  // route, minPartners, maxPartners, and active participant count.
};
```

Examples:

- 6C Rental Placement: PR type matches food/cooking text, active participants
  2-5, concrete
  time, one-day advance, service window 10:00-22:30.
- Ride Hailing Placement: PR type matches ride-hailing text; other PR types
  can match a ride-hailing placement when concrete time and route/meeting
  context exist.

Placement matching may show the button before PR is READY. Order creation is
still gated by the PR-domain order-attachment invariant.

PR Context means the PR data object passed into the rule engine. It is a DTO /
data alias, not a domain model. It should not add ecommerce-purpose fields such
as `marketingCategory`; Placement rules should be authored against existing PR
data.

The frontend should not construct or evaluate PR Context. PRPage asks the
Placement read endpoint for the currently matching Placement Instance and only
renders the returned projection.

Viewer authorization is not part of PR-context placement matching. For example,
"only the PR creator may create an order" belongs to Ordering/Trade validation.
Viewer-awareness is still required later when resolving an existing-order
target, so the system does not leak inaccessible orders.

PR active participant access is a precondition before placement matching for a
PR context. Active participants can see placements and PR-attached orders. Users
who are not active participants of that PR should receive no placement
projection for that PR. This access gate is not a Placement Matching Rule.

PR `type` is currently a free-text product-facing field, and that is the field
Placement matching should use for activity-type matching in this task. If a
future product decision introduces structured PR types, that should be a PR
model change, not a hidden ecommerce field inside PR Context.

## Rule Engine Recommendation

Use an existing JSON rule engine instead of implementing custom filter and rule
composition logic.

MVP decision: use `json-logic-js`.

Reasons:

- Rules are pure JSON and can be stored with Placement Instance records.
- Evaluation is direct: `apply(rule, prContextData)` returns a boolean-like
  value for display or do-not-display.
- It is small and sufficient for this task's synchronous PR-data matching.
- It keeps rule execution deterministic and avoids serialized JavaScript code.

`json-rules-engine` is not selected for MVP because its fact/event model is
heavier than the current display/hide need. Keep it as a future migration option
only if Placement Matching later requires async facts such as LBS/geocoding
lookup during rule evaluation.

The implementation should hide the concrete library behind a small
`PlacementRuleEngine` port so the persisted rule format and test fixtures are
controlled by Merchandising rather than by PRPage.

SPU pricing policy and Offer pricing policy may reuse the same rule DSL style,
but each owner must validate a different legal target set. The shared DSL does
not imply shared authority.

## Target Resolution

Placement read returns a backend-authored target:

```ts
type PlacementTarget =
  | { kind: "ORDER"; orderId: string; href: string }
  | {
      kind: "OFFER";
      offerId: number;
      context: { kind: "PR"; prId: number };
      href: string;
    };
```

Resolution order:

1. Check whether the viewer is an active participant of the PR context. If not,
   return no placement.
2. Load active Placement Instance candidates. Placement calculation is not
   surface-based.
3. Evaluate each candidate's matching rule through the rule engine with PR
   Context data.
4. Keep only the candidate whose type is renderable by the current UI slot
   (`BUTTON` for PR Page Utility Actions in this task).
5. Ask Trade whether an active order already exists for `(offerId, prId)`.
6. Return `ORDER` target when an existing order exists. PR active participants
   have access to PR-attached orders. Otherwise return `OFFER` target.
7. Return zero or one Placement projection for the Button Placement slot. If
   configuration creates multiple matches, the backend resolves that ambiguity
   deterministically before responding.

Merchandising may query Trade through a read port for target resolution, but it
must not own order state.

## Read And Route Contract

Canonical read API:

```http
GET /api/placements?context=pr&contextId=:prId&type=BUTTON
```

Response shape:

```ts
type PlacementSelectionProjection = {
  placement: PlacementProjection | null;
};

type PlacementProjection = {
  id: string;
  slotKey: "PR_UTILITY_ACTION_BUTTON";
  type: "BUTTON";
  creative: ButtonPlacementCreative;
  target: PlacementTarget;
};
```

`href` is backend-authored so the frontend does not need to reconstruct route
semantics from target internals.

PR detail may embed this projection for page-load composition later, but the
selection authority and tests should still exercise the Placement-owned
application service.

Initial frontend composition should use an independent placement query from
PRPage rather than embedding Placement inside `GET /api/pr/:id`. Empty,
loading, or failed placement queries should not break the PR page; they should
only omit the optional Button Placement surface.

The user flow is:

1. PR Page renders the Utility Actions section.
2. PRPage requests the matching `BUTTON` Placement for the current PR data.
3. If a matching Button Placement Instance exists, the Button Placement row is
   shown; otherwise it is hidden.
4. Clicking the button follows the backend-authored target to Offer Detail or
   Order Detail.
5. Offer Detail assembles Offer plus the needed Ordering surface(s) from the
   Offer SPU list.

User route:

- `/offers/:offerId?context=pr&contextId=:prId`
- `/orders/:orderId`

There is no required user-facing `/placements/:placementId` page for Button
Placement. Admin placement management can live under admin routes.

## Admin CRUD

Admin CRUD should support:

- SPU selection for an Offer.
- Offer status, product type, active window, SPU list, pricing policy, and
  ordered pricing rule array.
- Button Placement status, type, slot key, creative payload, target offer,
  active window,
  and matching rule JSON.
- Validation that active Button Placement points to an active Offer.
- Validation that an active Offer points to active SKU(s).
- Preview against a PR id for operators to debug why a placement appears or is
  hidden.

Backend admin implementation should use a dedicated Merchandising admin
controller or route module mounted under `/api/admin`, rather than extending the
existing anchor-event admin controller.

## Utility Actions Composition

Button Placement is rendered as its own row inside the existing PR Page Utility
Actions area. MVP returns at most one Button Placement for that slot. If
configuration accidentally produces multiple matching Button Placement
Instances, the backend must resolve that conflict before returning the
projection; the frontend still renders zero or one placement.

## Test Plan

Backend unit tests:

- Offer validation and active-window behavior.
- Offer validation for same-product-type SPU membership.
- Offer snapshot stability for order creation.
- Resolved pricing through SKU base pricing model, SPU pricing policy, and
  Offer pricing rules; cancellation behavior from SKU base terms.
- Placement matching rule behavior.
- Placement target resolution to existing Order over Offer.
- Placement slotKey / instance distinction and zero-or-one slot projection.
- Button Placement projection shape.
- Admin CRUD validation for Offer and Placement.

Frontend unit tests:

- PR Utility Actions renders backend-authored Button Placement.
- Empty placement list renders nothing.
- Button click routes to Offer or Order according to target kind.
- PRPage does not compute placement matching locally.

System scenario:

- Admin creates SKU, Offer, and Button Placement.
- Matching PR page shows the configured Button Placement inside Utility
  Actions.

## Decisions To Confirm

1. Button Placement should not require a user-facing `/placements/:placementId`
   route; placement is a projection and admin-managed object.
2. Placement target uniqueness should be `(offerId, prId)`.
3. Placement matching rules should be stored as typed JSON and evaluated by
   Merchandising, not hard-coded in PR or frontend.
4. PR active participants can see PR-attached orders; non-active participants
   receive no PR-context placement projection.
5. Initial PRPage integration should use a separate Placement query, with
   optional-failure behavior.
6. Offer applicability beyond `status` and active window currently comes from
   pricing-rule conditions plus ordering validation. Confirm whether Offer
   needs a separate top-level applicability rule.
