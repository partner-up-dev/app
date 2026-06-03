# Merchandising: Product Catalog

## Purpose

Product Catalog is the factual catalog behind Offer and Ordering. It should not
model PR categories and should not own campaign copy. Placement owns campaign
creative. Offer owns campaign policy. Product Catalog owns SPU facts, SKU
variants, sales policy, SPU pricing policy, and the
ordering/order/fulfillment contract for each SPU.

There is no existing Product Catalog implementation in the current codebase, so
issue 231 needs to introduce the first minimal catalog.

## Minimal Model

Do not implement a separate three-layer Product + SPU + SKU hierarchy for MVP.
Use two layers:

- `SPU` is the sellable service/product body and aggregate root. It owns what
  is sold, the stable product type, sales/service policy, SPU pricing policy,
  and presentation.
- `SKU` is a variant under one SPU. It owns variant facts and its base pricing
  model.

```ts
type SpuStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type SkuStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type ProductType = "RENTAL" | "RIDE_HAILING";

type PricingModel =
  | {
      type: "FIXED_TOTAL";
      amountFen: number;
    }
  | {
      type: "DYNAMIC_QUOTE";
      calculatorSpec: QuoteCalculationDslJson;
    };

type SpuSkuSelectionPolicy = {
  type: "EXACTLY_ONE";
};

type SpuQuantityPolicy =
  | { type: "FIXED"; quantity: number }
  | { type: "PER_PARTICIPANT" }
  | { type: "USER_SELECTED"; min: number; max: number };

type CommonPricingRuleDsl = {
  id: number;
  conditionRule: unknown; // validated JsonLogic-compatible JSON
  action:
    | { type: "RESET"; payload: { pricingModel: PricingModel } }
    | { type: "MINUS"; payload: { amountFen: number } }
    | { type: "RATIO"; payload: { ratioBps: number } };
  label: string;
  description: string;
  continue: boolean;
};

type SpuPricingRule = CommonPricingRuleDsl & {
  target: { level: "SKU" };
};

type SpuPricingPolicy = {
  rules: SpuPricingRule[];
};

type SpuSalesPolicy = {
  skuSelectionPolicy: SpuSkuSelectionPolicy;
  quantityPolicy: SpuQuantityPolicy;
};

type SpuServicePolicy =
  | {
      type: "RENTAL";
      serviceWindow: {
        weekdays: number[];
        startTime: string;
        endTime: string;
      };
      bookingLeadTimeMinutes: number;
      requiresContactPhone: boolean;
      requiresRealName: boolean;
      requiresNationalId: boolean;
    }
  | {
      type: "RIDE_HAILING";
    };

type SpuPresentation = {
  heroImageAssetIds: string[];
  detailImageAssetIds: string[];
  sellingPoints: string[];
  parameterGroups: ProductParameterGroup[];
  noticeBlocks: ProductNoticeBlock[];
};

type ProductParameterGroup = {
  title: string;
  items: { label: string; value: string }[];
};

type ProductNoticeBlock = {
  title: string;
  content: string;
};

type Spu = {
  id: number; // auto-increment integer
  version: number;
  status: SpuStatus;
  name: string;
  productType: ProductType;
  salesPolicy: SpuSalesPolicy;
  servicePolicy: SpuServicePolicy;
  pricingPolicy: SpuPricingPolicy;
  presentation: SpuPresentation;
  supplierId?: string | null;
  facts: RentalProductFacts | RideHailingProductFacts;
};

type Sku = {
  id: number; // auto-increment integer
  spuId: number;
  version: number;
  status: SkuStatus;
  name: string;
  sortOrder: number;
  pricingModel: PricingModel;
  baseCancellationPolicyId?: string | null;
  facts: RentalSkuFacts | RideHailingSkuFacts;
};

type SpuCommerceContract = {
  productType: ProductType;
  orderingKind: "RENTAL" | "RIDE_HAILING";
  orderFamily: "RentalOrder" | "RideHailingOrder";
  fulfillmentFamily: "RentalFulfillment" | "RideHailingFulfillment";
};

type QuoteCalculationDsl = {
  version: 1;
  currency: "CNY";
  variables?: QuoteVariableDef[];
  components: QuoteComponent[];
  postAdjustments?: QuotePostAdjustment[];
};

type QuoteVariableDef = {
  name: string;
  value: QuoteNumericExpr;
};

type QuoteComponent = {
  id: string;
  label: string;
  description?: string;
  when?: unknown; // validated condition DSL, can reuse json-logic style
  amount: QuoteNumericExpr;
};

type QuotePostAdjustment =
  | {
      id: string;
      type: "MIN_TOTAL";
      label: string;
      amountFen: number;
    }
  | {
      id: string;
      type: "MAX_TOTAL";
      label: string;
      amountFen: number;
    };

type QuoteNumericExpr =
  | { type: "CONST"; value: number }
  | { type: "INPUT"; path: string }
  | { type: "VAR"; name: string }
  | { type: "ADD"; args: QuoteNumericExpr[] }
  | { type: "SUB"; left: QuoteNumericExpr; right: QuoteNumericExpr }
  | { type: "MUL"; left: QuoteNumericExpr; right: QuoteNumericExpr }
  | {
      type: "DIV";
      left: QuoteNumericExpr;
      right: QuoteNumericExpr;
      rounding?: "NONE" | "CEIL" | "FLOOR" | "ROUND";
    }
  | {
      type: "ROUND";
      expr: QuoteNumericExpr;
      mode: "CEIL" | "FLOOR" | "ROUND";
      unit: number;
    }
  | { type: "MAX"; args: QuoteNumericExpr[] }
  | { type: "MIN"; args: QuoteNumericExpr[] }
  | {
      type: "IF";
      when: unknown; // validated condition DSL, can reuse json-logic style
      then: QuoteNumericExpr;
      else: QuoteNumericExpr;
    };

type QuoteCalculationDslJson = QuoteCalculationDsl;
```

`productType` is the canonical stored contract key. `orderingKind`,
`orderFamily`, and `fulfillmentFamily` should be derived from that product
type instead of being stored as independent mutable fields on SPU. This avoids
illegal combinations such as a Rental product pointing to a RideHailing order
family.

All active SKUs under one SPU must share the SPU's product type contract. SKU
does not carry a separate `productType`, `orderingKind`, `orderFamily`, or
`fulfillmentFamily`; those are derived from SPU. This prevents one SPU from
mixing Rental SKUs with Ride Hailing SKUs.

## Product Catalog Behavior

SPU is not just a record. It is the aggregate root that owns these decisions:

- whether a draft is complete enough to activate
- whether a SKU is compatible with the SPU's `productType`
- whether a user's SKU selection and quantity satisfy the sales policy
- whether an order draft satisfies service constraints such as lead time,
  service window, and real-name requirements
- how SPU-native pricing rules are applied after a SKU base price is resolved

SKU can stay closer to a data-focused entity. It mainly owns:

- variant identity and facts
- base pricing model
- base cancellation policy reference
- variant sellability status

Recommended aggregate methods:

- `spu.activate()`
- `spu.archive()`
- `spu.addSku(skuDraft)`
- `spu.assertSkuCompatible(sku)`
- `spu.validateSelection(selection)`
- `spu.validateServiceRequest(input)`
- `spu.getCommerceContract()`
- `spu.toSnapshotSeed()`
- `sku.activate()`
- `sku.archive()`
- `sku.setPricingModel(model)`
- `sku.bindCancellationPolicy(policyRef)`
- `sku.toVariantSnapshot()`

## Pricing Model And Dynamic Quote

`PricingModel` is the executable base-pricing model of one SKU. It answers
"where does this SKU's base price come from" instead of "what final price does
the user pay."

```ts
type PricingResolution =
  | {
      status: "RESOLVED";
      pricingModel: PricingModel;
      amountFen: number;
    }
  | {
      status: "QUOTE_REQUIRED";
      pricingModel: {
        type: "DYNAMIC_QUOTE";
        calculatorSpec: QuoteCalculationDslJson;
      };
    };
```

For a Rental SKU, the base pricing model can usually resolve immediately, for
example `FIXED_TOTAL = 6000` fen.

For a Ride Hailing SKU, the base pricing model can remain `DYNAMIC_QUOTE`.
That does not mean the SKU is incomplete. It means:

1. the SKU identifies the service variant, for example vehicle class;
2. the Ordering flow must collect route/time/passenger inputs;
3. the SKU pricing model carries a quote-calculation JSON DSL
   (`calculatorSpec`) as part of the base pricing model;
4. a calculator loads that DSL and evaluates it with pricing input from the
   current order draft;
5. the quote result turns `QUOTE_REQUIRED` into `RESOLVED`;
6. only after that base quote resolution may SPU pricing policy and Offer
   pricing policy continue to transform the price.

This keeps the SKU stable while still allowing the payable amount to remain
unknown until quote-time order data exists. In issue 231, the quote-resolution
mechanism should be modeled as local calculator logic rather than as a required
ride-hailing-provider API call.

The quote DSL should stay one level more abstract than ride-hailing-specific
fee primitives. Instead of hard-coding step kinds such as "distance fee" or
"time fee" into the schema, the DSL should provide:

- reusable numeric expressions
- explainable quote components
- optional total-floor / total-cap adjustments

Ride hailing can then express base fare, distance charge, duration charge,
night surcharge, or minimum total through that generic model, while future
dynamic-quote products can reuse the same calculator shape.

## Shared Pricing DSL And Explanation

SPU pricing policy and Offer pricing policy should share one rule DSL, but
their legal target set differs by owner:

- SPU pricing policy may target only `SKU`, because it must only affect the
  SPU's internal content.
- Offer pricing policy may target `SKU`, `SPU`, or `ORDER`, because an Offer is
  the commercial overlay owner.

`PriceExplanation` should be a shared read-model concept across pricing model
resolution and later pricing-policy phases so the UI can show a coherent price
breakdown:

```ts
type PriceExplanation = {
  phase: "SKU_BASE" | "SPU_POLICY" | "OFFER_POLICY";
  sourceType: "PRICING_MODEL" | "PRICING_RULE" | "QUOTE_COMPONENT";
  sourceId: string;
  label: string;
  description: string;
  deltaFen: number | null;
  resultAmountFen: number | null;
};
```

This explanation model is not limited to one layer. It can represent:

- the SKU base fixed price
- a quote result becoming available for a dynamic-quote SKU
- intermediate quote components emitted from the SKU base calculator DSL
- a product-native SPU rule
- an Offer discount or reset rule

That common shape should drive Offer Detail, Ordering price detail, and later
Order Detail breakdowns.

## Pricing Pipeline And Orchestration

Price calculation should be orchestrated as one explicit pricing pipeline owned
by the Trade / Order domain, not as a hidden onion call chain where Order calls
Offer, Offer calls SPU, SPU calls SKU, and each layer mutates the same running
price implicitly.

Recommended flow:

1. Trade/Ordering assembles `PricingInput` from the current order draft.
2. A Trade/Order pricing application service such as
   `DraftOrderPricingService` loads Offer, SPU, and SKU.
3. SKU base pricing resolves first:
   - `FIXED_TOTAL` resolves immediately;
   - `DYNAMIC_QUOTE` executes its embedded `calculatorSpec` against
     `PricingInput`.
4. SPU pricing policy applies next against SKU-level target data only.
5. Offer pricing policy applies last against SKU/SPU/ORDER target data.
6. The service returns the resolved amount plus ordered
   `PriceExplanation[]`.

The ownership stack is still SKU -> SPU -> Offer for pricing truth, but
runtime orchestration should remain explicit in one Trade/Order calculator
pipeline instead of being spread across nested entity-to-entity imperative
calls.

## Facts, Policy, And Presentation Boundary

`SkuFacts` can stay intentionally data-oriented. It is a fact shape, not a
behavior-heavy domain model.

The important boundary is:

- `SkuFacts`: what exact sellable variant this SKU is
- `SpuServicePolicy`: what makes ordering legal for the product
- `SpuPresentation`: what should be shown to humans on the product/detail page

Example:

- 6C zone code and participant count belong to `SkuFacts`
- 6C booking lead time and real-name requirement belong to
  `SpuServicePolicy`
- long images, selling points, and user notices belong to `SpuPresentation`

`SpuPresentation` is not part of the order snapshot by default. Orders should
freeze commercial facts and policy truth, not the entire product detail page.

The `name` and facts are catalog facts for Offer Detail and Ordering. They are
not campaign creative. Campaign creative such as "打车(8折)" belongs to
Placement.

## Current Products And SKUs

### 6C DIY Kitchen Rental

SPU:

- productType: `RENTAL`
- name: "6C DIY 厨房"
- salesPolicy:
  - skuSelectionPolicy: exactly one SKU
  - quantityPolicy: fixed quantity 1, because the selected SKU represents the
    whole reservation group
- servicePolicy:
  - available Monday through Sunday, 10:00 to 22:30
  - latest booking: at least 1 day before activity
  - real-name registration required
- factual attributes:
  - duration: 3 hours
  - no inventory/capacity management in this task

SKUs:

- one SKU per finite sellable reservation variant, such as:
  - 2 seats + baking zone
  - 3 seats + baking zone
  - 2 seats + chinese-cooking zone
  - 3 seats + chinese-cooking zone
  - and so on for the supported 2-5 participant matrix.
  - facts: zone code, participant count, durationMinutes = 180

This keeps SKU aligned with the smallest user-selectable sellable variant in
the current business. Do not introduce `pricingKind` for these finite fixed
combinations. Each SKU still owns a base `pricingModel`; for 6C this can be a
`FIXED_TOTAL` model such as 6000 fen for "2 seats + baking zone".

### Ride Hailing

SPU:

- productType: `RIDE_HAILING`
- name: "网约车"
- salesPolicy:
  - skuSelectionPolicy: exactly one vehicle SKU
  - quantityPolicy: fixed quantity 1
- factual attributes:
  - provider dispatch is out of scope for issue 231
  - quote/order foundation only

SKUs:

- one SKU per vehicle model/class that the product wants to expose, for example
  standard, comfort, or business.
- facts: vehicle class/model
- pricingModel: `DYNAMIC_QUOTE` resolved later from ride-hailing quote input

The current "selected vehicle model + route in Guangzhou + campaign window gets
20% off" rule is an Offer pricing rule, not a Product Catalog rule. The SKU's
base pricing model can remain dynamic quote; the Offer can apply a ratio rule
to the resolved quote or reset the target to another pricing model when a
campaign needs a different calculator.

## Pricing

SKU does not need a `pricingKind` enum in MVP, but SKU does own a structured
base `pricingModel`. SPU owns an ordered `pricingPolicy` for product-native
pricing behavior and may target only SKU-level data. Offer may add an ordered
pricing-rule array on top for campaign/commercial overlays with a broader legal
target set.

This split is intentional:

- SPU defines the sellable product body, SKU selection policy, quantity policy,
  type contract, service policy, presentation, and product-native pricing
  policy.
- SKU defines the variant facts and base pricing model.
- Offer overlay pricing policy defines ordered commercial price rules over the
  SPU/SKU base.
- Trade snapshots the resolved amount and user-facing price explanations when
  creating an order.

## Admin CRUD

Admin should support:

- SPU create/update/archive.
- SPU product type, sales policy, service policy, presentation, and pricing
  policy configuration.
- SKU create/update/archive under an SPU.
- SKU base pricing model configuration.
- Rental SKU facts for zone, duration, and participant count.
- Ride-hailing SKU facts for vehicle model/class.
- SKU base cancellation policy selection where applicable.

## Tests

Backend unit tests should prove:

- SKU belongs to one SPU.
- SPU determines the allowed commerce contract through `productType`.
- One SPU cannot contain mixed product-type SKUs.
- SPU validates SKU selection policy, quantity policy, service policy, and
  pricing policy.
- SKU has a base pricing model.
- Rental SKUs expose zone + participant-count facts.
- Ride-hailing SKUs expose vehicle model/class.
- SPU/SKU facts are distinct from Placement creative.
- `PriceExplanation` can represent SKU base pricing, SPU pricing rules, and
  later Offer overlays in one shared shape.
